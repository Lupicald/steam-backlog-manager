import { useState, useCallback } from 'react';
import {
  getAllGames,
  getGamesByStatus,
  getGameById,
  updateGame,
  deleteGame,
  searchGames as dbSearch,
  getBacklogStats,
} from '../database/queries';
import { Game, GameStatus, GamePriority, BacklogStats } from '../types';

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<BacklogStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const all = getAllGames();
      setGames(all);
      setStats(getBacklogStats());
    } finally {
      setLoading(false);
    }
  }, []);

  const getByStatus = useCallback((status: GameStatus): Game[] => {
    return getGamesByStatus(status);
  }, []);

  const getById = useCallback((id: number): Game | null => {
    return getGameById(id);
  }, []);

  const setStatus = useCallback(
    (id: number, status: GameStatus) => {
      updateGame(id, { status });
      refresh();
    },
    [refresh]
  );

  const setPriority = useCallback(
    (id: number, priority: GamePriority) => {
      updateGame(id, { priority });
      refresh();
    },
    [refresh]
  );

  const setProgress = useCallback(
    (id: number, progress: number) => {
      updateGame(id, { progress_percentage: Math.min(100, Math.max(0, progress)) });
      refresh();
    },
    [refresh]
  );

  const setNotes = useCallback(
    (id: number, notes: string) => {
      updateGame(id, { notes });
      refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    (id: number) => {
      deleteGame(id);
      refresh();
    },
    [refresh]
  );

  const search = useCallback((query: string): Game[] => {
    if (!query.trim()) return getAllGames();
    return dbSearch(query);
  }, []);

  return {
    games,
    stats,
    loading,
    refresh,
    getByStatus,
    getById,
    setStatus,
    setPriority,
    setProgress,
    setNotes,
    remove,
    search,
  };
}
