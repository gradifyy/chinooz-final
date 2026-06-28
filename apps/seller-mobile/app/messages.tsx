import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  AccessibilityInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, EmptyState, Skeleton, useReducedMotion } from '@chinooz/ui'
import { useSellerConversations, useMarkSellerConversationRead } from '@chinooz/hooks'
import { useSellerSessionStore, useSellerMessagesStore } from '@chinooz/state'
import { colors, spacing, radii, fontSize, fontFamily, duration } from '@chinooz/theme'
import type { Conversation } from '@chinooz/types'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const PLUM_4 = 'rgba(138,27,87,0.04)'

type FilterKey = 'all' | 'unread' | 'order' | 'product'

export default function SellerMessagesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const sellerId = useSellerSessionStore(s => s.sellerId)
  const setUnreadCount = useSellerMessagesStore(s => s.setUnreadCount)
  const reduced = useReducedMotion()

  const { data: conversations, isLoading, isError, refetch } = useSellerConversations(sellerId)
  const markRead = useMarkSellerConversationRead()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const list = conversations ?? []

  const unreadTotal = useMemo(
    () => list.reduce((s, c) => s + c.unreadCount, 0),
    [list],
  )
  useEffect(() => { setUnreadCount(unreadTotal) }, [unreadTotal, setUnreadCount])

  const sorted = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    let result = list
    if (q) {
      result = result.filter(c =>
        c.participantName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.orderRef ?? '').toLowerCase().includes(q) ||
        (c.productName ?? '').toLowerCase().includes(q),
      )
    }
    if (filter === 'unread') result = result.filter(c => c.unreadCount > 0)
    else if (filter === 'order') result = result.filter(c => c.contextType === 'order')
    else if (filter === 'product') result = result.filter(c => c.contextType === 'product')
    return [...result].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    )
  }, [list, debouncedSearch, filter])

  const handleFilter = useCallback((key: FilterKey) => {
    if (!reduced) {
      LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'))
    }
    setFilter(key)
  }, [reduced])

  const handleOpen = useCallback((convo: Conversation) => {
    if (convo.unreadCount > 0) {
      markRead.mutate(convo.id)
    }
    router.push(`/messages/${convo.id}`)
  }, [markRead, router])

  if (!isLoggedIn) {
    return (
      <Screen noScroll safeArea>
        <View style={styles.signInWrap}>
          <Text style={{ fontSize: 48 }}>{'\u{1F512}'}</Text>
          <Text style={styles.signInTitle}>{t('seller.messages.signInPrompt')}</Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.replace('/onboarding')}
            accessibilityRole="button"
            accessibilityLabel={t('seller.messages.signIn')}
          >
            <Text style={styles.signInBtnText}>{t('seller.messages.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    )
  }

  if (isError && !isLoading) {
    return (
      <Screen noScroll safeArea>
        <View style={styles.errorWrap}>
          <Text style={{ fontSize: 48 }}>{'\u{26A0}'}</Text>
          <Text style={styles.errorTitle}>{t('seller.messages.errorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('seller.messages.errorSubtitle')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel={t('seller.messages.retry')}
          >
            <Text style={styles.retryBtnText}>{t('seller.messages.retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    )
  }

  return (
    <Screen noScroll safeArea>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{t('seller.messages.title')}</Text>
        <Text style={styles.subtitle}>{t('seller.messages.subtitle')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('seller.messages.search')}
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel={t('seller.messages.searchAria')}
          inputMode="search"
          returnKeyType="search"
        />
      </View>

      <View style={styles.chipsRow}>
        <FilterChip
          label={t('seller.messages.filterAll')}
          active={filter === 'all'}
          onPress={() => handleFilter('all')}
          ariaLabel={t('seller.messages.filterAllAria')}
        />
        <FilterChip
          label={t('seller.messages.filterUnread')}
          active={filter === 'unread'}
          onPress={() => handleFilter('unread')}
          ariaLabel={t('seller.messages.filterUnreadAria')}
        />
        <FilterChip
          label={t('seller.messages.filterOrders')}
          active={filter === 'order'}
          onPress={() => handleFilter('order')}
          ariaLabel={t('seller.messages.filterOrdersAria')}
        />
        <FilterChip
          label={t('seller.messages.filterProducts')}
          active={filter === 'product'}
          onPress={() => handleFilter('product')}
          ariaLabel={t('seller.messages.filterProductsAria')}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonWrap} accessibilityRole="none" accessibilityState={{ busy: true }} accessibilityLabel={t('seller.messages.loading')}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={40} height={40} circle />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="85%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>{'\u{1F4AC}'}</Text>}
          title={list.length === 0 ? t('seller.messages.emptyTitle') : t('seller.messages.emptyFilteredTitle')}
          subtitle={list.length === 0 ? t('seller.messages.emptySubtitle') : t('seller.messages.emptyFilteredSubtitle')}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: spacing[4] }}
          onContentSizeChange={() => {
            if (!reduced) {
              LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'))
            }
          }}
          renderItem={({ item }) => (
            <ConversationRow convo={item} onTap={() => handleOpen(item)} />
          )}
        />
      )}
    </Screen>
  )
}

function FilterChip({
  label,
  active,
  onPress,
  ariaLabel,
}: {
  label: string
  active: boolean
  onPress: () => void
  ariaLabel: string
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ pressed: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ConversationRow({ convo, onTap }: { convo: Conversation; onTap: () => void }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isUnread = convo.unreadCount > 0
  const scale = useSharedValue(1)

  const handlePressIn = () => { if (!reduced) scale.value = withTiming(0.98, { duration: 100 }) }
  const handlePressOut = () => { if (!reduced) scale.value = withSpring(1, { damping: 15, stiffness: 400 }) }

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const contextLabel = useMemo(() => {
    if (convo.contextType === 'order' && convo.orderRef) return t('seller.messages.contextOrder', { ref: convo.orderRef })
    if (convo.contextType === 'product' && convo.productName) return `${t('seller.messages.contextProduct')} · ${convo.productName}`
    if (convo.contextType === 'general') return t('seller.messages.contextGeneral')
    return null
  }, [convo, t])

  const ariaLabel = `${convo.participantName}. ${convo.lastMessage}. ${formatTime(convo.lastMessageAt, t)}${isUnread ? `. ${t('seller.messages.unreadAria', { count: convo.unreadCount })}` : ''}${contextLabel ? `. ${contextLabel}` : ''}`

  const handlePress = () => {
    try { AccessibilityInfo.announceForAccessibility(isUnread ? t('seller.messages.unreadAria', { count: convo.unreadCount }) : '') } catch {}
    onTap()
  }

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.row, isUnread && styles.rowUnread]}
        activeOpacity={0.8}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {convo.participantName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.rowHeader}>
            <Text
              style={[styles.name, isUnread && styles.nameUnread]}
              numberOfLines={1}
            >
              {convo.participantName}
            </Text>
            <Text style={styles.time}>{formatTime(convo.lastMessageAt, t)}</Text>
          </View>
          <View style={styles.rowFooter}>
            <Text style={styles.preview} numberOfLines={1}>{convo.lastMessage}</Text>
            {isUnread ? (
              <View style={styles.unreadBadge}>
                <Text
                  style={styles.unreadBadgeText}
                  accessibilityLabel={t('seller.messages.unreadAria', { count: convo.unreadCount })}
                >
                  {convo.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
          {contextLabel ? (
            <View style={styles.contextChip}>
              <Text style={styles.contextChipText} numberOfLines={1}>{contextLabel}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

function formatTime(iso: string, t: (k: string, o?: any) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('seller.messages.timeNow')
  if (mins < 60) return t('seller.messages.timeMinutesAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('seller.messages.timeHoursAgo', { count: hrs })
  const days = Math.floor(hrs / 24)
  return t('seller.messages.timeDaysAgo', { count: days })
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    height: 40,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  searchIcon: { fontSize: 14, color: colors.textTertiary },
  searchInput: { flex: 1, fontSize: fontSize.base[0], color: colors.text, padding: 0 },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 32,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm[0],
    fontWeight: '500',
    color: colors.text,
  },
  chipTextActive: { color: colors.white },
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  rowUnread: {
    backgroundColor: PLUM_4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  body: { flex: 1, minWidth: 0 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '400',
    color: colors.text,
    flex: 1,
  },
  nameUnread: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  time: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginLeft: spacing[2],
    flexShrink: 0,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginTop: 2,
  },
  preview: {
    flex: 1,
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1.5],
    flexShrink: 0,
  },
  unreadBadgeText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
  contextChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    marginTop: 4,
  },
  contextChipText: {
    fontSize: fontSize.xs[0],
    fontWeight: '500',
    color: colors.textMuted,
  },
  signInWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] },
  signInTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  signInBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  signInBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.base[0] },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  errorSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  retryBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.base[0] },
})
