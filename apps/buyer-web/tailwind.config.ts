import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui-web/**/*.{jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8A1B57',
        'primary-dark': '#6E1545',
        'primary-light': '#B23C7E',
        'primary-50': '#F8EAF1',
        gold: '#E0A93B',
        background: '#FAFAFA',
        surface: '#FFFFFF',
        border: '#E5E5E5',
        text: '#1F2937',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

export default config
