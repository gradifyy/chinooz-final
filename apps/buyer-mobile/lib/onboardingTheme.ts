/**
 * Onboarding visual tokens — derived from @chinooz/theme (plum brand + cream)
 * so the storytelling carousel matches AuthShell and the rest of the buyer app.
 * Do not introduce a second palette here.
 */

import { Dimensions, Platform } from 'react-native'
import { colors, spacing, radii, duration, springs, fontSz } from '@chinooz/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

/** Semantic colors mapped from the shared theme (light, onboarding is brand-led). */
export const onboardingColors = {
  creamLight: colors.cream,
  creamWarm: colors.primary50,
  cream: colors.cream,
  // Hero wash uses plum family (same as AuthShell / HomeHeader)
  coral: colors.primaryLight,
  peach: colors.plumMid,
  accentCoral: colors.primary,
  accentGold: colors.gold,
  accentBlush: colors.primary50,
  textPrimary: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  actionPrimary: colors.primary,
  actionPrimaryText: colors.white,
  surfaceSecondary: 'rgba(255, 255, 255, 0.9)',
  success: colors.success,
  inputBorder: colors.border,
  inputBorderActive: colors.primary,
  inputPlaceholder: colors.textTertiary,
  inputBackground: colors.surface,
  error: colors.error,
  dotActive: colors.primary,
  dotInactive: colors.border,
  cardBorder: colors.border,
  cardBorderSelected: colors.primary,
  cardSelectedBg: colors.primary50,
  white: colors.white,
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  plumMid: colors.plumMid,
  plumDeep: colors.plumDeep,
  gold: colors.gold,
  overlay: colors.overlay,
} as const

/** Fraunces is loaded in ThemeProvider — use it instead of unloaded Playfair. */
export const onboardingTypography = {
  displayLarge: {
    fontFamily: Platform.select({ ios: 'Fraunces', android: 'Fraunces', default: 'serif' }),
    fontSize: fontSz('4xl')[0] as number,
    lineHeight: (fontSz('4xl')[0] as number) * 1.15,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  displayMedium: {
    fontFamily: Platform.select({ ios: 'Fraunces', android: 'Fraunces', default: 'serif' }),
    fontSize: fontSz('3xl')[0] as number,
    lineHeight: (fontSz('3xl')[0] as number) * 1.2,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontFamily: Platform.select({
      ios: 'Fraunces-SemiBold',
      android: 'Fraunces-SemiBold',
      default: 'serif',
    }),
    fontSize: fontSz('2xl')[0] as number,
    lineHeight: (fontSz('2xl')[0] as number) * 1.2,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  bodyLarge: {
    fontFamily: Platform.select({ ios: 'Inter', android: 'Inter', default: 'sans-serif' }),
    fontSize: fontSz('md')[0] as number,
    lineHeight: (fontSz('md')[0] as number) * 1.5,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: Platform.select({ ios: 'Inter', android: 'Inter', default: 'sans-serif' }),
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: Platform.select({
      ios: 'Inter-SemiBold',
      android: 'Inter-SemiBold',
      default: 'sans-serif',
    }),
    fontSize: fontSz('sm')[0] as number,
    lineHeight: (fontSz('sm')[0] as number) * 1.4,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  button: {
    fontFamily: Platform.select({
      ios: 'Inter-SemiBold',
      android: 'Inter-SemiBold',
      default: 'sans-serif',
    }),
    fontSize: fontSz('md')[0] as number,
    lineHeight: (fontSz('md')[0] as number) * 1.2,
    fontWeight: '600' as const,
  },
} as const

export const onboardingShapes = {
  buttonPill: radii.full,
  buttonHeight: spacing[14],
  buttonPaddingH: spacing[6],
  cardRadius: radii['2xl'],
  cardRadiusMedium: radii.xl,
  cardRadiusSmall: radii.lg,
  inputRadius: radii.lg,
  inputHeight: spacing[13],
  inputPadding: spacing[4],
  dotSize: spacing[2],
  dotRadius: radii.full,
  buttonShadow: {
    shadowColor: colors.plumShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
} as const

export const onboardingSpacing = {
  screenPaddingH: spacing[6],
  screenPaddingBottom: spacing[8],
  sectionGap: spacing[8],
  labelInputGap: spacing[3],
  buttonStackGap: spacing[4],
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[3],
  lg: spacing[4],
  xl: spacing[5],
  xxl: spacing[6],
  xxxl: spacing[8],
} as const

export const onboardingAnimations = {
  pageTransition: {
    duration: duration.slow,
  },
  buttonPress: {
    scale: 0.97,
  },
  inputFocus: {
    duration: duration.fast,
  },
  paginationDot: {
    duration: duration.normal,
    activeScale: 1.3,
  },
  cardSelection: {
    duration: duration.normal,
  },
  parallaxFactor: 0.35,
  springs,
} as const

export const onboardingLayout = {
  heroTopPercentage: 0.55,
  heroBottomPercentage: 0.45,
  iconSize: 48,
  iconGap: spacing[8],
  headlineGap: spacing[3],
  formGap: spacing[8],
  minWidth: 375,
  maxWidth: 430,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  minTouchTarget: 44,
} as const

export const onboardingGradients = {
  /** Full-bleed hero wash — plum brand continuum */
  hero: {
    colors: [colors.plumDeep, colors.plumMid, colors.primary50] as const,
    locations: [0, 0.45, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  form: {
    colors: [colors.primary50, colors.cream] as const,
    locations: [0, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Fade hero photo into cream content band */
  heroOverlay: {
    colors: ['rgba(252,251,249,0)', 'rgba(252,251,249,0.75)', colors.cream] as const,
    locations: [0, 0.45, 0.85] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
} as const

/** Slide image assets only — copy comes from i18n keys */
export const onboardingSlides = [
  {
    id: 'welcome',
    image: require('../assets/onboarding/hero-5.jpg'),
    titleKey: 'onboarding.hero1Title',
    subtitleKey: 'onboarding.hero1Subtitle',
  },
  {
    id: 'personalized',
    image: require('../assets/onboarding/hero-2.jpg'),
    titleKey: 'onboarding.hero2Title',
    subtitleKey: 'onboarding.hero2Subtitle',
  },
  {
    id: 'curated',
    image: require('../assets/onboarding/hero-3.jpg'),
    titleKey: 'onboarding.hero3Title',
    subtitleKey: 'onboarding.hero3Subtitle',
  },
  {
    id: 'deals',
    image: require('../assets/onboarding/hero-4.jpg'),
    titleKey: 'onboarding.hero4Title',
    subtitleKey: 'onboarding.hero4Subtitle',
  },
  {
    id: 'trust',
    image: require('../assets/onboarding/hero-1.jpg'),
    titleKey: 'onboarding.hero5Title',
    subtitleKey: 'onboarding.hero5Subtitle',
  },
] as const

export type OnboardingColors = typeof onboardingColors
