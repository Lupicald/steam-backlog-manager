export const COLORS = {
  // Background layers
  bg: '#0a0a14',
  bgSecondary: '#0d0d1a',
  bgTertiary: '#111122',

  // Glass surfaces
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassMedium: 'rgba(255,255,255,0.09)',
  glassStrong: 'rgba(255,255,255,0.14)',

  // Brand / accent
  accent: '#7c6af7',
  accentAlt: '#5b8af9',
  accentGlow: 'rgba(124,106,247,0.35)',
  violet: '#a78bfa',
  blue: '#60a5fa',
  cyan: '#22d3ee',
  teal: '#2dd4bf',

  // Status
  green: '#4ade80',
  yellow: '#facc15',
  orange: '#fb923c',
  red: '#f87171',
  rose: '#f43f5e',
  purple: '#c084fc',

  // Text
  textPrimary: '#f1f0ff',
  textSecondary: '#a0a0b8',
  textMuted: '#5c5c7a',

  // Gradients (start + end)
  gradientCard: ['rgba(124,106,247,0.18)', 'rgba(91,138,249,0.10)'] as const,
  gradientHero: ['#1a0a3a', '#060614'] as const,
  gradientStats: ['rgba(34,211,238,0.15)', 'rgba(124,106,247,0.10)'] as const,

  // Priority
  priorityHigh: '#f43f5e',
  priorityMedium: '#fb923c',
  priorityLow: '#6b7280',

  // Status colors
  statusPlaying: '#4ade80',
  statusUpNext: '#60a5fa',
  statusPaused: '#facc15',
  statusCompleted: '#a78bfa',
  statusAbandoned: '#f87171',
  statusNotStarted: '#9ca3af',
} as const;

export type Color = keyof typeof COLORS;
