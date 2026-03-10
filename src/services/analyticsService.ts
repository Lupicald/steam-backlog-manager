/**
 * analyticsService.ts
 *
 * Lightweight in-app analytics for BacklogFlow 1.0.
 * Stores cumulative event counts in SQLite. No external SDK required.
 * Safe to call from anywhere — errors are silenced so they never crash the app.
 */

import { getSetting, setSetting } from '../database/queries';

// ─── Event catalogue ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | 'ai_pick_used'
  | 'purchase_advisor_used'
  | 'paywall_opened'
  | 'subscription_started'
  | 'subscription_restored'
  | 'paywall_dismissed';

// ─── Core tracker ─────────────────────────────────────────────────────────────

/**
 * Track an event.
 * - Increments a persistent SQLite counter for the event.
 * - Logs to console in development.
 * - Failsafe: never throws, never blocks.
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number>,
): void {
  try {
    const key = `analytics_${event}`;
    const prev = parseInt(getSetting(key) || '0', 10);
    setSetting(key, String(prev + 1));

    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties ?? '');
    }
  } catch {
    // Never crash on analytics failure.
  }
}

/**
 * Read the total count for a given event (useful for debugging / diagnostics).
 */
export function getEventCount(event: AnalyticsEvent): number {
  try {
    return parseInt(getSetting(`analytics_${event}`) || '0', 10);
  } catch {
    return 0;
  }
}
