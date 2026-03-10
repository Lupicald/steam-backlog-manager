const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type EpicAction = 'exchange' | 'refresh';
type EpicKind = 'authorization_code' | 'exchange_code';

interface EpicProxyRequest {
  action?: EpicAction;
  code?: string;
  kind?: EpicKind;
  refreshToken?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const clientId = Deno.env.get('EPIC_CLIENT_ID');
  const clientSecret = Deno.env.get('EPIC_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return json({ error: 'Epic OAuth proxy is not configured' }, 500);
  }

  let payload: EpicProxyRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  let body: URLSearchParams;
  if (payload.action === 'exchange' && payload.code) {
    body = new URLSearchParams(
      payload.kind === 'authorization_code'
        ? {
            grant_type: 'authorization_code',
            code: payload.code,
            token_type: 'eg1',
          }
        : {
            grant_type: 'exchange_code',
            exchange_code: payload.code,
            token_type: 'eg1',
          }
    );
  } else if (payload.action === 'refresh' && payload.refreshToken) {
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: payload.refreshToken,
    });
  } else {
    return json({ error: 'Missing or invalid Epic OAuth payload' }, 400);
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const epicResponse = await fetch(
    'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  const raw = await epicResponse.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { raw };
  }

  if (!epicResponse.ok) {
    return json(
      {
        error: 'Epic OAuth request failed',
        status: epicResponse.status,
        details: parsed,
      },
      epicResponse.status
    );
  }

  return json(parsed, 200);
});
