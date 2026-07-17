/* eslint-disable @typescript-eslint/no-var-requires */
const { tailwindPreset } = require('@chinooz/theme/tailwind-preset')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset'), tailwindPreset],
  plugins: [],
}
