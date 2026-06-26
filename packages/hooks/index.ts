import { useColorScheme } from 'react-native'
import { useMemo } from 'react'

export function useThemeColors() {
  const scheme = useColorScheme()
  return useMemo(
    () => ({
      isDark: scheme === 'dark',
      background: scheme === 'dark' ? '#121212' : '#FAFAFA',
      surface: scheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
      text: scheme === 'dark' ? '#F1F1F1' : '#1F2937',
      textMuted: scheme === 'dark' ? '#9CA3AF' : '#6B7280',
      border: scheme === 'dark' ? '#333333' : '#E5E5E5',
      primary: '#8A1B57',
      primaryLight: '#B23C7E',
      primary50: '#F8EAF1',
      gold: '#E0A93B',
    }),
    [scheme],
  )
}

export { default as useDebounce } from './useDebounce'
