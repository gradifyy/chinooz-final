import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react-native'
import { colors, spacing, fontSize, fontFamily, radii } from '@chinooz/theme'

type Variant = 'terms' | 'privacy' | 'rider-agreement'

interface LegalSection {
  title: string
  body: string
}

interface LegalScreenProps {
  variant: Variant
}

const TITLES: Record<Variant, { key: string; fallback: string }> = {
  terms: { key: 'terms.title', fallback: 'Terms of Service' },
  privacy: { key: 'privacy.title', fallback: 'Privacy Policy' },
  'rider-agreement': { key: 'rider.welcome.riderAgreementLink', fallback: 'Rider Agreement' },
}

export default function LegalScreen({ variant }: LegalScreenProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const title = t(TITLES[variant].key, { defaultValue: TITLES[variant].fallback })

  const sections: LegalSection[] = useMemo(() => {
    if (variant === 'terms') {
      return [
        { title: t('terms.s1Title'), body: t('terms.s1Body') },
        { title: t('terms.s2Title'), body: t('terms.s2Body') },
        { title: t('terms.s4Title'), body: t('terms.s4Body') },
      ]
    }
    if (variant === 'privacy') {
      return [
        { title: t('privacy.s1Title'), body: t('privacy.s1Body') },
        { title: t('privacy.s2Title'), body: t('privacy.s2Body') },
        { title: t('privacy.s3Title'), body: t('privacy.s3Body') },
      ]
    }
    // rider-agreement — minimal dedicated copy reusing safe privacy/terms language.
    return [
      {
        title: t('terms.s2Title'),
        body: t('terms.s2Body'),
      },
      {
        title: t('privacy.s1Title'),
        body: t('privacy.s1Body'),
      },
    ]
  }, [variant, t])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={22} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>
        {sections.map((s, i) => (
          <View key={`${variant}-${i}`} style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {s.title}
            </Text>
            <Text style={styles.sectionBody} maxFontSizeMultiplier={1.25}>
              {s.body}
            </Text>
          </View>
        ))}
        <Text style={styles.footerNote} maxFontSizeMultiplier={1.2}>
          {t('about.company')} · {t('about.location')}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    gap: spacing[5],
  },
  lastUpdated: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  sectionBody: {
    fontSize: fontSize.md[0],
    color: colors.textSecondary,
    lineHeight: 24,
  },
  footerNote: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: spacing[2],
  },
})
