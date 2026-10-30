/**
 * NexERP — Theme context
 * ---------------------------------------------------------------------------
 * Owns the active theme and writes `data-theme` onto <html>, which is what
 * activates the light-token override block in styles/variables.css. The choice
 * is persisted to localStorage and, on first visit, seeded from the OS
 * `prefers-color-scheme` so the app never flashes the wrong palette.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '@/config/constants';

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

const ThemeContext = createContext(null);

/** Resolves the starting theme: stored preference, then OS preference, then dark. */
function getInitialTheme() {
  if (typeof window === 'undefined') return THEMES.DARK;

  const stored = localStorage.getItem(STORAGE_KEYS.theme);
  if (stored === THEMES.DARK || stored === THEMES.LIGHT) return stored;

  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? THEMES.LIGHT
    : THEMES.DARK;
}

export function ThemeProvider({ children, defaultTheme }) {
  const [theme, setTheme] = useState(defaultTheme ?? getInitialTheme);

  /* Reflect the theme onto the document root. Components key their own
     styles off this attribute via the [data-theme='light'] token block. */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  /* Follow the OS only while the user has not made an explicit choice. */
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.theme)) return undefined;

    const query = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!query) return undefined;

    const handleChange = (event) => setTheme(event.matches ? THEMES.LIGHT : THEMES.DARK);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  const setThemeMode = useCallback((next) => {
    if (next === THEMES.DARK || next === THEMES.LIGHT) setTheme(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === THEMES.DARK,
      isLight: theme === THEMES.LIGHT,
      toggleTheme,
      setTheme: setThemeMode,
    }),
    [theme, toggleTheme, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * @throws if called outside ThemeProvider — a missing provider is a wiring bug,
 * not a runtime condition to handle.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

export default ThemeContext;
