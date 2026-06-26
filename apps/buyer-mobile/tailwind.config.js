/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
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
