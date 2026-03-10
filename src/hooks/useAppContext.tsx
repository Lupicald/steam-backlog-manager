import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { User, Session } from '@supabase/supabase-js';
import { getAllSettings, setSetting, getSetting } from '../database/queries';
import { Theme } from '../types';
import { THEMES, ThemeColors } from '../services/themeService';
import { useDatabase } from './useDatabase';
import { useAuth } from './useAuth';
import { useSync } from './useSync';
import { SyncStatus } from '../services/syncService';
import {
  initializeSubscriptions,
  syncEntitlementToSettings,
  restorePurchases,
  getEntitlementState,
  addCustomerInfoListener,
} from '../services/subscriptionService';
import { Language } from '../i18n';

// RevenueCatUI — only imported on native to avoid web crashes.
// We use lazy require() so bundlers don't fail on web.
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

async function _presentPaywall(): Promise<'purchased' | 'restored' | 'cancelled' | 'error'> {
  if (!isNative) return 'error';
  try {
    const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
    const result = await RevenueCatUI.presentPaywall();
    if (result === PAYWALL_RESULT.PURCHASED) return 'purchased';
    if (result === PAYWALL_RESULT.RESTORED) return 'restored';
    if (result === PAYWALL_RESULT.CANCELLED) return 'cancelled';
    return 'error';
  } catch (e) {
    console.warn('[RevenueCatUI] presentPaywall error:', e);
    return 'error';
  }
}

async function _presentCustomerCenter(): Promise<void> {
  if (!isNative) return;
  try {
    const { default: RevenueCatUI } = await import('react-native-purchases-ui');
    await RevenueCatUI.presentCustomerCenter();
  } catch (e) {
    console.warn('[RevenueCatUI] presentCustomerCenter error:', e);
  }
}

// ─── Context shape ─────────────────────────────────────────────────────────────

interface AppContextState {
    // ── Theme / Premium ───────────────────────────────────────────────────────
    theme: Theme;
    themeColors: ThemeColors;
    isPremium: boolean;
    setTheme: (t: Theme) => void;
    unlockPremium: () => void;
    refreshSettings: () => void;
    subscriptionLoading: boolean;
    premiumStatus: 'active' | 'expired' | 'unknown';
    /** Present the RevenueCat Paywall. Resolves after the sheet is dismissed. */
    purchasePremium: () => Promise<{ success: boolean; error: string | null }>;
    /** Restore previous purchases via RevenueCat. */
    restorePremium: () => Promise<{ success: boolean; error: string | null }>;
    /** Open the RevenueCat Customer Center (manage / cancel subscription). */
    showCustomerCenter: () => Promise<void>;
    // ── Auth ──────────────────────────────────────────────────────────────────
    user: User | null;
    session: Session | null;
    isAuthenticated: boolean;
    authLoading: boolean;
    authError: string | null;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    signInGoogle: () => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    clearAuthError: () => void;
    // ── Sync ──────────────────────────────────────────────────────────────────
    syncStatus: SyncStatus;
    isOnline: boolean;
    triggerSync: () => void;
    // ── Localization / Player ─────────────────────────────────────────────────
    language: Language;
    setLanguage: (lang: Language) => void;
    playerName: string;
    setPlayerName: (name: string) => void;
}

