export type GameStatus =
  | 'playing'
  | 'up_next'
  | 'paused'
  | 'completed'
  | 'abandoned'
  | 'not_started';

export type GamePriority = 'high' | 'medium' | 'low';

export type Platform = 'steam' | 'playstation' | 'xbox' | 'nintendo' | 'emulator' | 'other';

export interface Game {
  id: number;
  steam_app_id: number;
  title: string;
  cover_url: string;
  status: GameStatus;
  priority: GamePriority;
  platform: Platform;
  playtime_minutes: number;
  hltb_main_story: number | null;
  hltb_completionist: number | null;
  hltb_extra: number | null;
  last_played: string | null;
  added_at: string;
  notes: string;
  progress_percentage: number;
  sort_order: number;
  exclude_from_backlog: number;
}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  rtime_last_played: number;
}

export interface SteamApiResponse {
  response: {
    game_count: number;
    games: SteamGame[];
  };
}

export interface HLTBResult {
  game_id: number;
  game_name: string;
  comp_main: number;
  comp_plus: number;
  comp_100: number;
}

export type HLTBLookupStatus = 'success' | 'not_found' | 'request_failed';

export interface BacklogStats {
  total: number;
  playing: number;
  up_next: number;
  paused: number;
  completed: number;
  abandoned: number;
  not_started: number;
  total_hours_remaining: number;
  total_playtime_hours: number;
  excluded_from_backlog: number;
  hltb_target_met: number;
  hltb_ready_to_finish: number;
}

export interface Recommendation {
  game: Game;
  reason: string;
  score: number;
  match: number;
  highlights: string[];
  whyNot?: string;
  badges: string[];
  sessionsToFinish: number | null;
  daysWaiting: number;
}

export type RecommendationMood = 'balanced' | 'advance' | 'short' | 'chill' | 'resume' | 'finish';

export type RecommendationGoal = 'none' | 'finish_today' | 'two_sessions' | 'bite_size';

export interface TasteProfile {
  title: string;
  summary: string;
  tags: string[];
}

export interface BacklogMission {
  id: string;
  title: string;
  description: string;
  gameId?: number;
}

export interface SmartCollection {
  id: string;
  title: string;
  description: string;
  games: Recommendation[];
}

export interface WeeklyPlanItem {
  label: string;
  note: string;
  recommendation: Recommendation;
}

export interface WeeklyPlan {
  title: string;
  summary: string;
  totalHours: number;
  items: WeeklyPlanItem[];
}

export interface VersusPair {
  prompt: string;
  left: Recommendation;
  right: Recommendation;
}

export interface DailyPick {
  recommendation: Recommendation;
  streak: number;
  subtitle: string;
}

export interface CompletionCelebration {
  gameId: number;
  title: string;
  savedHours: number;
  completedCount: number;
  dateKey: string;
}

export interface GamingSession {
  id: number;
  game_id: number;
  duration_minutes: number;
  session_date: string;
  notes: string;
}

export interface BacklogChallenge {
  id: number;
  type: string;
  target: number;
  progress: number;
  status: 'active' | 'completed' | 'failed';
  month_year: string;
}

export type Theme = 'cyberpunk' | 'neon' | 'oled' | 'retro' | 'ps_blue' | 'dark' | 'light';

export interface AppSettings {
  steam_id: string;
  steam_api_key: string;
  show_nsfw: boolean;
  default_sort: string;
  theme: Theme;
  is_premium: boolean;
}

export interface StatusConfig {
  label: string;
  color: string;
  icon: string;
}

export interface PriorityConfig {
  label: string;
  color: string;
  icon: string;
}

export const STATUS_CONFIG: Record<GameStatus, StatusConfig> = {
  playing: { label: 'Playing', color: '#4ade80', icon: 'play-circle' },
  up_next: { label: 'Up Next', color: '#60a5fa', icon: 'bookmark' },
  paused: { label: 'Paused', color: '#facc15', icon: 'pause-circle' },
  completed: { label: 'Completed', color: '#a78bfa', icon: 'checkmark-circle' },
  abandoned: { label: 'Abandoned', color: '#f87171', icon: 'close-circle' },
  not_started: { label: 'Not Started', color: '#9ca3af', icon: 'ellipse-outline' },
};

export const PRIORITY_CONFIG: Record<GamePriority, PriorityConfig> = {
  high: { label: 'High', color: '#f43f5e', icon: 'arrow-up' },
  medium: { label: 'Medium', color: '#f97316', icon: 'remove' },
  low: { label: 'Low', color: '#6b7280', icon: 'arrow-down' },
};
