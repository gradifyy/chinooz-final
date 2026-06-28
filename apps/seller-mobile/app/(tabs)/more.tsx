import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Megaphone,
  MessageSquare,
  Star,
  Wallet,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily, shadows } from '@chinooz/theme'
import { useA11y } from '../components/A11yProvider'
import { useSellerMessagesStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'

interface MoreItem {
  key: string
  labelKey: string
  href: string
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  badgeKey?: string
}

interface MoreSection {
  headerKey: string
  items: MoreItem[]
}

const SECTIONS: MoreSection[] = [
  {
    headerKey: 'seller.nav.sectionManage',
    items: [
      { key: 'promotions', labelKey: 'seller.nav.promotions', href: '/promotions', Icon: Megaphone },
      { key: 'finance', labelKey: 'seller.nav.finance', href: '/finance', Icon: Wallet },
      { key: 'settings', labelKey: 'seller.nav.settings', href: '/settings', Icon: Settings },
    ],
  },
  {
    headerKey: 'seller.nav.sectionInsights',
    items: [
      { key: 'analytics', labelKey: 'seller.nav.analytics', href: '/analytics', Icon: BarChart3 },
      { key: 'reviews', labelKey: 'seller.nav.reviews', href: '/reviews', Icon: Star, badgeKey: 'reviews' },
    ],
  },
  {
    headerKey: 'seller.nav.sectionCommunicate',
    items: [
      { key: 'messages', labelKey: 'seller.nav.messages', href: '/messages', Icon: MessageSquare, badgeKey: 'messages' },
    ],
  },
]

export default function MoreScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion } = useA11y()
  const messageStore = useSellerMessagesStore()
  const unreadMessages = messageStore.unreadCount
  const unreadReviews = 1

  useEffect(() => {
    analytics.screen({ name: 'seller-more' })
  }, [])

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === 'messages') return unreadMessages
    if (badgeKey === 'reviews') return unreadReviews
    return 0
  }

  const aggregateUnread = unreadMessages + unreadReviews

  const handlePress = (href: string) => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push(href as any)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SECTIONS.map(section => (
        <View key={section.headerKey} style={styles.section}>
          <Text style={styles.sectionHeader}>{t(section.headerKey)}</Text>
          <View style={styles.card}>
            {section.items.map((item, idx) => {
              const badge = getBadgeCount(item.badgeKey)
              return (
                <TouchableOpacity
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={t(item.labelKey)}
                  onPress={() => handlePress(item.href)}
                  style={[
                    styles.row,
                    idx < section.items.length - 1 && styles.rowBorder,
                  ]}
                  activeOpacity={0.7}
                >
                  <item.Icon size={24} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
                  {badge > 0 && (
                    <View style={styles.rowBadge}>
                      <Text style={styles.rowBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  )}
                  <ChevronRight size={20} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing[4],
    gap: spacing[5],
  },
  section: {
    gap: spacing[2],
  },
  sectionHeader: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.md[0],
    fontWeight: '400',
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  rowBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
