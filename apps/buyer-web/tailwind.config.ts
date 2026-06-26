import { tailwindPreset } from '@chinooz/theme/tailwind-preset'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './stories/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui-web/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [tailwindPreset],
  plugins: [],
}

export default config
