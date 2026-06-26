const { colors } = require('../../packages/theme/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        'primary-dark': colors.primaryDark,
        'primary-light': colors.primaryLight,
        'primary-50': colors.primary50,
        gold: colors.gold,
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        text: colors.text,
        'text-muted': colors.textMuted,
      },
      fontFamily: {
        sans: ['Inter'],
        'sans-bold': ['Inter-Bold'],
        'sans-semibold': ['Inter-SemiBold'],
        devanagari: ['NotoSansDevanagari'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
