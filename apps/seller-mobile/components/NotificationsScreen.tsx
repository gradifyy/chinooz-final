import React, { useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  ChevronLeft,
  Check,
  Package,
  Star,
  Wallet,
  AlertTriangle,
  Megaphone,
  MessageCircle,
  Info,
  type LucideIcon,
} from 'lucide-react-native'
import {
  useSellerNotifications,
  useMarkSellerNotificationRead,
  useMarkAllSellerNotificationsRead,
} from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { EmptyState } from '@chinooz/ui'
import { colors, spacing, radii, fontFamily } from '../lib/theme'
import type { SellerNotification, SellerNotificationType } from '@chinooz/types'

const TYPE_ICON: Record<SellerNotificationType, LucideIcon> = {
  order: Package,
  review: Star,
  payout: Wallet,
  stock: AlertTriangle,
  promotion: Megaphone,
  system: Info,
  message: MessageCircle,
}

const TYPE_TINT: Record<SellerNotificationType, string> = {
  order: colors.info,
  review: '#E0A93B',
  payout: colors.success,
  stock: colors.warning,
  promotion: colors.primary,
  system: colors.textMuted,
  message: colors.primary,
}

function timeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const mins = Math.round((now - then) / 60000)
  const localeTag = locale === 'ne' ? 'ne-NP' : 'en-US'
  if (mins < 1) return locale === 'ne' ? 'अहिले' : 'Just now'
  if (mins < 60) return locale === 'ne' ? `${mins} मिनेट अघि` : `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return locale === 'ne' ? `${hrs} घण्टा अघि` : `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return locale === 'ne' ? `${days} दिन अघि` : `${days}d ago`
  return new Date(iso).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' })
}

export function NotificationsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const sellerId = useSellerSessionStore(s => s.sellerId)
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const { data: notifications, isLoading, isError, refetch, isFetching } = useSellerNotifications(sellerId ?? undefined)
  const markRead = useMarkSellerNotificationRead()
  const markAllRead = useMarkAllSellerNotificationsRead()

  const sorted = useMemo(() => {
    const list = notifications ?? []
    return [...list].sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [notifications])

  const unreadCount = useMemo(() => (notifications ?? []).filter(n => !n.read).length, [notifications])

  const handleItem = useCallback(
    (item: SellerNotification) => {
      if (!item.read) markRead.mutate(item.id)
      if (item.link) router.push(item.link as Href)
    },
    [markRead, router],
  )

  const handleMarkAll = useCallback(() => {
    if (unreadCount > 0) markAllRead.mutate(sellerId ?? 'seller-1')
  }, [markAllRead, unreadCount, sellerId])

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('seller.orders.shipCancel')}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('seller.notificationsFeed.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          title={t('seller.notificationsFeed.empty')}
          subtitle={t('seller.notificationsFeed.emptyHint')}
          icon={<Bell size={40} color={colors.textMuted} />}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('seller.orders.shipCancel')}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('seller.notificationsFeed.title')}</Text>
        <TouchableOpacity
          onPress={handleMarkAll}
          disabled={unreadCount === 0 || markAllRead.isPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('seller.notificationsFeed.markAllRead')}
          accessibilityState={{ disabled: unreadCount === 0 }}
        >
          {markAllRead.isPending ? (
            <ActivityIndicator size={18} color={colors.primary} />
          ) : (
            <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllDisabled]}>
              {t('seller.notificationsFeed.markAllRead')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={n => n.id}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3], flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const Icon = TYPE_ICON[item.type] ?? Bell
          const tint = TYPE_TINT[item.type] ?? colors.textMuted
          return (
            <TouchableOpacity
              onPress={() => handleItem(item)}
              style={[styles.item, !item.read && styles.itemUnread]}
              accessibilityRole="button"
              accessibilityLabel={t('seller.notificationsFeed.itemAria', { title: item.title, body: item.body })}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: tint + '1A' }]}>
                <Icon size={18} color={tint} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  {!item.read && <View style={styles.unreadDot} />}
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.createdAt, i18n.language)}</Text>
              </View>
              {!item.read && (
                <TouchableOpacity
                  onPress={() => markRead.mutate(item.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('seller.notificationsFeed.markReadAria')}
                  style={styles.markReadBtn}
                >
                  <Check size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingVertical: spacing[10], alignItems: 'center' }}>
              <ActivityIndicator size={24} color={colors.primary} />
            </View>
          ) : isError ? (
            <EmptyState
              title={t('seller.orders.errorTitle')}
              subtitle={t('seller.orders.errorRetryHint')}
              icon={<AlertTriangle size={40} color={colors.error} />}
            />
          ) : (
            <EmptyState
              title={t('seller.notificationsFeed.empty')}
              subtitle={t('seller.notificationsFeed.emptyHint')}
              icon={<Bell size={40} color={colors.textMuted} />}
            />
          )
        }
      />
    </SafeAreaView>
  )
}

export default NotificationsScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  markAllText: { fontSize: 14, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  markAllDisabled: { color: colors.textTertiary },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing[3.5],
  },
  itemUnread: { borderColor: colors.primary50, backgroundColor: colors.primary50 },
  iconBadge: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.primary },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, fontFamily: fontFamily.sansSemiBold[0] },
  itemBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  itemTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  markReadBtn: { padding: spacing[1], borderRadius: radii.sm },
})
