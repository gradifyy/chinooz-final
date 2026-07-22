import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors as lightColors, spacing, radii, fontSz } from '@chinooz/theme'
import { SafeImage } from '@chinooz/ui'
import Icon from './Icon'
import { useAppTheme } from './ThemeProvider'

/**
 * A single sponsored placement at the top of the Categories tab — the simplest,
 * highest-intent ad unit (idea #1). In production the creative/target would come
 * from an ad campaign; here it renders a labelled "Sponsored" demo. Always shows
 * the "Sponsored" tag for trust/compliance.
 */
interface SponsoredBannerProps {
  title?: string
  subtitle?: string
  brand?: string
  image?: string
  categoryId?: string
}

export default function SponsoredBanner({
  title = 'Dashain Tech Fest',
  subtitle = 'Up to 40% off top electronics',
  brand = 'TechHub Nepal',
  image = 'https://loremflickr.com/800/400/electronics,technology?lock=7',
  categoryId = 'cat-electronics',
}: SponsoredBannerProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: categoryId } })}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${t('categories.sponsored')}: ${title}. ${subtitle}`}
    >
      <SafeImage
        source={image}
        fallback="https://picsum.photos/seed/chz-sponsored/800/400"
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(18,9,22,0.20)', 'rgba(18,9,22,0.55)', 'rgba(18,9,22,0.88)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.sponsoredChip}>
        <Text style={styles.sponsoredText}>{t('categories.sponsored')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        <View style={styles.ctaRow}>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{t('categories.shopNow')}</Text>
            <Icon name="chevron-forward" size={13} color={colors.primary} />
          </View>
          <Text style={styles.brand} numberOfLines={1}>{brand}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const makeStyles = (c: typeof lightColors) => StyleSheet.create({
  card: {
    height: 132,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: c.shimmer,
    marginBottom: spacing[5],
  },
  sponsoredChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  sponsoredText: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('2xs')[0],
    fontWeight: '800',
    color: c.text,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[3.5],
    gap: 1,
  },
  title: {
    fontFamily: 'Fraunces',
    fontSize: fontSz('xl')[0],
    fontWeight: '700',
    color: c.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSz('sm')[0],
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  ctaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: fontSz('sm')[0],
    fontWeight: '700',
    color: c.primary,
  },
  brand: {
    fontSize: fontSz('xs')[0],
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
})
