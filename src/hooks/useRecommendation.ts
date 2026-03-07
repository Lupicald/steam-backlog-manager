import { useState, useCallback } from 'react';
import { Recommendation } from '../types';
import { getRecommendations, rememberRecommendationShown } from '../services/recommendationService';

export function useRecommendation(): {
  recommendation: Recommendation | null;
  refresh: () => void;
  reroll: (hours?: number) => void;
} {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const refresh = useCallback(() => {
    const results = getRecommendations({ limit: 1 });
    if (results[0]) {
      rememberRecommendationShown(results[0].game.id);
    }
    setRecommendation(results[0] ?? null);
  }, []);

  const reroll = useCallback((hours?: number) => {
    setRecommendation((current) => {
      const results = getRecommendations({
        availableTimeHours: hours,
        limit: 3,
        excludeGameIds: current ? [current.game.id] : [],
      });

      if (results.length > 0) {
        rememberRecommendationShown(results[0].game.id);
        return results[0];
      }

      const fallback = getRecommendations({
        availableTimeHours: hours,
        limit: 1,
      });

      if (fallback[0]) {
        rememberRecommendationShown(fallback[0].game.id);
      }

      return fallback[0] ?? null;
    });
  }, []);

  return { recommendation, refresh, reroll };
}
