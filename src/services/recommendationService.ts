import {
  getAllGames,
  getBacklogStats,
  getCandidatesForRecommendation,
  getSetting,
  setSetting,
} from '../database/queries';
import {
  BacklogMission,
  CompletionCelebration,
  DailyPick,
  Game,
  Recommendation,
  RecommendationGoal,
  RecommendationMood,
  SmartCollection,
  TasteProfile,
  VersusPair,
  WeeklyPlan,
} from '../types';

type RecommendationMode = 'balanced' | 'focus';

interface RecommendationRequest {
  availableTimeHours?: number;
  mode?: RecommendationMode;
  mood?: RecommendationMood;
  goal?: RecommendationGoal;
  limit?: number;
  excludeGameIds?: number[];
  avoidRecent?: boolean;
}

interface GameMetrics {
  totalMinutes: number | null;
  remainingMinutes: number | null;
  progressRatio: number | null;
  daysSinceLastPlayed: number | null;
  daysInBacklog: number;
  sessionsToFinish: number | null;
}

interface AiPreferences {
  advance: number;
  short: number;
  chill: number;
  resume: number;
  finish: number;
}

interface DailyPickState {
  dateKey: string;
  gameId: number;
  streak: number;
  lastPlayedDateKey?: string;
}

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_SESSION_HOURS = 2;
const RECENT_HISTORY_LIMIT = 12;
const RECENT_HISTORY_KEY = 'ai_picker_recent_ids';
const PREFERENCES_KEY = 'ai_picker_preferences';
const DAILY_PICK_KEY = 'ai_daily_pick_state';
const COMPLETION_KEY = 'ai_completion_celebration';

const DEFAULT_PREFERENCES: AiPreferences = {
  advance: 0,
  short: 0,
  chill: 0,
  resume: 0,
  finish: 0,
};

export function getTopRecommendations(availableTimeHours?: number): Recommendation[] {
  return getRecommendations({ availableTimeHours, limit: 3 });
}

export function getFocusModeRecommendations(): Recommendation[] {
  return getRecommendations({ mode: 'focus', limit: 3 });
}

export function getRecommendations(request: RecommendationRequest = {}): Recommendation[] {
  return buildRecommendations(getCandidatesForRecommendation(), request);
}

export function rememberRecommendationShown(gameIds: number[] | number): void {
  const ids = Array.isArray(gameIds) ? gameIds : [gameIds];
  const merged = [...ids, ...getRecentRecommendationIds()]
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, RECENT_HISTORY_LIMIT);

  writeJsonSetting(RECENT_HISTORY_KEY, merged);
}

export function getDailyPick(): DailyPick | null {
  const todayKey = getDateKey();
  const stored = readJsonSetting<DailyPickState | null>(DAILY_PICK_KEY, null);
  const allRecs = getRecommendations({ limit: 12, avoidRecent: false });

  if (allRecs.length === 0) {
    return null;
  }

  if (stored?.dateKey === todayKey) {
    const current = allRecs.find((item) => item.game.id === stored.gameId);
    if (current) {
      return {
        recommendation: current,
        streak: stored.streak,
        subtitle: stored.streak > 0 ? `${stored.streak} day daily pick streak` : 'Fresh daily pick',
      };
    }
  }

  const previousDate = stored?.dateKey;
  const shouldCarryStreak =
    previousDate &&
    stored?.lastPlayedDateKey === previousDate &&
    getPreviousDateKey(todayKey) === previousDate;

  const nextState: DailyPickState = {
    dateKey: todayKey,
    gameId: allRecs[0].game.id,
    streak: shouldCarryStreak ? stored!.streak : 0,
  };

  writeJsonSetting(DAILY_PICK_KEY, nextState);
  rememberRecommendationShown(nextState.gameId);

  return {
    recommendation: allRecs[0],
    streak: nextState.streak,
    subtitle: nextState.streak > 0 ? `${nextState.streak} day daily pick streak` : 'Fresh daily pick',
  };
}

