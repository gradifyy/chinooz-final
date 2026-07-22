import React from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Star } from 'lucide-react-native'
import { colors, spacing, fontFamily, sellerFont } from '../../lib/theme'

const SANS_SEMI = fontFamily.sansSemiBold[0]

/** Tone accents for the smart headline dot. */
const HEADLINE_TONE: Record<'urgent' | 'positive' | 'neutral', string> = {
  urgent: '#FCA5A5',
  positive: '#86EFAC',
  neutral: 'rgba(255,255,255,0.9)',
}

export type WelcomeBannerHeadline = {
  /** One-line, plain-language summary of the most important thing right now. */
  text: string
  /** Optional route — when set the headline becomes tappable and shows a chevron. */
  route?: string
  tone?: 'urgent' | 'positive' | 'neutral'
}

/**
 * Greeting hero — the dashboard's opening. A strong, personal time-of-day
 * greeting carries store identity; a single primary action surfaces the most
 * important thing to do right now; rating + category sit quietly as supporting
 * metadata. The live-status indicator was intentionally removed. Depth comes
 * from a soft graphite gradient + an almost-invisible light-catch — no blobs.
 */
export function WelcomeBanner({
  greeting,
  dateText,
  rating,
  reviewCount,
  category,
  bannerUrl,
  headline,
  onHeadlinePress,
}: {
  greeting: string
  dateText: string
  // statusKey/statusLabel are still accepted from the dashboard for
  // compatibility, but the live indicator is no longer rendered in the hero.
  statusKey?: 'live' | 'review' | 'paused'
  statusLabel?: string
  rating?: number
  reviewCount?: number
  category?: string
  bannerUrl?: string
  headline?: WelcomeBannerHeadline
  onHeadlinePress?: (route: string) => void
  reducedMotion?: boolean
}) {
  const hasRating = typeof rating === 'number' && rating > 0
  const toneColor = headline?.tone ? HEADLINE_TONE[headline.tone] : HEADLINE_TONE.neutral
  const headlineTappable = !!(headline?.route && onHeadlinePress)

  // Quiet supporting metadata: "4.8 (128)   ·   Lifestyle" — no pills.
  const metaParts: string[] = []
  if (hasRating) {
    metaParts.push(
      `${rating}${typeof reviewCount === 'number' ? ` (${reviewCount.toLocaleString()})` : ''}`,
    )
  }
  if (category) metaParts.push(category)

  return (
    <View style={styles.card}>
      {/* Backdrop: store banner with a dark scrim, or graphite gradient fallback. */}
      {bannerUrl ? (
        <>
          <Image
            source={{ uri: bannerUrl }}
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={['rgba(16,15,18,0.86)', 'rgba(28,27,31,0.9)', 'rgba(56,53,61,0.94)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Almost-invisible depth — a single soft diagonal light-catch, no blobs. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.75, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />

      <Text style={styles.date}>{dateText}</Text>

      <Text style={styles.greeting} numberOfLines={2} accessibilityRole="header">
        {greeting} 👋
      </Text>

      {!!headline &&
        (headlineTappable ? (
          <Pressable
            onPress={() => onHeadlinePress!(headline.route!)}
            accessibilityRole="button"
            accessibilityLabel={headline.text}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <View style={[styles.actionDot, { backgroundColor: toneColor }]} />
            <Text style={styles.actionText} numberOfLines={2}>
              {headline.text}
            </Text>
            <ChevronRight size={18} color="rgba(255,255,255,0.92)" strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={styles.action} accessibilityRole="text" accessibilityLabel={headline.text}>
            <View style={[styles.actionDot, { backgroundColor: toneColor }]} />
            <Text style={styles.actionText} numberOfLines={2}>
              {headline.text}
            </Text>
          </View>
        ))}

      {metaParts.length > 0 && (
        <View style={styles.metaRow}>
          {hasRating && <Star size={12} color="rgba(255,255,255,0.85)" fill="rgba(255,255,255,0.85)" />}
          <Text style={styles.metaText}>{metaParts.join('   ·   ')}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    overflow: 'hidden',
    shadowColor: '#100F12',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  date: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    fontFamily: SANS_SEMI,
    letterSpacing: 0.3,
  },
  greeting: {
    marginTop: spacing[3],
    fontSize: 26,
    lineHeight: 32,
    color: colors.white,
    fontFamily: sellerFont.display,
    letterSpacing: -0.6,
  },
  action: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  actionPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.white,
    fontFamily: SANS_SEMI,
    letterSpacing: -0.1,
  },
  metaRow: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  metaText: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: SANS_SEMI,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
})
