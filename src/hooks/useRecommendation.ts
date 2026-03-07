import { useState, useCallback } from 'react';
import { Recommendation } from '../types';
import { getTopRecommendations } from '../services/recommendationService';



export function useRecommendation(): {
  recommendation: Recommendation | null;
  refresh: () => void;
  reroll: (hours?: number) => void;
} {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const refresh = useCallback(() => {
    const results = getTopRecommendations();
    setRecommendation(results[0] ?? null);
  }, []);

  const reroll = useCallback((hours?: number) => {
    const results = getTopRecommendations(hours);
    setRecommendation((current) => {
      // Try to avoid re-selecting the same game if there are more options
      const filtered = results.filter(r => r.game.id !== current?.game.id);
      return filtered[0] ?? results[0] ?? null;
    });
  }, []);

  return { recommendation, refresh, reroll };
}
