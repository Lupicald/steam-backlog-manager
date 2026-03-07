import { HLTBResult } from '../types';

const HLTB_API_URL = 'https://howlongtobeat.com/api/search';
const HLTB_REFERER = 'https://howlongtobeat.com';

interface HLTBGameEntry {
  game_id: number;
  game_name: string;
  comp_main: number;   // seconds
  comp_plus: number;   // seconds
  comp_100: number;    // seconds
}

interface HLTBApiResponse {
  data: HLTBGameEntry[];
  color: string;
  title: string;
  category: string;
  count: number;
  pageCurrent: number;
  pageTotal: number;
  pageSize: number;
}

/**
 * Search HowLongToBeat for a game title.
 * Returns completion times in seconds (comp_main, comp_plus, comp_100).
 */
export async function searchHLTB(gameName: string): Promise<HLTBResult | null> {
  const payload = {
    searchType: 'games',
    searchTerms: gameName.split(' ').filter(Boolean),
    searchPage: 1,
    size: 5,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: null, max: null },
        gameplay: { perspective: '', flow: '', genre: '' },
        rangeYear: { min: '', max: '' },
        modifier: '',
      },
      users: { sortCategory: 'postcount' },
      filter: '',
      sort: 0,
      randomizer: 0,
    },
  };

  try {
    const res = await fetch(HLTB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: HLTB_REFERER,
        Origin: HLTB_REFERER,
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;

    const data: HLTBApiResponse = await res.json();
    if (!data.data || data.data.length === 0) return null;

    // Pick the best match (first result after fuzzy name comparison)
    const best = findBestMatch(gameName, data.data);
    if (!best) return null;

    return {
      game_id: best.game_id,
      game_name: best.game_name,
      comp_main: best.comp_main,
      comp_plus: best.comp_plus,
      comp_100: best.comp_100,
    };
  } catch {
    // HLTB is optional — fail silently
    return null;
  }
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestMatch(query: string, entries: HLTBGameEntry[]): HLTBGameEntry | null {
  const q = normalise(query);

  // Exact match first
  for (const e of entries) {
    if (normalise(e.game_name) === q) return e;
  }

  // Starts-with match
  for (const e of entries) {
    if (normalise(e.game_name).startsWith(q)) return e;
  }

  // Contains match
  for (const e of entries) {
    if (normalise(e.game_name).includes(q.split(' ')[0])) return e;
  }

  // Fall back to first result
  return entries[0] ?? null;
}