export function markDailyPickPlayed(gameId: number): void {
  const todayKey = getDateKey();
  const state = readJsonSetting<DailyPickState | null>(DAILY_PICK_KEY, null);
  if (!state || state.dateKey !== todayKey || state.gameId !== gameId || state.lastPlayedDateKey === todayKey) {
    return;
  }

  writeJsonSetting(DAILY_PICK_KEY, {
    ...state,
    lastPlayedDateKey: todayKey,
    streak: state.streak + 1,
  });
}

export function recordVersusChoice(recommendation: Recommendation): void {
  const preferences = getPreferences();
  const next = {
    ...preferences,
    advance: preferences.advance + (recommendation.highlights.some((item) => item.includes('progress') || item.includes('finish')) ? 1 : 0),
    short: preferences.short + (recommendation.sessionsToFinish !== null && recommendation.sessionsToFinish <= 2 ? 1 : 0),
    chill: preferences.chill + (recommendation.game.priority === 'low' || recommendation.game.status === 'not_started' ? 1 : 0),
    resume: preferences.resume + (recommendation.game.status === 'paused' || recommendation.game.status === 'playing' ? 1 : 0),
    finish: preferences.finish + (recommendation.game.progress_percentage >= 60 || (recommendation.sessionsToFinish !== null && recommendation.sessionsToFinish <= 2) ? 1 : 0),
  };

  writeJsonSetting(PREFERENCES_KEY, next);
  const eventsCount = getPreferenceEventsCount() + 1;
  setSetting(AI_PREFERENCE_EVENTS_KEY, String(eventsCount));
  if (eventsCount >= 3) {
    markAiProfileInitialized();
  }
  rememberRecommendationShown(recommendation.game.id);
}

export function getTasteProfile(): TasteProfile {
  const games = getAllGames();
  const preferences = getPreferences();
  const activeGames = games.filter((game) => ['playing', 'paused', 'up_next', 'not_started'].includes(game.status));
  const shortGames = activeGames.filter((game) => {
    const totalMinutes = getEstimatedTotalMinutes(game);
    return totalMinutes !== null && totalMinutes <= 12 * MINUTES_PER_HOUR;
  });
  const startedGames = activeGames.filter((game) => game.playtime_minutes > 0 || game.progress_percentage > 0);

  const profileFlags = [
    { label: 'Closer', score: preferences.finish + startedGames.length * 0.2 },
    { label: 'Short-session hunter', score: preferences.short + shortGames.length * 0.25 },
    { label: 'Comeback player', score: preferences.resume + activeGames.filter((game) => game.status === 'paused').length * 0.6 },
    { label: 'Momentum chaser', score: preferences.advance + activeGames.filter((game) => game.priority === 'high').length * 0.3 },
    { label: 'Low-pressure picker', score: preferences.chill + activeGames.filter((game) => game.priority === 'low').length * 0.3 },
  ].sort((a, b) => b.score - a.score);

  const title = profileFlags[0]?.label ?? 'Backlog explorer';

  return {
    title,
    summary: `${title} profile built from your rerolls, versus choices and current backlog shape.`,
    tags: [
      shortGames.length >= Math.max(2, Math.round(activeGames.length * 0.35)) ? 'Prefers compact campaigns' : 'Can handle longer runs',
      startedGames.length >= Math.max(2, Math.round(activeGames.length * 0.4)) ? 'Likes continuing saves' : 'Enjoys fresh starts',
      activeGames.filter((game) => game.priority === 'high').length >= 3 ? 'Follows priority closely' : 'Flexible with urgency',
    ],
  };
}

