import { fetchOwnedGames, parseSteamInput, resolveVanityUrl } from '../api/steam';
import { upsertGame } from '../database/queries';
import { getSetting } from '../database/queries';
import { steamCoverUrl } from '../utils/formatters';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Import (or refresh) the Steam library for the configured SteamID.
 * Upserts games into the local SQLite database.
 */
export async function importSteamLibrary(
  steamInput: string,
  apiKey: string,
  onProgress?: (imported: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  // 1. Resolve Steam ID
  let steamId: string;
  try {
    const parsed = parseSteamInput(steamInput);
    if (parsed.type === 'vanity') {
      if (!apiKey) throw new Error('An API key is required to resolve vanity URLs.');
      steamId = await resolveVanityUrl(parsed.value, apiKey);
    } else {
      steamId = parsed.value;
    }
  } catch (err: unknown) {
    result.errors.push(err instanceof Error ? err.message : 'Failed to resolve Steam ID.');
    return result;
  }

  // 2. Fetch games list
  let games: Awaited<ReturnType<typeof fetchOwnedGames>>;
  try {
    games = await fetchOwnedGames(steamId, apiKey);
  } catch (err: unknown) {
    result.errors.push(
      err instanceof Error ? err.message : 'Failed to fetch games from Steam API.'
    );
    return result;
  }

  // 3. Upsert each game into the database
  const total = games.length;
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    try {
      const lastPlayed = g.rtime_last_played
        ? new Date(g.rtime_last_played * 1000).toISOString()
        : null;

      upsertGame(
        g.appid,
        g.name,
        steamCoverUrl(g.appid),
        g.playtime_forever,
        lastPlayed
      );
      result.imported++;
    } catch {
      result.skipped++;
    }
    onProgress?.(i + 1, total);
  }

  return result;
}
