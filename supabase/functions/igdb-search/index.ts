/**
 * Supabase Edge Function: igdb-search
 *
 * Proxies IGDB/Twitch API requests to keep credentials server-side.
 *
 * Environment variables required (set in Supabase dashboard):
 *   TWITCH_CLIENT_ID     - Your Twitch application client ID
 *   TWITCH_CLIENT_SECRET - Your Twitch application client secret
 *
 * Deploy with:
 *   supabase functions deploy igdb-search
 */

// using native Deno.serve now

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IGDBGame {
  id: number;
  name: string;
  cover?: { url: string };
  first_release_date?: number;
  summary?: string;
  platforms?: Array<{ name: string }>;
  involved_companies?: Array<{ company: { name: string }; developer: boolean }>;
}

async function getTwitchToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const data = await res.json();
  return data.access_token;
}

function normalizeGame(game: IGDBGame) {
  const coverUrl = game.cover?.url
    ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
    : null;

  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;

  const platforms = game.platforms?.map((p) => p.name) ?? [];
  const developer =
    game.involved_companies?.find((ic) => ic.developer)?.company?.name ?? null;

  return {
    igdbId: game.id,
    title: game.name,
    coverUrl,
    releaseYear,
    summary: game.summary ?? null,
    platforms,
    developer,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const clientId = Deno.env.get('TWITCH_CLIENT_ID');
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: 'IGDB credentials not configured' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  let body: { query?: string; igdbId?: number; limit?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const token = await getTwitchToken(clientId, clientSecret);
    const igdbHeaders = {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    };

    // Single game lookup by ID
    if (body.igdbId) {
      const igdbRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: igdbHeaders,
        body: `fields name,cover.url,first_release_date,summary,platforms.name,involved_companies.company.name,involved_companies.developer; where id = ${body.igdbId};`,
      });
      const games: IGDBGame[] = await igdbRes.json();
      const game = games[0] ? normalizeGame(games[0]) : null;
      return new Response(
        JSON.stringify({ game }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Search by title
    const limit = Math.min(body.limit ?? 8, 20);
    const searchQuery = (body.query ?? '').replace(/"/g, '');
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: igdbHeaders,
      body: `search "${searchQuery}"; fields name,cover.url,first_release_date,summary,platforms.name,involved_companies.company.name,involved_companies.developer; limit ${limit};`,
    });
    const games: IGDBGame[] = await igdbRes.json();
    const results = games.map(normalizeGame);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
