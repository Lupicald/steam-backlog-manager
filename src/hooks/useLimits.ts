/**
 * useLimits.ts
 *
 * Tracks free-tier usage limits, stored in SQLite so they survive restarts.
 *
 *  AI Picker       — 2 picks per calendar day  (resets at midnight)
 *  Purchase Advisor — 1 check per calendar month (resets each month)
 *
 * Premium users bypass all limits entirely.
 */

import { getSetting, setSetting } from '../database/queries';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AI_DAILY_LIMIT = 2;
export const PA_MONTHLY_LIMIT = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function thisMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── AI Picker limits ─────────────────────────────────────────────────────────

const AI_DATE_KEY = 'limit_ai_date';
const AI_COUNT_KEY = 'limit_ai_count';

/** How many AI picks the user has consumed today. Resets if date changed. */
export function getDailyAiPicksUsed(): number {
  const stored = getSetting(AI_DATE_KEY);
  const today = todayKey();
  if (stored !== today) return 0;
  return parseInt(getSetting(AI_COUNT_KEY) || '0', 10);
}

/** Increment the daily AI pick counter. Call after a successful pick is shown. */
export function incrementDailyAiPicks(): void {
  const today = todayKey();
  const stored = getSetting(AI_DATE_KEY);
  const prev = stored === today ? parseInt(getSetting(AI_COUNT_KEY) || '0', 10) : 0;
  setSetting(AI_DATE_KEY, today);
  setSetting(AI_COUNT_KEY, String(prev + 1));
}

/** True if the free user has exhausted today's AI picks. */
export function isDailyAiLimitReached(): boolean {
  return getDailyAiPicksUsed() >= AI_DAILY_LIMIT;
}

// ─── Purchase Advisor limits ──────────────────────────────────────────────────

const PA_MONTH_KEY = 'limit_pa_month';
const PA_COUNT_KEY = 'limit_pa_count';

/** How many PA checks the user has done this calendar month. */
export function getMonthlyPaUsed(): number {
  const stored = getSetting(PA_MONTH_KEY);
  const current = thisMonthKey();
  if (stored !== current) return 0;
  return parseInt(getSetting(PA_COUNT_KEY) || '0', 10);
}

/** Increment the monthly PA counter. Call after an analysis is shown. */
export function incrementMonthlyPa(): void {
  const current = thisMonthKey();
  const stored = getSetting(PA_MONTH_KEY);
  const prev = stored === current ? parseInt(getSetting(PA_COUNT_KEY) || '0', 10) : 0;
  setSetting(PA_MONTH_KEY, current);
  setSetting(PA_COUNT_KEY, String(prev + 1));
}

/** True if the free user has used their one PA check this month. */
export function isMonthlyPaLimitReached(): boolean {
  return getMonthlyPaUsed() >= PA_MONTHLY_LIMIT;
}
