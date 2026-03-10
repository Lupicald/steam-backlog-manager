import { getAllGames, updateGamePrice, getSetting } from '../database/queries';
import { Game } from '../types';

export interface PriceProgress {
    done: number;
    total: number;
    currentTitle: string;
    enriched: number;
    notFound: number;
    failed: number;
}

export interface PriceBatchResult {
    enriched: number;
    notFound: number;
    failed: number;
    stoppedEarly: boolean;
    lastErrorMessage?: string;
}

type PriceLookupStatus = 'success' | 'not_found' | 'request_failed';

async function fetchGamePrice(
    steamAppId: number,
    currency: 'usd' | 'mxn'
): Promise<{ status: PriceLookupStatus; priceCents?: number; errorMessage?: string }> {
    try {
        const cc = currency === 'mxn' ? 'mx' : 'us';
        const response = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&filters=price_overview&cc=${cc}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'BacklogFlow-Mobile-App',
                },
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                return { status: 'request_failed', errorMessage: 'Rate limit hit (429)' };
            }
            return { status: 'request_failed', errorMessage: `HTTP ${response.status}` };
        }

        const data = await response.json();
        const appData = data[steamAppId.toString()];

        if (!appData || !appData.success) {
            return { status: 'not_found' }; // Game might be delisted or free
        }

        // Free games might not have price_overview
        const priceInfo = appData.data.price_overview;
        if (!priceInfo) {
            // Treat as free (0 cents)
            return { status: 'success', priceCents: 0 };
        }

        // initial is the non-discounted price in cents (usually)
        return { status: 'success', priceCents: priceInfo.initial };
    } catch (error) {
        return {
            status: 'request_failed',
            errorMessage: error instanceof Error ? error.message : 'Network error',
        };
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function batchEnrichPrices(
    onProgress?: (progress: PriceProgress) => void,
    signal?: AbortSignal
): Promise<PriceBatchResult> {
    const currency = (getSetting('currency') || 'usd') as 'usd' | 'mxn';

    // We only fetch prices for Steam games that don't have a price yet
    const games = getAllGames().filter(
        (g) => g.platform === 'steam' && g.price_cents === null && g.status !== 'abandoned'
    );

    let enriched = 0;
    let notFound = 0;
    let failed = 0;
    let lastErrorMessage: string | undefined;

    // We are heavily restricted by Steam's API (approx 200 requests/5 minutes usually)
    // We will process them in small batches 
    const BATCH_SIZE = 5;

    for (let i = 0; i < games.length; i += BATCH_SIZE) {
        if (signal?.aborted) {
            return { enriched, notFound, failed, stoppedEarly: true, lastErrorMessage };
        }

        const currentBatch = games.slice(i, i + BATCH_SIZE);

        // Process the batch in parallel
        const results = await Promise.all(
            currentBatch.map(async (currentGame) => {
                const res = await fetchGamePrice(currentGame.steam_app_id, currency);
                return { game: currentGame, result: res };
            })
        );

        for (const { game, result } of results) {
            if (result.status === 'success') {
                // Save the price locally (0 for free, actual cents for paid)
                updateGamePrice(game.id, result.priceCents ?? 0);
                enriched++;
            } else if (result.status === 'not_found') {
                // Mark as 0 so we don't keep retrying delisted/free games indefinitely
                updateGamePrice(game.id, 0);
                notFound++;
            } else {
                failed++;
                lastErrorMessage = result.errorMessage;
            }
        }

        onProgress?.({
            done: Math.min(i + BATCH_SIZE, games.length),
            total: games.length,
            currentTitle: currentBatch[currentBatch.length - 1].title,
            enriched,
            notFound,
            failed,
        });

        // Polite delays to prevent rate limiting IP ban
        if (results.some(r => r.result.status === 'request_failed')) {
            // If we hit a rate limit block, back off significantly
            await delay(10000);
        } else if (i + BATCH_SIZE < games.length) {
            // Normal delay between batches
            await delay(3500);
        }
    }

    return { enriched, notFound, failed, stoppedEarly: false, lastErrorMessage };
}