export function getBacklogMissions(): BacklogMission[] {
  const recs = getRecommendations({ limit: 8, avoidRecent: false });
  const paused = recs.find((item) => item.game.status === 'paused');
  const almostDone = recs.find((item) => item.game.progress_percentage >= 70 || (item.sessionsToFinish !== null && item.sessionsToFinish <= 2));
  const shortRun = recs.find((item) => item.sessionsToFinish !== null && item.sessionsToFinish <= 3);

  return [
    paused
      ? {
          id: 'resume-old-save',
          title: 'Resume one old save',
          description: `${paused.game.title} is ready for a comeback and should recover momentum fast.`,
          gameId: paused.game.id,
        }
      : {
          id: 'warm-up-run',
          title: 'Warm up the backlog',
          description: 'Pick one game already marked up next and give it the first real session.',
        },
    almostDone
      ? {
          id: 'close-pending-run',
          title: 'Close one pending run',
          description: `${almostDone.game.title} looks close enough to finish without taking over the week.`,
          gameId: almostDone.game.id,
        }
      : {
          id: 'push-progress',
          title: 'Advance an active save',
          description: 'Take one in-progress game and move it forward with a meaningful session.',
        },
    shortRun
      ? {
          id: 'weekend-clear',
          title: 'Clear something short',
          description: `${shortRun.game.title} fits a fast clear and should not dominate your calendar.`,
          gameId: shortRun.game.id,
        }
      : {
          id: 'bite-size-night',
          title: 'Schedule a bite-size night',
          description: 'Use a lighter session on a smaller game to keep the backlog feeling manageable.',
        },
  ];
}

export function getSmartCollections(): SmartCollection[] {
  const candidates = getCandidatesForRecommendation();

  return [
    {
      id: 'almost-done',
      title: 'Almost Done',
      description: 'Games you could close without another huge commitment.',
      games: buildRecommendations(
        candidates.filter((game) => game.progress_percentage >= 60 || getEstimatedRemainingMinutes(game) <= 180),
        { mood: 'finish', limit: 3, avoidRecent: false }
      ),
    },
    {
      id: 'recoverable',
      title: 'Recoverable Saves',
      description: 'Paused games that still have momentum left.',
      games: buildRecommendations(
        candidates.filter((game) => game.status === 'paused'),
        { mood: 'resume', limit: 3, avoidRecent: false }
      ),
    },
    {
      id: 'short-high-priority',
      title: 'Short High Priority',
      description: 'High-priority picks that will not eat your month.',
      games: buildRecommendations(
        candidates.filter((game) => game.priority === 'high' && matchesMode(game, 'focus')),
        { mood: 'short', limit: 3, avoidRecent: false }
      ),
    },
    {
      id: 'tonight',
      title: 'Perfect For Tonight',
      description: 'Candidates that fit a compact session right now.',
      games: buildRecommendations(candidates, { availableTimeHours: 2, goal: 'bite_size', limit: 3, avoidRecent: false }),
    },
  ].filter((collection) => collection.games.length > 0);
}

export function getWeeklyPlan(hoursPerWeek: number = 7): WeeklyPlan {
  const recs = getRecommendations({ limit: 3, avoidRecent: false });
  const labels = ['Tue', 'Thu', 'Sat'];
  const hoursPerSlot = Math.max(1, Math.round((hoursPerWeek / 3) * 10) / 10);

  return {
    title: 'Weekly Route',
    summary: `Spread ${hoursPerWeek} hours across three focused picks instead of one giant commitment.`,
    totalHours: hoursPerWeek,
    items: recs.map((recommendation, index) => ({
      label: labels[index] ?? `Day ${index + 1}`,
      note:
        recommendation.sessionsToFinish !== null
          ? `${recommendation.sessionsToFinish} sessions to finish at ~${hoursPerSlot}h each`
          : `Use a ${hoursPerSlot}h slot to test momentum`,
      recommendation,
    })),
  };
}

export function getVersusPair(excludeGameIds: number[] = []): VersusPair | null {
  const closerPool = getRecommendations({ mood: 'finish', limit: 8, avoidRecent: false, excludeGameIds })
    .filter((item) => !excludeGameIds.includes(item.game.id));
  const closer = closerPool[Math.floor(Math.random() * Math.min(3, closerPool.length))];

  const excludeForLighter = closer ? [...excludeGameIds, closer.game.id] : excludeGameIds;
  const lighterPool = getRecommendations({ mood: 'short', goal: 'bite_size', limit: 10, avoidRecent: false, excludeGameIds: excludeForLighter })
    .filter((item) => !excludeForLighter.includes(item.game.id));
  const lighter = lighterPool[Math.floor(Math.random() * Math.min(3, lighterPool.length))];

  if (!closer || !lighter) {
    return null;
  }

  return {
    prompt: 'What sounds better tonight?',
    left: closer,
    right: lighter,
  };
}

