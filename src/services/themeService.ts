import { Theme } from '../types';

export interface ThemeColors {
    bg: string;
    card: string;
    glass: string;
    glassBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    blue: string;
    green: string;
    violet: string;
    red: string;
    teal: string;
    orange: string;
    gray: string;
}

export const THEMES: Record<Theme, ThemeColors> = {
    dark: { // Default Liquid Glass
        bg: '#05051a',
        card: '#0a0a20',
        glass: 'rgba(255,255,255,0.03)',
        glassBorder: 'rgba(255,255,255,0.08)',
        textPrimary: '#ffffff',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        accent: '#3b82f6',
        blue: '#60a5fa',
        green: '#4ade80',
        violet: '#a78bfa',
        red: '#f87171',
        teal: '#2dd4bf',
        orange: '#fb923c',
        gray: '#9ca3af',
    },
    light: {
        bg: '#f8fafc',
        card: '#ffffff',
        glass: 'rgba(0,0,0,0.03)',
        glassBorder: 'rgba(0,0,0,0.08)',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        accent: '#2563eb',
        blue: '#3b82f6',
        green: '#22c55e',
        violet: '#8b5cf6',
        red: '#ef4444',
        teal: '#14b8a6',
        orange: '#f97316',
        gray: '#64748b',
    },
    cyberpunk: {
        bg: '#0F0F1B',
        card: '#161324',
        glass: 'rgba(240, 230, 255, 0.05)',
        glassBorder: 'rgba(217, 38, 169, 0.3)',
        textPrimary: '#FCE7F3',
        textSecondary: '#F472B6',
        textMuted: '#9D174D',
        accent: '#F97316',
        blue: '#38BDF8',
        green: '#A3E635',
        violet: '#D946EF',
        red: '#EF4444',
        teal: '#2DD4BF',
        orange: '#F59E0B',
        gray: '#6B7280',
    },
    neon: {
        bg: '#000000',
        card: '#0A0A0A',
        glass: 'rgba(0, 255, 255, 0.04)',
        glassBorder: 'rgba(0, 255, 255, 0.2)',
        textPrimary: '#FFFFFF',
        textSecondary: '#00FFFF',
        textMuted: '#008080',
        accent: '#FF00FF',
        blue: '#00BFFF',
        green: '#39FF14',
        violet: '#BF00FF',
        red: '#FF3131',
        teal: '#00FA9A',
        orange: '#FF5F1F',
        gray: '#808080',
    },
    oled: {
        bg: '#000000',
        card: '#000000',
        glass: 'rgba(255, 255, 255, 0.08)',
        glassBorder: 'rgba(255, 255, 255, 0.15)',
        textPrimary: '#E5E5E5',
        textSecondary: '#A3A3A3',
        textMuted: '#525252',
        accent: '#3B82F6',
        blue: '#3B82F6',
        green: '#22C55E',
        violet: '#8B5CF6',
        red: '#EF4444',
        teal: '#14B8A6',
        orange: '#F97316',
        gray: '#737373',
    },
    retro: {
        bg: '#2B2B2B',
        card: '#3C3F41',
        glass: 'rgba(255, 204, 0, 0.03)',
        glassBorder: 'rgba(255, 204, 0, 0.2)',
        textPrimary: '#FFCC00',
        textSecondary: '#A68A00',
        textMuted: '#665500',
        accent: '#FF3300',
        blue: '#0099FF',
        green: '#33CC33',
        violet: '#CC33FF',
        red: '#FF0000',
        teal: '#00CC99',
        orange: '#FF9900',
        gray: '#888888',
    },
    ps_blue: {
        bg: '#001D4A',
        card: '#003380',
        glass: 'rgba(255, 255, 255, 0.05)',
        glassBorder: 'rgba(255, 255, 255, 0.15)',
        textPrimary: '#FFFFFF',
        textSecondary: '#B3D4FF',
        textMuted: '#66A3FF',
        accent: '#FFD700',
        blue: '#80BFFF',
        green: '#00FF99',
        violet: '#CC99FF',
        red: '#FF4D4D',
        teal: '#00E6E6',
        orange: '#FF9933',
        gray: '#999999',
    }
};
