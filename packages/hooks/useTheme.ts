import { useState, useEffect, useCallback } from 'react'

/** User-selectable appearance preference. `system` follows the OS color scheme. */
export type ThemePreference = 'light' | 'dark' | 'system'
type EffectiveMode = 'light' | 'dark'

const STORAGE_KEY = 'chinooz-theme'

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function isWebEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function getInitialPreference(): ThemePreference {
  if (!isWebEnvironment()) return 'system'
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
    }
  } catch {}
  return 'system'
}

function resolveMode(pref: ThemePreference): EffectiveMode {
  if (!isWebEnvironment()) return 'light'
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

function applyMode(mode: EffectiveMode) {
  if (isWebEnvironment() && document.documentElement) {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }
}

/**
 * Web appearance controller. Stores the user's *preference* (light/dark/system)
 * and applies the *resolved* mode to the `<html>` `.dark` class.
 *
 * Backwards compatible: still exposes `isDark` (resolved) and `toggle`
 * (light↔dark). Adds `theme` (the preference) + `setTheme` so the settings
 * screen can offer a three-way choice at parity with buyer-mobile.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(getInitialPreference)
  const [mode, setMode] = useState<EffectiveMode>(() => resolveMode(getInitialPreference()))

  // Persist the preference and apply the resolved mode whenever it changes.
  useEffect(() => {
    const resolved = resolveMode(theme)
    setMode(resolved)
    applyMode(resolved)
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  // When following the system, react live to OS color-scheme changes.
  useEffect(() => {
    if (theme !== 'system') return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const resolved = mql.matches ? 'dark' : 'light'
      setMode(resolved)
      applyMode(resolved)
    }
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [theme])

  const setTheme = useCallback((pref: ThemePreference) => {
    setThemeState(pref)
  }, [])

  const toggle = useCallback(() => {
    // Flip to an explicit light/dark based on what's currently showing.
    setThemeState(prev => (resolveMode(prev) === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, mode, isDark: mode === 'dark', toggle, setTheme }
}
