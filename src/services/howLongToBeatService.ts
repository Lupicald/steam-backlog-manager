import { searchHLTB } from '../api/hltb';
import { updateGameHLTB, getAllGames, getGameById } from '../database/queries';
import { HLTBLookupStatus } from '../types';

export interface HLTBProgress {
  done: number;
  total: number;
  currentTitle: string;
  enriched: number;
  notFound: number;
  failed: number;
}

export interface HLTBBatchResult {
  enriched: number;
  notFound: number;
  failed: number;
  stoppedEarly: boolean;
  lastErrorMessage?: string;
}

/**
 * Fetch HLTB data for a single game and persist it.
 */
export async function enrichGameWithHLTB(gameId: number): Promise<{
  status: HLTBLookupStatus;
  errorMessage?: string;
}> {
  const game = getGameById(gameId);
  if (!game) {
    return { status: 'not_found' };
  }

  const lookup = await searchHLTB(game.title);
  if (lookup.status !== 'success' || !lookup.result) {
    return { status: lookup.status, errorMessage: lookup.errorMessage };
  }

  updateGameHLTB(
    gameId,
    lookup.result.comp_main || null,
    lookup.result.comp_plus || null,
    lookup.result.comp_100 || null
  );

  return { status: 'success' };
}

/**
 * Batch-enrich games that have no HLTB data yet.
 * Throttled to avoid hammering the HLTB endpoint.
 */
export async function batchEnrichHLTB(
  onProgress?: (progress: HLTBProgress) => void,
  signal?: AbortSignal
): Promise<HLTBBatchResult> {
  const games = getAllGames().filter(
    (g) => g.hltb_main_story === null && g.status !== 'abandoned'
  );

  let enriched = 0;
  let notFound = 0;
  let failed = 0;
  let lastErrorMessage: string | undefined;

  for (let i = 0; i < games.length; i++) {
    if (signal?.aborted) {
      return { enriched, notFound, failed, stoppedEarly: true, lastErrorMessage };
    }

    const currentGame = games[i];
    const result = await enrichGameWithHLTB(currentGame.id);
    if (result.status === 'success') {
      enriched++;
    } else if (result.status === 'not_found') {
      notFound++;
    } else {
      failed++;
      lastErrorMessage = result.errorMessage;
    }

    onProgress?.({
      done: i + 1,
      total: games.length,
      currentTitle: currentGame.title,
      enriched,
      notFound,
      failed,
    });

    if (result.status === 'request_failed') {
      await delay(2000);
    }

    // Polite delay between requests
    if (i < games.length - 1) {
      await delay(500);
    }
  }

  return { enriched, notFound, failed, stoppedEarly: false, lastErrorMessage };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
