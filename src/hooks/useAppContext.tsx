import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAllSettings, setSetting } from '../database/queries';
import { Theme } from '../types';
import { THEMES, ThemeColors } from '../services/themeService';
import { useDatabase } from './useDatabase';

interface AppContextState {
    theme: Theme;
    themeColors: ThemeColors;
    isPremium: boolean;
    setTheme: (t: Theme) => void;
    unlockPremium: () => void;
    refreshSettings: () => void;
}

const AppContext = createContext<AppContextState>({
    theme: 'dark',
    themeColors: THEMES.dark,
    isPremium: false,
    setTheme: () => { },
    unlockPremium: () => { },
    refreshSettings: () => { },
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { ready } = useDatabase();
    const [theme, setThemeState] = useState<Theme>('dark');
    const [isPremium, setIsPremium] = useState(false);

    const refreshSettings = () => {
        if (!ready) return;
        const settings = getAllSettings();
        setThemeState(settings.theme || 'dark');
        setIsPremium(settings.is_premium);
    };

    useEffect(() => {
        if (ready) {
            refreshSettings();
        }
    }, [ready]);

    const setTheme = (t: Theme) => {
        setSetting('theme', t);
        setThemeState(t);
    };

    const unlockPremium = () => {
        setSetting('is_premium', 'true');
        setIsPremium(true);
    };

    const themeColors = THEMES[theme] || THEMES.dark;

    return (
        <AppContext.Provider value={{ theme, themeColors, isPremium, setTheme, unlockPremium, refreshSettings }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
