import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#8A1B57',
        'primary-dark': '#6E1545',
        'primary-light': '#B23C7E',
        'primary-50': '#F8EAF1',
        gold: '#E0A93B',
      },
    },
  },
  plugins: [],
}

export default config
