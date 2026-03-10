import { useState, useCallback, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { runSync, SyncStatus, SyncResult } from '../services/syncService';
import { SYNC_INTERVAL_MS } from '../config/supabase';

export function useSync(isAuthenticated: boolean) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(true);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Network detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return () => unsub();
  }, []);

  // ── Sync execution ─────────────────────────────────────────────────────────
  const sync = useCallback(
    async (force = false) => {
      if (!isAuthenticated || !isOnline) {
        setStatus('offline');
        return;
      }
      if (status === 'syncing') return;

      setStatus('syncing');
      try {
        const result = await runSync({ force });
        setLastResult(result);
        setStatus(result.errors.length > 0 ? 'error' : 'idle');
      } catch {
        setStatus('error');
      }
    },
    [isAuthenticated, isOnline, status]
  );

  // ── Sync on login and when coming back online ──────────────────────────────
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      sync(true);
    }
  }, [isAuthenticated, isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic background sync (max every 5 min) ────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    intervalRef.current = setInterval(() => {
      if (isOnline) sync(false);
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, isOnline, sync]);

  return {
    status,
    isOnline,
    lastResult,
    triggerSync: () => sync(true),
  };
}
