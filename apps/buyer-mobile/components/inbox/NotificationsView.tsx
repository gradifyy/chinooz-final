import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { EmptyState, Skeleton, useReducedMotion } from '@chinooz/ui'
import Icon, { type IconName } from '../../components/Icon'
import { useAppTheme } from '../../components/ThemeProvider'
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@chinooz/hooks'
import { colors as lightColors, spacing, fontSz, duration } from '@chinooz/theme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import type { Notification, NotificationType } from '@chinooz/types'
import { makeStyles, MS_DAY, formatTime, SignInPrompt, ErrorState } from './InboxShared'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export function NotificationsView({
  notifications,
  isLoading,
  isError,
  isLoggedIn,
  isOffline: _isOffline,
  onRetry,
  onSignIn,
}: {
  notifications: Notification[]
  isLoading: boolean
  isError: boolean
  isLoggedIn: boolean
  isOffline: boolean
  onRetry: () => void
  onSignIn: () => void
}) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { t } = useTranslation()
  const router = useRouter()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const deleteNotif = useDeleteNotification()
  const [localNotifs, setLocalNotifs] = useState(notifications)
  const [cascadePhase, setCascadePhase] = useState(false)

  useEffect(() => { setLocalNotifs(notifications) }, [notifications])

  const groups = useMemo(() => groupNotifications(localNotifs, t), [localNotifs, t])

  const handleTap = useCallback((notif: Notification) => {
    if (!notif.read) {
      markRead.mutate(notif.id)
      setLocalNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    }
    if (notif.link) router.push(notif.link)
  }, [markRead, router])

  const handleMarkAllRead = useCallback(() => {
    setCascadePhase(true)
    const unread = localNotifs.filter(n => !n.read)
    unread.forEach((n, i) => {
      setTimeout(() => {
        setLocalNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      }, i * 50)
    })
    setTimeout(() => {
      markAll.mutate()
      setCascadePhase(false)
    }, unread.length * 50 + 100)
  }, [localNotifs, markAll])

  const handleDismiss = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'))
    setLocalNotifs(prev => prev.filter(n => n.id !== id))
    deleteNotif.mutate(id)
  }, [deleteNotif])

  if (!isLoggedIn) {
    return <SignInPrompt t={t} onSignIn={onSignIn} />
  }

  if (isError && !isLoading) {
    return <ErrorState t={t} onRetry={onRetry} />
  }

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap} accessibilityRole="none" accessibilityLabel={t('inbox.loadingNotifications')} accessibilityState={{ busy: true }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={32} height={32} circle />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="90%" height={12} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (localNotifs.length === 0) {
    return (
      <EmptyState
        icon={<Text style={{ fontSize: fontSz('display')[0] }}>{'\u{2728}'}</Text>}
        title={t('inbox.caughtUp')}
        subtitle={t('inbox.caughtUpSubtitle')}
        action={{ label: t('inbox.browseProducts'), onPress: () => router.push('/') }}
      />
    )
  }

  const hasUnread = localNotifs.some(n => !n.read)

  return (
    <FlatList
      data={groups}
      keyExtractor={item => item.title}
      contentContainerStyle={{ paddingBottom: spacing[4] }}
      ListHeaderComponent={
        hasUnread ? (
          <View style={styles.notifHeader}>
            <TouchableOpacity
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              accessibilityLabel={t('inbox.markAllRead')}
            >
              <View style={styles.markAllRow}>
                <Icon name="checkmark-done" size={15} color={colors.primary} />
                <Text style={styles.markAllBtn}>{t('inbox.markAllRead')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null
      }
      renderItem={({ item: group }) => (
        <View>
          <Text style={styles.groupHeader}>{group.title}</Text>
          {group.items.map((notif, idx) => (
            <NotificationRow
              key={notif.id}
              notif={notif}
              index={idx}
              cascadePhase={cascadePhase}
              onTap={handleTap}
              onDismiss={handleDismiss}
            />
          ))}
        </View>
      )}
    />
  )
}

function NotificationRow({
  notif,
  index: _index,
  cascadePhase: _cascadePhase,
  onTap,
  onDismiss,
}: {
  notif: Notification
  index: number
  cascadePhase: boolean
  onTap: (n: Notification) => void
  onDismiss: (id: string) => void
}) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const translateX = useSharedValue(0)
  const rowHeight = useSharedValue(1)
  const opacity = useSharedValue(1)
  const iconBg = notifTypeBg(notif.type)
  const iconColor = notifTypeColor(notif.type)

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate(e => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -80)
      }
    })
    .onEnd(e => {
      if (e.translationX < -60) {
        if (reduced) {
          translateX.value = -400
          rowHeight.value = 0
          opacity.value = 0
          runOnJS(onDismiss)(notif.id)
        } else {
          translateX.value = withTiming(-400, { duration: duration.normal })
          rowHeight.value = withTiming(0, { duration: duration.normal })
          opacity.value = withTiming(0, { duration: duration.fast }, () => {
            runOnJS(onDismiss)(notif.id)
          })
        }
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 })
      }
    })

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }))

  const wrapperStyle = useAnimatedStyle(() => ({
    maxHeight: rowHeight.value === 0 ? (reduced ? 0 : withTiming(0, { duration: duration.normal })) : undefined,
    overflow: 'hidden',
  }))

  return (
    <Animated.View style={wrapperStyle}>
      <View style={styles.swipeContainer}>
        <View style={styles.swipeAction}>
          <Icon name="trash-outline" size={20} color={colors.white} />
        </View>
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[rowStyle]}>
            <TouchableOpacity
              style={[styles.notifItem, !notif.read && styles.notifUnread]}
              activeOpacity={0.7}
              onPress={() => onTap(notif)}
              accessibilityRole="button"
              accessibilityLabel={`${notif.title}. ${notif.body}. ${formatTime(notif.createdAt, t)}`}
              accessibilityState={{ selected: !notif.read }}
            >
              {!notif.read && <View style={styles.unreadDot} />}
              <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
                <Icon name={notifTypeIcon(notif.type)} size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
              </View>
              <Text style={styles.notifTime}>{formatTime(notif.createdAt, t)}</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  )
}

