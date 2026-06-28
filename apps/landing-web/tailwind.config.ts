import { tailwindPreset } from '@chinooz/theme/tailwind-preset'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui-web/**/*.{ts,tsx}',
  ],
  presets: [tailwindPreset],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        devanagari: ['var(--font-noto-devanagari)', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem,6vw,5rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.5rem,5vw,4rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(2rem,4vw,3rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'h1': ['clamp(2rem,3.5vw,3rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'h2': ['clamp(1.5rem,2.5vw,2.25rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'h3': ['clamp(1.25rem,2vw,1.625rem)', { lineHeight: '1.3' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
        'body': ['1rem', { lineHeight: '1.65' }],
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
      },
      backgroundImage: {
        'hero-aurora': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(138,27,87,0.35) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(178,60,126,0.2) 0%, transparent 60%), linear-gradient(180deg, #0a0010 0%, #1a0020 40%, #0f0015 100%)',
        'hero-overlay': 'linear-gradient(180deg, transparent 0%, rgba(10,0,16,0.6) 60%, #0a0010 100%)',
        'section-gradient': 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)',
        'plum-gradient': 'linear-gradient(135deg, #8A1B57 0%, #6E1545 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(224,169,59,0.4) 50%, transparent 100%)',
      },
      animation: {
        'marquee': 'marquee 30s linear infinite',
        'marquee-reverse': 'marquee-reverse 30s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'count-up': 'count-up 2s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'aurora': 'aurora 8s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        aurora: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
