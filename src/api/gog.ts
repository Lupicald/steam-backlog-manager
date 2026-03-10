/**
 * GOG library access via the embed site.
 *
 * The app imports the library from the authenticated WebView session instead of
 * relying on OAuth token exchange, which is currently rejected by GOG for the
 * public client credentials used here.
 */

import type { GOGProductsResponse } from '../types';

const GOG_CLIENT_ID = '46899977096215655';
const GOG_REDIRECT_URI = 'https://embed.gog.com/on_login_success?origin=client';
const GOG_EMBED_URL = 'https://embed.gog.com';

/** URL to load in WebView for user login. */
export function getGOGLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: GOG_CLIENT_ID,
    redirect_uri: GOG_REDIRECT_URI,
    response_type: 'code',
    layout: 'client2',
  });
  return `https://auth.gog.com/auth?${params.toString()}`;
}

/**
 * JS injected into the authenticated embed page.
 * Fetches all owned products using the current cookie-backed session and emits
 * progress page by page to React Native.
 */
export const GOG_LIBRARY_JS = `
  (function() {
    var bridge = window.ReactNativeWebView;
    function post(payload) {
      if (bridge) bridge.postMessage(JSON.stringify(payload));
    }
    async function fetchPage(page) {
      var response = await fetch('/account/getFilteredProducts?mediaType=1&page=' + page, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('GOG library fetch failed: ' + response.status);
      }
      return response.json();
    }
    (async function() {
      try {
        var first = await fetchPage(1);
        var firstProducts = first.products || [];
        var totalPages = first.totalPages || 1;
        var totalProducts = first.totalProducts || firstProducts.length;
        var processed = firstProducts.length;
        post({ type: 'gog_page', products: firstProducts, done: processed, total: totalProducts });
        for (var page = 2; page <= totalPages; page++) {
          var next = await fetchPage(page);
          var nextProducts = next.products || [];
          processed += nextProducts.length;
          post({
            type: 'gog_page',
            products: nextProducts,
            done: processed,
            total: totalProducts
          });
        }
        post({ type: 'gog_complete', total: totalProducts });
      } catch (err) {
        post({ type: 'gog_error', error: String(err) });
      }
    })();
  })();
  true;
`;

/** Build a cover image URL from GOG's image slug. */
export function gogCoverUrl(imageSlug: string): string {
  if (!imageSlug) return '';
  const slug = imageSlug.replace(/^\/\//, 'https://');
  return slug.startsWith('http') ? `${slug}_392.jpg` : `https:${slug}_392.jpg`;
}

/** Optional direct page fetch helper for environments with a valid session. */
export async function fetchOwnedGamesPage(page: number = 1): Promise<GOGProductsResponse> {
  const url = `${GOG_EMBED_URL}/account/getFilteredProducts?mediaType=1&page=${page}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`GOG library fetch failed: ${res.status}`);
  return res.json();
}