function groupNotifications(items: Notification[], t: (k: string) => string) {
  const now = Date.now()
  const today: Notification[] = []
  const thisWeek: Notification[] = []
  const earlier: Notification[] = []

  for (const n of items) {
    const diff = now - new Date(n.createdAt).getTime()
    if (diff < MS_DAY) today.push(n)
    else if (diff < 7 * MS_DAY) thisWeek.push(n)
    else earlier.push(n)
  }

  const groups: { title: string; items: Notification[] }[] = []
  if (today.length > 0) groups.push({ title: t('inbox.today'), items: today })
  if (thisWeek.length > 0) groups.push({ title: t('inbox.thisWeek'), items: thisWeek })
  if (earlier.length > 0) groups.push({ title: t('inbox.earlier'), items: earlier })
  return groups
}

function notifTypeIcon(type: NotificationType): IconName {
  switch (type) {
    case 'order': return 'cube-outline'
    case 'promo': return 'pricetag-outline'
    case 'price_drop': return 'trending-down-outline'
    case 'system': return 'notifications-outline'
    case 'message': return 'chatbubble-ellipses-outline'
    default: return 'notifications-outline'
  }
}

function notifTypeBg(type: NotificationType): string {
  switch (type) {
    case 'order': return lightColors.infoLight
    case 'promo': return lightColors.warningLight
    case 'price_drop': return lightColors.successLight
    case 'system': return lightColors.borderLight
    case 'message': return lightColors.infoLight
    default: return lightColors.borderLight
  }
}

function notifTypeColor(type: NotificationType): string {
  switch (type) {
    case 'order': return lightColors.info
    case 'promo': return lightColors.gold
    case 'price_drop': return lightColors.success
    case 'system': return lightColors.textMuted
    case 'message': return lightColors.info
    default: return lightColors.textMuted
  }
}
