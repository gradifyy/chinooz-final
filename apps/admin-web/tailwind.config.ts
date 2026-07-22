import { tailwindPreset } from '@chinooz/theme/tailwind-preset'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui-web/*.{js,ts,jsx,tsx}',
    '../../packages/ui-web/hooks/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [tailwindPreset],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        devanagari: ['var(--font-noto-devanagari)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
