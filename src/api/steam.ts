import { SteamApiResponse, SteamGame } from '../types';
import { steamCoverUrl } from '../utils/formatters';

const STEAM_API_BASE = 'https://api.steampowered.com';

/**
 * Extract a 64-bit SteamID from either a raw ID or a profile URL.
 * Supports: "76561198xxxxxxxxx" and "https://steamcommunity.com/id/vanityname"
 */
export function parseSteamInput(input: string): { type: 'id' | 'vanity'; value: string } {
  const trimmed = input.trim();

  // Numeric 64-bit Steam ID
  if (/^\d{17}$/.test(trimmed)) {
    return { type: 'id', value: trimmed };
  }

  // Profile URL with /profiles/ID
  const profileMatch = trimmed.match(/\/profiles\/(\d{17})/);
  if (profileMatch) {
    return { type: 'id', value: profileMatch[1] };
  }

  // Profile URL with /id/vanity
  const vanityMatch = trimmed.match(/\/id\/([a-zA-Z0-9_-]+)/);
  if (vanityMatch) {
    return { type: 'vanity', value: vanityMatch[1] };
  }

  // Plain vanity name (no slashes, not a 17-digit number)
  return { type: 'vanity', value: trimmed };
}

/**
 * Resolve a Steam vanity URL to a 64-bit SteamID.
 * Requires a Steam API key.
 */
export async function resolveVanityUrl(
  vanityName: string,
  apiKey: string
): Promise<string> {
  const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(vanityName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();
  if (data.response?.success !== 1) {
    throw new Error('Could not resolve Steam vanity URL. Check the username.');
  }
  return data.response.steamid as string;
}

/**
 * Fetch owned games for a given SteamID.
 * include_played_free_games=1 to include F2P games.
 */
export async function fetchOwnedGames(
  steamId: string,
  apiKey: string
): Promise<SteamGame[]> {
  const url =
    `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/` +
    `?key=${apiKey}` +
    `&steamid=${steamId}` +
    `&include_appinfo=1` +
    `&include_played_free_games=1` +
    `&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data: SteamApiResponse = await res.json();

  if (!data.response?.games) {
    throw new Error(
      'No games returned. Make sure your profile and game details are set to Public.'
    );
  }

  return data.response.games.map((g) => ({
    ...g,
    // Normalise cover URL eagerly
    img_icon_url: steamCoverUrl(g.appid),
  }));
}
