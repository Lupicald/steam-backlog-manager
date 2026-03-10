/**
 * Epic Games Store API — auth and library via OAuth authorization_code flow.
 *
 * Flow (mirrors Legendary / Heroic approach):
 *   1. User logs in via WebView at epicgames.com/id/login
 *   2. Login redirects to /id/api/redirect
 *   3. That page returns JSON with authorizationCode
 *   4. Supabase Edge Function exchanges it for OAuth tokens with the Epic secret
 *   5. Access token is used for library API calls; refresh token renews it
 */

import type { EpicGame, EpicTokenResponse } from '../types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase';

const EPIC_LIBRARY_URL = 'https://library-service.live.use1a.on.epicgames.com/library/api/public/items';
const EPIC_CATALOG_URL = 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace';
const EPIC_OAUTH_PROXY_URL = `${SUPABASE_URL}/functions/v1/epic-oauth`;

function pickEpicTitle(record: any): string {
  const metadata = record?.metadata ?? record?.catalogItem?.metadata ?? null;
  const customAttributes = metadata?.customAttributes ?? {};
  const candidates = [
    record?.title,
    record?.displayName,
    record?.productName,
    record?.catalogItem?.title,
    metadata?.title,
    metadata?.name,
    metadata?.productName,
    customAttributes?.title?.value,
    customAttributes?.DisplayName?.value,
    customAttributes?.productName?.value,
    record?.sandboxName,
    record?.appName,
    record?.catalogItemId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return 'Unknown';
}

function pickEpicImages(record: any): Array<{ type: string; url: string }> {
  const metadata = record?.metadata ?? record?.catalogItem?.metadata ?? null;
  const customAttributes = metadata?.customAttributes ?? {};
  const customImageCandidates = [
    customAttributes?.OfferImageWide?.value,
    customAttributes?.Thumbnail?.value,
    customAttributes?.DieselGameBox?.value,
    customAttributes?.DieselGameBoxTall?.value,
    customAttributes?.DieselStoreFrontWide?.value,
  ]
    .filter((value: any) => typeof value === 'string' && value.trim())
    .map((url: string, index: number) => ({ type: `custom_${index}`, url: url.trim() }));
  const keyImages = [
    ...(Array.isArray(record?.keyImages) ? record.keyImages : []),
    ...(Array.isArray(record?.catalogItem?.keyImages) ? record.catalogItem.keyImages : []),
    ...(Array.isArray(metadata?.keyImages) ? metadata.keyImages : []),
    ...customImageCandidates,
  ];

  return keyImages
    .filter((image: any) => image && typeof image.url === 'string' && image.url.trim())
    .map((image: any) => ({
      type: typeof image.type === 'string' && image.type ? image.type : 'unknown',
      url: image.url.trim(),
    }));
}

async function fetchEpicCatalogMetadata(
  accessToken: string,
  namespace: string,
  itemIds: string[]
): Promise<Record<string, any>> {
  const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (!namespace || uniqueIds.length === 0) return {};

  const params = new URLSearchParams({
    country: 'US',
    locale: 'en-US',
    includeDLCDetails: 'true',
    includeMainGameDetails: 'true',
  });
  for (const id of uniqueIds) {
    params.append('id', id);
  }

  const res = await fetch(`${EPIC_CATALOG_URL}/${encodeURIComponent(namespace)}/bulk/items?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    return {};
  }

  const json = await res.json().catch(() => ({}));
  return json && typeof json === 'object' ? json : {};
}

async function enrichEpicLibrary(accessToken: string, records: any[]): Promise<any[]> {
  const byNamespace = new Map<string, Set<string>>();

  for (const record of records) {
    const namespace = record?.namespace ?? '';
    const catalogItemId = record?.catalogItemId ?? record?.catalogItem?.id ?? '';
    if (!namespace || !catalogItemId) continue;
    if (!byNamespace.has(namespace)) byNamespace.set(namespace, new Set<string>());
    byNamespace.get(namespace)?.add(catalogItemId);
  }

  const catalogByKey = new Map<string, any>();

  for (const [namespace, idsSet] of byNamespace) {
    const ids = Array.from(idsSet);
    for (let i = 0; i < ids.length; i += 25) {
      const chunk = ids.slice(i, i + 25);
      const catalogItems = await fetchEpicCatalogMetadata(accessToken, namespace, chunk);
      for (const [catalogItemId, catalogItem] of Object.entries(catalogItems)) {
        catalogByKey.set(`${namespace}:${catalogItemId}`, catalogItem);
      }
    }
  }

  return records.map((record) => {
    const namespace = record?.namespace ?? '';
    const catalogItemId = record?.catalogItemId ?? record?.catalogItem?.id ?? '';
    const catalogItem = catalogByKey.get(`${namespace}:${catalogItemId}`);
    if (!catalogItem) return record;

    return {
      ...record,
      catalogItem: record?.catalogItem ?? catalogItem,
      metadata: record?.metadata ?? catalogItem?.metadata ?? null,
      keyImages:
        Array.isArray(record?.keyImages) && record.keyImages.length > 0
          ? record.keyImages
          : catalogItem?.keyImages ?? [],
      title: record?.title ?? catalogItem?.title,
      productName: record?.productName ?? catalogItem?.title,
    };
  });
}

/** URL to open in a browser or WebView for user login. */
export function getEpicLoginUrl(redirectUrl: string = 'https://www.epicgames.com/id/api/redirect'): string {
  const params = new URLSearchParams({
    redirectUrl,
  });
  return `https://www.epicgames.com/id/login?${params.toString()}`;
}

export function extractEpicCodeFromUrl(
  url: string
): { code: string; kind: 'authorization_code' | 'exchange_code' } | null {
  try {
    const parsed = new URL(url);
    const hashParams = parsed.hash ? new URLSearchParams(parsed.hash.replace(/^#/, '')) : null;

    const authorizationCode =
      parsed.searchParams.get('authorizationCode')
      ?? hashParams?.get('authorizationCode')
      ?? null;

    if (authorizationCode) {
      return { code: authorizationCode, kind: 'authorization_code' };
    }

    const exchangeCode =
      parsed.searchParams.get('exchangeCode')
      ?? parsed.searchParams.get('code')
      ?? hashParams?.get('exchangeCode')
      ?? hashParams?.get('code')
      ?? null;

    if (exchangeCode) {
      return { code: exchangeCode, kind: 'exchange_code' };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Tries multiple extraction strategies because Epic's redirect response varies
 * between plain JSON, query params, and inline content depending on platform.
 */
export const EPIC_EXCHANGE_JS = `
  (function() {
    var bridge = window.ReactNativeWebView;
    function post(payload) {
      if (bridge) bridge.postMessage(JSON.stringify(payload));
    }
    function getCookie(name) {
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (part.indexOf(name + '=') === 0) {
          return decodeURIComponent(part.slice(name.length + 1));
        }
      }
      return null;
    }
    function tryUrl(url) {
      try {
        var parsed = new URL(url);
        return parsed.searchParams.get('authorizationCode')
          || parsed.searchParams.get('code')
          || (parsed.hash ? new URLSearchParams(parsed.hash.replace(/^#/, '')).get('authorizationCode') : null)
          || (parsed.hash ? new URLSearchParams(parsed.hash.replace(/^#/, '')).get('code') : null);
      } catch (_) {
        return null;
      }
    }
    function tryJson(raw) {
      try {
        var parsed = JSON.parse(raw);
        if (!parsed) return null;
        if (parsed.authorizationCode) return { code: parsed.authorizationCode, kind: 'authorization_code' };
        if (parsed.exchangeCode) return { code: parsed.exchangeCode, kind: 'exchange_code' };
        if (parsed.code) return { code: parsed.code, kind: 'exchange_code' };
        return null;
      } catch (_) {
        return null;
      }
    }
    function tryRegex(raw) {
      var authorizationMatch = raw.match(/"authorizationCode"\\s*:\\s*"([^"]+)"/i)
        || raw.match(/authorizationCode=([^&"\\s<]+)/i)
        || raw.match(/[?&]authorizationCode=([^&"\\s<]+)/i);
      if (authorizationMatch) return { code: authorizationMatch[1], kind: 'authorization_code' };
      var exchangeMatch = raw.match(/"exchangeCode"\\s*:\\s*"([^"]+)"/i)
        || raw.match(/"code"\\s*:\\s*"([^"]+)"/i)
        || raw.match(/[?&]code=([^&"\\s<]+)/i);
      if (exchangeMatch) return { code: exchangeMatch[1], kind: 'exchange_code' };
      return null;
    }
    function trySid(raw) {
      var match = raw.match(/"sid"\\s*:\\s*"([^"]+)"/i)
        || raw.match(/[?&]sid=([^&"\\s<]+)/i);
      return match ? match[1] : null;
    }
    async function fetchExchangeCode(sid, xsrfToken) {
      var headers = xsrfToken ? { 'x-xsrf-token': xsrfToken } : {};
      if (sid) {
        await fetch('/id/api/set-sid?sid=' + encodeURIComponent(sid), {
          credentials: 'include',
          headers: headers
        }).catch(function() {});
      }

      var exchangeResponse = await fetch('/id/api/exchange', {
        credentials: 'include',
        headers: headers
      }).catch(function() { return null; });

      if (exchangeResponse && exchangeResponse.ok) {
        var exchangeData = await exchangeResponse.json().catch(function() { return null; });
        if (exchangeData && exchangeData.code) {
          return exchangeData.code;
        }
      }

      var generateResponse = await fetch('/id/api/exchange/generate', {
        method: 'POST',
        credentials: 'include',
        headers: headers
      }).catch(function() { return null; });

      if (generateResponse && generateResponse.ok) {
        var generateData = await generateResponse.json().catch(function() { return null; });
        if (generateData && generateData.code) {
          return generateData.code;
        }
      }

      return null;
    }
    try {
      Promise.resolve().then(async function() {
        var currentUrl = String(window.location && window.location.href || '');
        var fromUrl = tryUrl(currentUrl);
        if (fromUrl) {
          post({ type: 'epic_exchange_code', code: fromUrl, kind: 'exchange_code' });
          return;
        }

        var raw = document.body ? (document.body.innerText || document.body.textContent || '') : '';
        var fromJson = raw ? tryJson(raw) : null;
        if (fromJson) {
          post({ type: 'epic_exchange_code', code: fromJson.code, kind: fromJson.kind });
          return;
        }

        var html = document.documentElement ? (document.documentElement.outerHTML || '') : '';
        var fromHtml = tryRegex(raw + '\\n' + html);
        if (fromHtml && raw.indexOf('"sid"') === -1) {
          post({ type: 'epic_exchange_code', code: fromHtml.code, kind: fromHtml.kind });
          return;
        }

        var sid = trySid(raw + '\\n' + html);
        var xsrfToken = getCookie('XSRF-TOKEN');
        var fetchedCode = await fetchExchangeCode(sid, xsrfToken);
        if (fetchedCode) {
          post({ type: 'epic_exchange_code', code: fetchedCode });
          return;
        }

        throw new Error(
          'Epic redirect response did not include authorization code. URL='
          + currentUrl
          + ' SID=' + String(sid || '')
          + ' BODY=' + raw.slice(0, 300)
        );
      }).catch(function(err) {
        post({ type: 'epic_error', error: String(err) });
      });
    } catch (err) {
      post({ type: 'epic_error', error: String(err) });
    }
  })();
  true;
`;

/** Post-login URL patterns that trigger the exchange code injection. */
export const EPIC_SUCCESS_PATTERNS = [
  'www.epicgames.com/id/api/redirect',
  'epicgames.com/id/api/redirect',
];

/** Exchange an authorization_code for OAuth access + refresh tokens. */
export async function exchangeEpicCode(
  code: string,
  kind: 'authorization_code' | 'exchange_code' = 'exchange_code'
): Promise<EpicTokenResponse> {
  const res = await fetch(EPIC_OAUTH_PROXY_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'exchange',
      code,
      kind,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Epic token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Refresh an expired access token. */
export async function refreshEpicToken(refreshToken: string): Promise<EpicTokenResponse> {
  const res = await fetch(EPIC_OAUTH_PROXY_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'refresh',
      refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Epic token refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Fetch owned games using a valid access token. */
export async function fetchEpicLibrary(accessToken: string): Promise<EpicGame[]> {
  const allRecords: any[] = [];
  let cursor: string | null = null;
  let page = 0;

  do {
    const params = new URLSearchParams({
      includeMetadata: 'true',
      count: '1000',
    });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${EPIC_LIBRARY_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Epic library failed: ${res.status}`);

    const json = await res.json();
    const records = Array.isArray(json?.records) ? json.records : Array.isArray(json) ? json : [];
    allRecords.push(...records);
    cursor =
      json?.responseMetadata?.nextCursor
      ?? json?.metadata?.nextCursor
      ?? json?.nextCursor
      ?? null;
    page += 1;
    if (page > 50) break;
  } while (cursor);

  const enrichedRecords = await enrichEpicLibrary(accessToken, allRecords);

  return enrichedRecords.map((r: any) => ({
    appName: r.appName ?? r.sandboxName ?? '',
    catalogItemId: r.catalogItemId ?? r.catalogItem?.id ?? '',
    namespace: r.namespace ?? '',
    title: pickEpicTitle(r),
    productSlug: r.productSlug ?? r.catalogItem?.productSlug ?? undefined,
    developer: r.developerDisplayName ?? r.catalogItem?.developer ?? undefined,
    metadata: r.metadata ?? r.catalogItem?.metadata ?? null,
    keyImages: pickEpicImages(r),
  }));
}

/** Extract the best cover image from Epic's keyImages array. */
export function buildEpicCoverUrl(game: EpicGame): string {
  const preferred = ['DieselStoreFrontWide', 'OfferImageWide', 'DieselGameBoxTall', 'Thumbnail'];
  for (const type of preferred) {
    const img = game.keyImages.find((ki) => ki.type === type);
    if (img?.url) return img.url;
  }
  return game.keyImages[0]?.url?.trim() ?? '';
}