const AppContext = createContext<AppContextState>({
    theme: 'dark',
    themeColors: THEMES.dark,
    isPremium: false,
    setTheme: () => {},
    unlockPremium: () => {},
    refreshSettings: () => {},
    subscriptionLoading: false,
    premiumStatus: 'unknown',
    purchasePremium: async () => ({ success: false, error: null }),
    restorePremium: async () => ({ success: false, error: null }),
    showCustomerCenter: async () => {},
    user: null,
    session: null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signInGoogle: async () => ({ error: null }),
    signOut: async () => {},
    clearAuthError: () => {},
    syncStatus: 'idle',
    isOnline: true,
    triggerSync: () => {},
    language: 'en',
    setLanguage: () => {},
    playerName: 'Player',
    setPlayerName: () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { ready } = useDatabase();
    const [theme, setThemeState] = useState<Theme>('dark');
    const [isPremium, setIsPremium] = useState(false);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [language, setLanguageState] = useState<Language>('en');
    const [playerName, setPlayerNameState] = useState('Player');

    const auth = useAuth();
    const sync = useSync(auth.isAuthenticated);

    // ── Settings refresh ───────────────────────────────────────────────────────

    const refreshSettings = () => {
        if (!ready) return;
        const settings = getAllSettings();
        setThemeState(settings.theme || 'dark');
        setIsPremium(settings.is_premium);
        const storedLang = getSetting('app_language');
        if (storedLang === 'en' || storedLang === 'es') setLanguageState(storedLang);
        const storedName = getSetting('player_name');
        if (storedName) setPlayerNameState(storedName);
    };

    // ── Initialization ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (!ready) return;

        refreshSettings();

        // Initialize RevenueCat and warm the entitlement cache.
        initializeSubscriptions().then(() => {
            // Re-read settings after RC sync so premium state reflects server truth.
            const state = getEntitlementState();
            setIsPremium(state.isPremium);
        });

        // Listen for server-pushed CustomerInfo updates (e.g. renewal, cancellation).
        const removeListener = addCustomerInfoListener(async () => {
            await syncEntitlementToSettings();
            const state = getEntitlementState();
            setIsPremium(state.isPremium);
        });

        return () => removeListener();
    }, [ready]);

    // ── Theme ──────────────────────────────────────────────────────────────────

    const setTheme = (t: Theme) => {
        setSetting('theme', t);
        setThemeState(t);
    };

    const unlockPremium = () => {
        setSetting('is_premium', 'true');
        setIsPremium(true);
    };

    const setLanguage = (lang: Language) => {
        setSetting('app_language', lang);
        setLanguageState(lang);
    };

    const setPlayerName = (name: string) => {
        setSetting('player_name', name);
        setPlayerNameState(name);
    };

    // ── Subscription actions ───────────────────────────────────────────────────

    /**
     * Present the RevenueCat Paywall sheet. After it closes, sync entitlement
     * and update React state so the UI reflects the new status immediately.
     */
    const purchasePremium = async (): Promise<{ success: boolean; error: string | null }> => {
        setSubscriptionLoading(true);
        try {
            const outcome = await _presentPaywall();
            if (outcome === 'purchased' || outcome === 'restored') {
                await syncEntitlementToSettings();
                const state = getEntitlementState();
                setIsPremium(state.isPremium);
                return { success: state.isPremium, error: null };
            }
            return { success: false, error: null };
        } catch (e: any) {
            return { success: false, error: e.message ?? 'Something went wrong.' };
        } finally {
            setSubscriptionLoading(false);
        }
    };

    /** Restore previous purchases without showing the full paywall. */
    const restorePremium = async (): Promise<{ success: boolean; error: string | null }> => {
        setSubscriptionLoading(true);
        try {
            const result = await restorePurchases();
            if (result.success) {
                const state = getEntitlementState();
                setIsPremium(state.isPremium);
            }
            return result;
        } finally {
            setSubscriptionLoading(false);
        }
    };

    /** Open the RevenueCat Customer Center so the user can manage their subscription. */
    const showCustomerCenter = async (): Promise<void> => {
        await _presentCustomerCenter();
        // Sync after returning — user may have cancelled or changed plan.
        await syncEntitlementToSettings();
        const state = getEntitlementState();
        setIsPremium(state.isPremium);
    };

    // ── Derived values ─────────────────────────────────────────────────────────

    const themeColors = THEMES[theme] || THEMES.dark;
    const premiumStatus = getEntitlementState().status;

    return (
        <AppContext.Provider
            value={{
                // Theme / Premium
                theme,
                themeColors,
                isPremium,
                setTheme,
                unlockPremium,
                refreshSettings,
                subscriptionLoading,
                premiumStatus,
                purchasePremium,
                restorePremium,
                showCustomerCenter,
                // Auth
                user: auth.user,
                session: auth.session,
                isAuthenticated: auth.isAuthenticated,
                authLoading: auth.loading,
                authError: auth.error,
                signIn: async (email, password) => {
                    const result = await auth.signIn(email, password);
                    return { error: result.error };
                },
                signUp: async (email, password) => {
                    const result = await auth.signUp(email, password);
                    return { error: result.error };
                },
                signInGoogle: async () => {
                    const result = await auth.signInGoogle();
                    return { error: result.error };
                },
                signOut: auth.signOut,
                clearAuthError: auth.clearError,
                // Sync
                syncStatus: sync.status,
                isOnline: sync.isOnline,
                triggerSync: sync.triggerSync,
                // Localization / Player
                language,
                setLanguage,
                playerName,
                setPlayerName,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
