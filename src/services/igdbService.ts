/**
 * igdbService.ts
 *
 * Client-side service for IGDB game search.
 * All requests go through a Supabase Edge Function proxy to keep
 * Twitch/IGDB credentials off the device.
 *
 * Supabase Edge Function URL is read from src/config/supabase.ts.
 */

import { ManualGameSearchResult } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/igdb-search`;

export async function searchGamesByTitle(query: string): Promise<ManualGameSearchResult[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ query: query.trim(), limit: 10 }),
    });

    if (!response.ok) {
      console.warn('[igdbService] Edge function error:', response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (e) {
    console.warn('[igdbService] Network error:', e);
    return [];
  }
}

export async function fetchGameMetadata(igdbId: number): Promise<ManualGameSearchResult | null> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ igdbId }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.game ?? null;
  } catch (e) {
    console.warn('[igdbService] Network error:', e);
    return null;
  }
}
