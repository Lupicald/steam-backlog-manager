import { searchHLTB } from '../api/hltb';
import { updateGameHLTB, getAllGames, getGameById } from '../database/queries';

/**
 * Fetch HLTB data for a single game and persist it.
 */
export async function enrichGameWithHLTB(gameId: number): Promise<boolean> {
  const game = getGameById(gameId);
  if (!game) return false;

  const result = await searchHLTB(game.title);
  if (!result) return false;

  updateGameHLTB(
    gameId,
    result.comp_main || null,
    result.comp_plus || null,
    result.comp_100 || null
  );

  return true;
}

/**
 * Batch-enrich games that have no HLTB data yet.
 * Throttled to avoid hammering the HLTB endpoint.
 */
export async function batchEnrichHLTB(
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<{ enriched: number; failed: number }> {
  const games = getAllGames().filter(
    (g) => g.hltb_main_story === null && g.status !== 'abandoned'
  );

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < games.length; i++) {
    if (signal?.aborted) break;

    const ok = await enrichGameWithHLTB(games[i].id);
    if (ok) enriched++;
    else failed++;

    onProgress?.(i + 1, games.length);

    // Polite delay between requests
    if (i < games.length - 1) {
      await delay(500);
    }
  }

  return { enriched, failed };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