export function recordCompletionCelebration(game: Game, previousHours: number, nextHours: number): void {
  const stats = getBacklogStats();
  const savedHours = Math.max(0, previousHours - nextHours);
  const payload: CompletionCelebration = {
    gameId: game.id,
    title: game.title,
    savedHours,
    completedCount: stats.completed,
    dateKey: getDateKey(),
  };

  writeJsonSetting(COMPLETION_KEY, payload);
}

export function getRecentCompletionCelebration(): CompletionCelebration | null {
  const value = readJsonSetting<CompletionCelebration | null>(COMPLETION_KEY, null);
  if (!value) {
    return null;
  }

  return getDaysBetween(value.dateKey) <= 7 ? value : null;
}

// ─── AI Preview State ─────────────────────────────────────────────────────────

const AI_PREVIEW_COUNT_KEY = 'ai_preview_count';
const AI_PREVIEW_INITIALIZED_KEY = 'ai_profile_initialized';
const AI_PREFERENCE_EVENTS_KEY = 'ai_preference_events_count';

export function getAiPreviewCount(): number {
  return parseInt(getSetting(AI_PREVIEW_COUNT_KEY) || '0', 10);
}

export function incrementAiPreviewCount(): void {
  const count = getAiPreviewCount() + 1;
  setSetting(AI_PREVIEW_COUNT_KEY, String(count));
}

export function isAiProfileInitialized(): boolean {
  return getSetting(AI_PREVIEW_INITIALIZED_KEY) === 'true';
}

export function markAiProfileInitialized(): void {
  setSetting(AI_PREVIEW_INITIALIZED_KEY, 'true');
}

export function getPreferenceEventsCount(): number {
  return parseInt(getSetting(AI_PREFERENCE_EVENTS_KEY) || '0', 10);
}

