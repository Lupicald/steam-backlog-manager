import { useEffect, useState } from 'react';
import { initializeDatabase } from '../database/schema';

let initialized = false;

/**
 * Initializes the SQLite database once at app startup.
 * Returns { ready: true } after initialization completes.
 * Uses useState so callers re-render when ready changes.
 */
export function useDatabase(): { ready: boolean } {
  const [ready, setReady] = useState(initialized);

  useEffect(() => {
    if (initialized) {
      setReady(true);
      return;
    }
    try {
      initializeDatabase();
      initialized = true;
    } catch (err) {
      console.error('[DB] Initialization failed:', err);
    } finally {
      // Always mark ready so the app doesn't stay on splash
      setReady(true);
    }
  }, []);

  return { ready };
}
