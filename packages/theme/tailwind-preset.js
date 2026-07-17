/* eslint-disable @typescript-eslint/no-var-requires */
const { colors, radii, heroInk, glows } = require('./tokens')

function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

// Build color tokens using CSS variables with light-mode fallbacks.
// The `.dark` class on <html> swaps the variable values (see globals.css).
const semanticKeys = ['background', 'surface', 'border', 'borderLight', 'text', 'textSecondary', 'textMuted', 'textTertiary', 'overlay', 'shimmer', 'shimmerHighlight', 'successLight', 'successText', 'warningLight', 'warningText', 'errorLight', 'infoLight', 'statusProcessingBg', 'statusShippedBg', 'statusReturnedBg', 'cream', 'creamInk', 'tierBg', 'dangerBg', 'inboxTint', 'progressTrack', 'toastSurface']

/**
 * Build a Tailwind preset from a palette. Shared by the default (Buyer) preset
 * and the Seller preset so both stay structurally identical — only the color
 * source differs.
 *
 * @returns {import('tailwindcss').Config}
 */
function buildPreset({ colors: paletteColors, glows: paletteGlows }) {
  const colorTokens = {}
  for (const [key, value] of Object.entries(paletteColors)) {
    const kebab = camelToKebab(key)
    if (semanticKeys.includes(key)) {
      colorTokens[kebab] = `var(--color-${kebab}, ${value})`
    } else {
      colorTokens[kebab] = value
    }
  }

  const radiusTokens = Object.fromEntries(
    Object.entries(radii).map(([key, value]) => [key, `${value}px`]),
  )

  /** @type {import('tailwindcss').Config} */
  return {
    darkMode: 'class',
    theme: {
      colors: colorTokens,
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '16px',
          sm: '16px',
          md: '24px',
          lg: '32px',
          xl: '32px',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1280px',
        },
      },
      extend: {
        spacing: {
          0: '0px',
          0.5: '2px',
          1: '4px',
          1.5: '6px',
          2: '8px',
          2.5: '10px',
          3: '12px',
          3.5: '14px',
          4: '16px',
          5: '20px',
          6: '24px',
          7: '28px',
          8: '32px',
          9: '36px',
          10: '40px',
          11: '44px',
          12: '48px',
          13: '52px',
          14: '56px',
          16: '64px',
          20: '80px',
          24: '96px',
        },
        borderRadius: radiusTokens,
        borderWidth: {
          DEFAULT: '1px',
          medium: '1.5px',
        },
        colors: {
          'hero-ink-900': heroInk[900],
          'hero-ink-800': heroInk[800],
          'hero-ink-700': heroInk[700],
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          devanagari: ['Noto Sans Devanagari', 'sans-serif'],
        },
        fontSize: {
          xs: ['10px', '14px'],
          sm: ['12px', '16px'],
          base: ['14px', '20px'],
          md: ['16px', '22px'],
          lg: ['18px', '26px'],
          xl: ['20px', '28px'],
          '2xl': ['24px', '32px'],
          '3xl': ['28px', '38px'],
          '4xl': ['32px', '42px'],
          '5xl': ['40px', '52px'],
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
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
        boxShadow: {
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          md: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
          lg: '0 4px 8px 0 rgba(0, 0, 0, 0.10)',
          xl: '0 6px 12px 0 rgba(0, 0, 0, 0.12)',
          'glow-primary': paletteGlows.primary,
          'glow-primary-soft': paletteGlows.primarySoft,
          'glow-primary-light-soft': paletteGlows.primaryLightSoft,
          'glow-gold-soft': paletteGlows.goldSoft,
        },
        zIndex: {
          base: '0',
          dropdown: '10',
          sticky: '20',
          navbar: '30',
          modal: '40',
          toast: '50',
          tooltip: '60',
        },
      },
    },
  }
}

/** @type {import('tailwindcss').Config} */
const tailwindPreset = buildPreset({ colors, glows })

module.exports = { tailwindPreset, buildPreset, colors }
