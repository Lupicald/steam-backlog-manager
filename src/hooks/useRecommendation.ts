import { useState, useCallback } from 'react';
import { getCandidatesForRecommendation } from '../database/queries';
import { Game, Recommendation } from '../types';
import { priorityWeight } from '../utils/formatters';

function scoreGame(game: Game): number {
  let score = 0;

  // Priority weight (high = +30, medium = +20, low = +10)
  score += priorityWeight(game.priority) * 10;

  // Prefer shorter games (main story < 10h)
  if (game.hltb_main_story) {
    const hours = game.hltb_main_story / 3600;
    if (hours <= 5) score += 20;
    else if (hours <= 10) score += 15;
    else if (hours <= 20) score += 10;
    else score += 2;
  }

  // Bump games that are already in progress
  if (game.status === 'playing') score += 25;
  if (game.status === 'paused') score += 15;

  // Bump games that haven't been touched recently
  if (game.last_played === null) score += 10;

  // Progress: if already started, nudge toward completion
  if (game.progress_percentage > 0 && game.progress_percentage < 50) score += 8;

  return score;
}

function buildReason(game: Game): string {
  if (game.status === 'playing') return 'You are currently playing this';
  if (game.status === 'paused') return "You've started this — time to finish it";
  if (game.priority === 'high') return 'Marked as high priority';
  if (game.priority === 'medium' && game.hltb_main_story && game.hltb_main_story / 3600 <= 12)
    return 'Balanced pick with a reasonable finish time';
  if (game.hltb_main_story && game.hltb_main_story / 3600 <= 5)
    return 'Short game — great for clearing your backlog';
  if (!game.last_played) return "You've never played this";
  return 'Good match based on your backlog';
}

function buildRecommendations(candidates: Game[]): Recommendation[] {
  return candidates
    .map((game) => ({
      game,
      score: scoreGame(game),
      reason: buildReason(game),
    }))
    .sort((a, b) => b.score - a.score);
}

function pickRecommendation(
  recommendations: Recommendation[],
  excludeGameId?: number
): Recommendation | null {
  const available = excludeGameId
    ? recommendations.filter((item) => item.game.id !== excludeGameId)
    : recommendations;

  if (available.length === 0) {
    return null;
  }

  const topPool = available.slice(0, Math.min(12, available.length));
  const randomIndex = Math.floor(Math.random() * topPool.length);
  return topPool[randomIndex] ?? available[0] ?? null;
}

export function useRecommendation(): {
  recommendation: Recommendation | null;
  refresh: () => void;
  reroll: () => void;
} {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const refresh = useCallback(() => {
    const candidates = getCandidatesForRecommendation();
    if (candidates.length === 0) {
      setRecommendation(null);
      return;
    }
    const scored = buildRecommendations(candidates);
    setRecommendation(pickRecommendation(scored));
  }, []);

  const reroll = useCallback(() => {
    const candidates = getCandidatesForRecommendation();
    if (candidates.length === 0) {
      setRecommendation(null);
      return;
    }
    const scored = buildRecommendations(candidates);
    setRecommendation((current) => pickRecommendation(scored, current?.game.id));
  }, []);

  return { recommendation, refresh, reroll };
}