function buildRecommendations(games: Game[], request: RecommendationRequest = {}): Recommendation[] {
  const {
    availableTimeHours,
    mode = 'balanced',
    mood = 'balanced',
    goal = 'none',
    limit = 3,
    excludeGameIds = [],
    avoidRecent = true,
  } = request;

  const recentIds = avoidRecent ? getRecentRecommendationIds() : [];
  const blockedIds = [...excludeGameIds, ...recentIds].filter((value, index, array) => array.indexOf(value) === index);

  const candidates = shuffleArray(
    games
      .filter((game) => !blockedIds.includes(game.id))
      .filter((game) => matchesMode(game, mode))
      .filter((game) => matchesSession(game, availableTimeHours))
  );

  const scored = candidates
    .map((game) => scoreGame(game, { availableTimeHours, mode, mood, goal }))
    .sort((a, b) => b.score - a.score);

  const fallbackCandidates =
    scored.length > 0
      ? scored
      : games
          .filter((game) => !excludeGameIds.includes(game.id))
          .filter((game) => matchesMode(game, mode))
          .filter((game) => matchesSession(game, availableTimeHours))
          .map((game) => scoreGame(game, { availableTimeHours, mode, mood, goal }))
          .sort((a, b) => b.score - a.score);

  const top = fallbackCandidates.slice(0, limit);
  if (top.length === 0) {
    return [];
  }

  const maxScore = Math.max(...top.map((item) => item.score), 1);
  const leader = top[0];

  return top.map((item) => ({
    ...item,
    match: maxScore > 0 ? clamp(Math.round((item.score / maxScore) * 100), 0, 100) : 0,
    confidence: (maxScore >= 80 ? 'high' : maxScore >= 40 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    whyNot: item.game.id === leader.game.id ? undefined : buildWhyNot(item, leader),
    badges: buildBadges(item),
  }));
}

function scoreGame(
  game: Game,
  context: {
    availableTimeHours?: number;
    mode: RecommendationMode;
    mood: RecommendationMood;
    goal: RecommendationGoal;
  }
): Recommendation {
  const metrics = getGameMetrics(game, context.availableTimeHours);
  const preferences = getPreferences();
  const highlights: string[] = [];
  let score = 0;

  score += scorePriority(game, highlights);
  score += scoreStatus(game, highlights);
  score += scoreProgress(game, metrics, highlights);
  score += scoreLength(game, metrics, context, highlights);
  score += scoreRecency(game, metrics, highlights);
  score += scoreBacklogAge(metrics, highlights);
  score += scoreMood(game, metrics, context.mood, highlights);
  score += scoreGoal(metrics, context.goal, context.availableTimeHours, highlights);
  score += scorePreferenceBias(game, metrics, preferences);

  if (game.exclude_from_backlog) {
    score -= 100;
  }

  if (highlights.length === 0) {
    highlights.push('Good fit for the current backlog');
  }

  return {
    game,
    score: Math.round(score),
    match: 0,
    confidence: 'low' as 'low' | 'medium' | 'high',
    highlights: highlights.slice(0, 3),
    reason: highlights.slice(0, 3).join(' • '),
    whyNot: undefined,
    badges: [],
    sessionsToFinish: metrics.sessionsToFinish,
    daysWaiting: metrics.daysInBacklog,
  };
}

function scorePriority(game: Game, highlights: string[]): number {
  const weights = { high: 34, medium: 22, low: 10 } as const;
  if (game.priority === 'high') {
    highlights.push('High priority');
  }
  return weights[game.priority];
}

function scoreStatus(game: Game, highlights: string[]): number {
  switch (game.status) {
    case 'playing':
      highlights.push('Already in progress');
      return 24;
    case 'up_next':
      highlights.push('Marked as up next');
      return 18;
    case 'paused':
      return 14;
    case 'not_started':
      return 10;
    default:
      return 0;
  }
}

function scoreProgress(game: Game, metrics: GameMetrics, highlights: string[]): number {
  const progressRatio = metrics.progressRatio;
  const progressPercentage = game.progress_percentage / 100;
  const effectiveProgress = progressRatio ?? (progressPercentage > 0 ? progressPercentage : null);

  if (effectiveProgress === null) {
    return 4;
  }
  if (effectiveProgress >= 0.8) {
    highlights.push('Close to the finish line');
    return 22;
  }
  if (effectiveProgress >= 0.2) {
    return 16;
  }
  if (effectiveProgress > 0) {
    return 10;
  }
  return 4;
}

function scoreLength(
  game: Game,
  metrics: GameMetrics,
  context: { availableTimeHours?: number; mode: RecommendationMode },
  highlights: string[]
): number {
  const totalMinutes = metrics.totalMinutes;

  if (context.availableTimeHours && metrics.remainingMinutes !== null) {
    if ((metrics.sessionsToFinish ?? 99) <= 3) {
      highlights.push('Fits the time you have');
      return 24;
    }
    if ((metrics.sessionsToFinish ?? 99) <= 6) {
      return 16;
    }
    return 8;
  }

  if (context.mode === 'focus' && totalMinutes !== null) {
    if (totalMinutes <= 8 * MINUTES_PER_HOUR) {
      highlights.push('Short and easy to clear');
      return 22;
    }
    if (totalMinutes <= 12 * MINUTES_PER_HOUR) {
      return 16;
    }
  }

  if (totalMinutes === null) {
    return 6;
  }
  if (totalMinutes <= 12 * MINUTES_PER_HOUR) {
    highlights.push('Short campaign');
    return 16;
  }
  if (totalMinutes <= 25 * MINUTES_PER_HOUR) {
    return 10;
  }
  return 4;
}

function scoreRecency(game: Game, metrics: GameMetrics, highlights: string[]): number {
  const daysSinceLastPlayed = metrics.daysSinceLastPlayed;
  if (daysSinceLastPlayed === null) {
    return game.status === 'not_started' ? 6 : 0;
  }
  if (game.status === 'paused' && daysSinceLastPlayed >= 30) {
    highlights.push('Good moment to resume it');
    return 18;
  }
  if (game.status === 'playing' && daysSinceLastPlayed <= 10) {
    return 16;
  }
  if (daysSinceLastPlayed >= 90) {
    return 10;
  }
  if (daysSinceLastPlayed >= 30) {
    return 6;
  }
  return 2;
}

function scoreBacklogAge(metrics: GameMetrics, highlights: string[]): number {
  if (metrics.daysInBacklog >= 180) {
    highlights.push('Has been waiting in the backlog');
    return 10;
  }
  if (metrics.daysInBacklog >= 60) {
    return 6;
  }
  return 2;
}

function scoreMood(game: Game, metrics: GameMetrics, mood: RecommendationMood, highlights: string[]): number {
  switch (mood) {
    case 'advance':
      if (game.playtime_minutes > 0 || game.progress_percentage > 0) {
        highlights.push('Built for progress tonight');
        return 18;
      }
      return 4;
    case 'short':
      if ((metrics.sessionsToFinish ?? 99) <= 2 || (metrics.totalMinutes ?? 9999) <= 8 * MINUTES_PER_HOUR) {
        highlights.push('Great for a short burst');
        return 20;
      }
      return 2;
    case 'chill':
      if (game.priority !== 'high' && game.status === 'not_started') {
        highlights.push('Low-pressure pick');
        return 18;
      }
      return 6;
    case 'resume':
      if (game.status === 'paused' || game.status === 'playing') {
        highlights.push('Keeps your current momentum alive');
        return 20;
      }
      return 4;
    case 'finish':
      if (game.progress_percentage >= 60 || (metrics.sessionsToFinish ?? 99) <= 2) {
        highlights.push('Very finishable right now');
        return 22;
      }
      return 4;
    default:
      return 0;
  }
}

function scoreGoal(
  metrics: GameMetrics,
  goal: RecommendationGoal,
  availableTimeHours: number | undefined,
  highlights: string[]
): number {
  const sessions = metrics.sessionsToFinish;
  const sessionHours = availableTimeHours ?? DEFAULT_SESSION_HOURS;
  const sessionMinutes = sessionHours * MINUTES_PER_HOUR;

  if (goal === 'none') {
    return 0;
  }
  if (goal === 'finish_today') {
    if (metrics.remainingMinutes !== null && metrics.remainingMinutes <= sessionMinutes) {
      highlights.push('Could be finished today');
      return 20;
    }
    return 0;
  }
  if (goal === 'two_sessions') {
    if (sessions !== null && sessions <= 2) {
      highlights.push('Good for 1-2 sessions');
      return 16;
    }
    return 4;
  }
  if (goal === 'bite_size') {
    if (metrics.remainingMinutes !== null && metrics.remainingMinutes <= 90) {
      highlights.push('Tiny bite-size commitment');
      return 20;
    }
    if ((metrics.totalMinutes ?? 9999) <= 4 * MINUTES_PER_HOUR) {
      return 14;
    }
  }
  return 0;
}

function scorePreferenceBias(game: Game, metrics: GameMetrics, preferences: AiPreferences): number {
  let score = 0;
  if (game.playtime_minutes > 0 || game.progress_percentage > 0) {
    score += preferences.advance * 1.5;
  }
  if ((metrics.sessionsToFinish ?? 99) <= 2 || (metrics.totalMinutes ?? 9999) <= 8 * MINUTES_PER_HOUR) {
    score += preferences.short * 1.4;
  }
  if (game.priority !== 'high' && game.status === 'not_started') {
    score += preferences.chill * 1.2;
  }
  if (game.status === 'paused' || game.status === 'playing') {
    score += preferences.resume * 1.6;
  }
  if (game.progress_percentage >= 60 || (metrics.sessionsToFinish ?? 99) <= 2) {
    score += preferences.finish * 1.7;
  }
  return score;
}

function getGameMetrics(game: Game, sessionHours?: number): GameMetrics {
  const totalMinutes = getEstimatedTotalMinutes(game);
  const remainingMinutes = totalMinutes === null ? null : Math.max(totalMinutes - game.playtime_minutes, 0);
  const progressRatio =
    totalMinutes && totalMinutes > 0 ? clampNumber(game.playtime_minutes / totalMinutes, 0, 1.25) : null;
  const normalizedSessionHours = sessionHours ?? DEFAULT_SESSION_HOURS;

  return {
    totalMinutes,
    remainingMinutes,
    progressRatio,
    daysSinceLastPlayed: game.last_played ? getDaysBetween(game.last_played) : null,
    daysInBacklog: getDaysBetween(game.added_at),
    sessionsToFinish:
      remainingMinutes !== null ? Math.max(1, Math.ceil(remainingMinutes / (normalizedSessionHours * MINUTES_PER_HOUR))) : null,
  };
}

function matchesMode(game: Game, mode: RecommendationMode): boolean {
  if (mode !== 'focus') {
    return true;
  }
  const totalMinutes = getEstimatedTotalMinutes(game);
  return totalMinutes !== null && totalMinutes <= 12 * MINUTES_PER_HOUR;
}

function matchesSession(game: Game, availableTimeHours?: number): boolean {
  if (!availableTimeHours) {
    return true;
  }
  const totalMinutes = getEstimatedTotalMinutes(game);
  if (totalMinutes === null) {
    return false;
  }
  const remainingMinutes = Math.max(totalMinutes - game.playtime_minutes, 0);
  return remainingMinutes > 0 && remainingMinutes <= availableTimeHours * MINUTES_PER_HOUR * 6;
}

function buildWhyNot(item: Recommendation, leader: Recommendation): string {
  if (item.game.priority !== leader.game.priority && leader.game.priority === 'high') {
    return 'Not the top pick because priority is lower.';
  }
  if ((item.sessionsToFinish ?? 99) > (leader.sessionsToFinish ?? 99)) {
    return 'Not the top pick because it needs more sessions to close.';
  }
  if (item.game.progress_percentage < leader.game.progress_percentage) {
    return 'Not the top pick because it has less momentum built already.';
  }
  return 'Not the top pick because another option aligned slightly better tonight.';
}

function buildBadges(item: Recommendation): string[] {
  const badges = [item.confidence === 'low' ? 'Low confidence' : `${item.match}% fit`];
  if (item.sessionsToFinish !== null) {
    badges.push(`${item.sessionsToFinish} sessions`);
  }
  if (item.daysWaiting >= 30) {
    badges.push(`${item.daysWaiting}d waiting`);
  }
  return badges.slice(0, 3);
}

function getEstimatedTotalMinutes(game: Game): number | null {
  const totalSeconds = game.hltb_main_story ?? game.hltb_completionist ?? game.hltb_extra ?? null;
  if (!totalSeconds || totalSeconds <= 0) {
    return null;
  }
  return Math.round(totalSeconds / SECONDS_PER_MINUTE);
}

function getEstimatedRemainingMinutes(game: Game): number {
  const totalMinutes = getEstimatedTotalMinutes(game);
  if (totalMinutes === null) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(totalMinutes - game.playtime_minutes, 0);
}

function getPreferences(): AiPreferences {
  return readJsonSetting<AiPreferences>(PREFERENCES_KEY, DEFAULT_PREFERENCES);
}

function getRecentRecommendationIds(): number[] {
  return readJsonSetting<number[]>(RECENT_HISTORY_KEY, []);
}

function readJsonSetting<T>(key: string, fallback: T): T {
  const raw = getSetting(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonSetting(key: string, value: unknown): void {
  setSetting(key, JSON.stringify(value));
}

function getDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getPreviousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
}

function getDaysBetween(value: string): number {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86400000));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
