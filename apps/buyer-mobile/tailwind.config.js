const { tailwindPreset } = require('@chinooz/theme/tailwind-preset')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset'), tailwindPreset],
  plugins: [],
}
