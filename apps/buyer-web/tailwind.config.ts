import { tailwindPreset } from '@chinooz/theme/tailwind-preset'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  presets: [tailwindPreset],
  plugins: [],
}

export default config
