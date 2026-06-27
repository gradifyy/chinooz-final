import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, SegmentedControl, EmptyState, Skeleton, Avatar, useReducedMotion } from '@chinooz/ui'
import {
  useNotifications,
  useConversations,
  useMessages,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useSendMessage,
  useMarkConversationRead,
} from '@chinooz/hooks'
import { useInboxStore } from '@chinooz/state'
import { useSessionStore } from '@chinooz/state'
import { assistantService, type AssistantMessage, SUGGESTED_PROMPTS } from '@chinooz/mock-data'
import { colors, spacing, radii, fontSize, fontFamily, duration, easing } from '@chinooz/theme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  useAnimatedReaction,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import type { InboxTab } from '@chinooz/types'
import type { Notification, NotificationType, Conversation, Message, MessageStatus } from '@chinooz/types'

const TAB_KEYS: InboxTab[] = ['notifications', 'messages', 'assistant']

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export default function InboxScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ tab?: string; thread?: string }>()
  const { activeTab, setActiveTab, setNotifUnread, setMsgUnread } = useInboxStore()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const initialized = useRef(false)
  const [isOffline, setIsOffline] = useState(false)

  const { data: notifications, isLoading: loadingNotifs, isError: errorNotifs, refetch: refetchNotifs } = useNotifications()
  const { data: conversations, isLoading: loadingConvos, isError: errorConvos, refetch: refetchConvos } = useConversations()

  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const NetInfo = require('@react-native-community/netinfo').default
      const unsub = NetInfo.addEventListener((s: any) => {
        setIsOffline(!(s.isConnected && s.isInternetReachable !== false))
      })
      return () => unsub()
    } else {
      const off = () => setIsOffline(true)
      const on = () => setIsOffline(false)
      setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine)
      window.addEventListener('offline', off)
      window.addEventListener('online', on)
      return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
    }
  }, [])

  const notifUnread = useMemo(
    () => (notifications ?? []).filter(n => !n.read).length,
    [notifications],
  )
  const msgUnread = useMemo(
    () => (conversations ?? []).reduce((s, c) => s + c.unreadCount, 0),
    [conversations],
  )

  useEffect(() => { setNotifUnread(notifUnread) }, [notifUnread])
  useEffect(() => { setMsgUnread(msgUnread) }, [msgUnread])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (params.tab && TAB_KEYS.includes(params.tab as InboxTab)) {
      setActiveTab(params.tab as InboxTab)
    }
  }, [params.tab])

  const segments = useMemo(
    () => [
      { key: 'notifications', label: t('inbox.notifications'), badge: notifUnread },
      { key: 'messages', label: t('inbox.messages'), badge: msgUnread },
      { key: 'assistant', label: t('inbox.assistant'), badge: 0 },
    ],
    [t, notifUnread, msgUnread],
  )

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key as InboxTab)
      router.setParams({ tab: key })
    },
    [setActiveTab, router],
  )

  return (
    <Screen noScroll safeArea>
      <View style={styles.header}>
        <Text style={styles.title}>{t('inbox.title')}</Text>
      </View>
      <SegmentedControl
        segments={segments}
        activeKey={activeTab}
        onChange={handleTabChange}
        testID="inbox-segment-control"
      />
      <View style={styles.content}>
        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications ?? []}
            isLoading={loadingNotifs}
            isError={errorNotifs}
            isLoggedIn={isLoggedIn}
            isOffline={isOffline}
            onRetry={refetchNotifs}
            onSignIn={() => router.push('/phone-entry')}
          />
        )}
        {activeTab === 'messages' && (
          <MessagesView
            conversations={conversations ?? []}
            isLoading={loadingConvos}
            isError={errorConvos}
            isLoggedIn={isLoggedIn}
            isOffline={isOffline}
            onRetry={refetchConvos}
            onSignIn={() => router.push('/phone-entry')}
            threadId={params.thread}
          />
        )}
        {activeTab === 'assistant' && (
          <AssistantView threadId={params.thread} />
        )}
      </View>
    </Screen>
  )
}

function NotificationsView({
  notifications,
  isLoading,
  isError,
  isLoggedIn,
  isOffline,
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
        icon={<Text style={{ fontSize: 48 }}>{'\u{2728}'}</Text>}
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
              <Text style={styles.markAllBtn}>{t('inbox.markAllRead')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('inbox.settings')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.gearIcon}>{'\u2699'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notifHeader}>
            <View />
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('inbox.settings')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.gearIcon}>{'\u2699'}</Text>
            </TouchableOpacity>
          </View>
        )
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
  index,
  cascadePhase,
  onTap,
  onDismiss,
}: {
  notif: Notification
  index: number
  cascadePhase: boolean
  onTap: (n: Notification) => void
  onDismiss: (id: string) => void
}) {
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
          <Text style={styles.deleteIcon}>{'\u{1F5D1}'}</Text>
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
                <Text style={{ fontSize: 16, color: iconColor }}>{notifTypeIcon(notif.type)}</Text>
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

function MessagesView({
  conversations,
  isLoading,
  isError,
  isLoggedIn,
  isOffline,
  onRetry,
  onSignIn,
  threadId,
}: {
  conversations: Conversation[]
  isLoading: boolean
  isError: boolean
  isLoggedIn: boolean
  isOffline: boolean
  onRetry: () => void
  onSignIn: () => void
  threadId?: string
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedConvo, setSelectedConvo] = useState<string | null>(threadId ?? null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (threadId) setSelectedConvo(threadId)
  }, [threadId])

  const sorted = useMemo(() => {
    const filtered = search.trim()
      ? conversations.filter(c =>
          c.participantName.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase())
        )
      : conversations
    return [...filtered].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }, [conversations, search])

  if (selectedConvo) {
    const convo = conversations.find(c => c.id === selectedConvo)
    return (
      <ThreadView
        conversationId={selectedConvo}
        conversations={conversations}
        isOffline={isOffline}
        onBack={() => setSelectedConvo(null)}
      />
    )
  }

  if (!isLoggedIn) {
    return <SignInPrompt t={t} onSignIn={onSignIn} />
  }

  if (isError && !isLoading) {
    return <ErrorState t={t} onRetry={onRetry} />
  }

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap} accessibilityRole="none" accessibilityLabel={t('inbox.loadingMessages')} accessibilityState={{ busy: true }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={48} height={48} circle />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="80%" height={12} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>{'\u{1F4AC}'}</Text>}
        title={t('inbox.noMessages')}
        subtitle={t('inbox.noMessagesNudge')}
        action={{ label: t('inbox.browseProducts'), onPress: () => router.push('/') }}
      />
    )
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom: spacing[4] }}
      ListHeaderComponent={
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('inbox.searchConversations')}
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel={t('inbox.searchConversations')}
          />
        </View>
      }
      renderItem={({ item }) => (
        <ConversationRow
          convo={item}
          onTap={() => setSelectedConvo(item.id)}
        />
      )}
    />
  )
}

function ConversationRow({
  convo,
  onTap,
}: {
  convo: Conversation
  onTap: () => void
}) {
  const { t } = useTranslation()
  const scale = useSharedValue(1)
  const isUnread = convo.unreadCount > 0

  const handlePressIn = () => { scale.value = withTiming(0.98, { duration: 100 }) }
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }) }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.convoItem, isUnread && styles.convoUnread]}
        activeOpacity={0.8}
        onPress={onTap}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${convo.participantName}. ${convo.lastMessage}. ${formatTime(convo.lastMessageAt, t)}${isUnread ? `. ${convo.unreadCount} unread` : ''}`}
      >
        <View style={styles.convoAvatar}>
          <Text style={styles.convoAvatarText}>
            {convo.participantName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.convoHeader}>
            <Text style={[styles.convoName, isUnread && styles.convoNameUnread]} numberOfLines={1}>
              {convo.participantName}
            </Text>
            <Text style={styles.convoTime}>
              {formatTime(convo.lastMessageAt, t)}
            </Text>
          </View>
          <Text style={styles.convoPreview} numberOfLines={1}>
            {convo.lastMessage}
          </Text>
        </View>
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText} accessibilityLabel={`${convo.unreadCount} unread`}>
              {convo.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

function ThreadView({
  conversationId,
  conversations,
  isOffline,
  onBack,
}: {
  conversationId: string
  conversations: Conversation[]
  isOffline?: boolean
  onBack: () => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: serverMessages, isLoading } = useMessages(conversationId)
  const sendMessageMutation = useSendMessage()
  const markReadMutation = useMarkConversationRead()
  const convo = conversations.find(c => c.id === conversationId)
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [loadEarlier, setLoadEarlier] = useState(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const scale = useSharedValue(1)

  useEffect(() => {
    if (serverMessages) setLocalMessages(serverMessages)
  }, [serverMessages])

  useEffect(() => {
    markReadMutation.mutate(conversationId)
  }, [conversationId])

  const grouped = useMemo(() => groupMessagesByDay(localMessages, t), [localMessages, t])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    const newMsg: Message = {
      id: `msg-optimistic-${Date.now()}`,
      conversationId,
      senderId: 'user-1',
      senderName: 'You',
      body: trimmed,
      createdAt: new Date().toISOString(),
      read: false,
      status: isOffline ? 'sending' : 'sent',
    }
    setLocalMessages(prev => [...prev, newMsg])
    setInput('')
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)

    if (isOffline) {
      try {
        const queue = JSON.parse(localStorage.getItem('chinooz-offline-queue') || '[]')
        queue.push({ conversationId, body: trimmed, createdAt: newMsg.createdAt })
        localStorage.setItem('chinooz-offline-queue', JSON.stringify(queue))
      } catch {}
      return
    }

    sendMessageMutation.mutate({ conversationId, body: trimmed })

    const delay = 1500 + Math.random() * 1500
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const reply: Message = {
        id: `msg-reply-${Date.now()}`,
        conversationId,
        senderId: 'seller-1',
        senderName: convo?.participantName ?? 'Seller',
        body: mockReply(trimmed),
        createdAt: new Date().toISOString(),
        read: false,
        status: 'delivered',
      }
      setLocalMessages(prev => [...prev, reply])
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }, delay)
  }, [input, conversationId, convo])

  const handleLoadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => {
      setLoadEarlier(false)
      setLoadingEarlier(false)
    }, 1200)
  }, [])

  const handlePressIn = () => { scale.value = withTiming(0.95, { duration: 100 }) }
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }) }
  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap} accessibilityRole="none" accessibilityLabel={t('inbox.loadingThread')} accessibilityState={{ busy: true }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.skeletonRow, { justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }]}>
            <Skeleton width="60%" height={36} borderRadius={18} />
          </View>
        ))}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {isOffline && <InboxOfflineBanner t={t} />}
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ fontSize: 18 }}>{'\u{2190}'}</Text>
        </TouchableOpacity>
        <View style={styles.threadAvatar}>
          <Text style={styles.threadAvatarText}>
            {(convo?.participantName ?? 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.threadName} numberOfLines={1}>{convo?.participantName ?? conversationId}</Text>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={t('inbox.store')}
          >
            <Text style={styles.storeLink}>{t('inbox.store')} {'\u{203A}'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={grouped}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[2] }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          loadEarlier ? (
            <TouchableOpacity
              style={styles.loadEarlierBtn}
              onPress={handleLoadEarlier}
              disabled={loadingEarlier}
            >
              {loadingEarlier ? (
                <View style={{ gap: spacing[2] }}>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <View key={i} style={[styles.skeletonRow, { justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }]}>
                      <Skeleton width="50%" height={32} borderRadius={16} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.loadEarlierText}>{t('inbox.loadEarlier')}</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'separator') {
            return (
              <View style={styles.daySeparator}>
                <View style={styles.dayLine} />
                <Text style={styles.dayText}>{item.label}</Text>
                <View style={styles.dayLine} />
              </View>
            )
          }
          const msg = item as MessageItem
          const isMine = msg.senderId === 'user-1'
          return <BubbleRow msg={msg} isMine={isMine} router={router} />
        }}
        ListFooterComponent={typing ? <TypingIndicator /> : null}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          accessibilityRole="button"
          accessibilityLabel={t('inbox.attachImage')}
        >
          <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u{1F4CE}'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.chatInput}
          placeholder={t('inbox.typeMessage')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          accessibilityLabel={t('inbox.typeMessage')}
        />
        <Animated.View style={sendBtnStyle}>
          <TouchableOpacity
            onPress={handleSend}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.5 }]}
            disabled={!input.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('inbox.send')}
          >
            <Text style={{ fontSize: 16, color: colors.white }}>{'\u{27A4}'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

type MessageItem = Message & { type?: 'message' }
type GroupedItem = MessageItem | { id: string; type: 'separator'; label: string }

function groupMessagesByDay(messages: Message[], t: (k: string, o?: any) => string): GroupedItem[] {
  const result: GroupedItem[] = []
  let lastDay = ''
  for (const msg of messages) {
    const day = dayLabel(msg.createdAt, t)
    if (day !== lastDay) {
      result.push({ id: `sep-${day}`, type: 'separator', label: day })
      lastDay = day
    }
    result.push({ ...msg, type: 'message' } as MessageItem)
  }
  return result
}

function dayLabel(iso: string, t: (k: string, o?: any) => string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < MS_DAY && d.getDate() === now.getDate()) return t('inbox.today')
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return t('inbox.yesterday')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function BubbleRow({ msg, isMine, router }: { msg: Message; isMine: boolean; router: any }) {
  if (isMine && msg.status === 'sending') {
    return <PendingBubble text={msg.body} />
  }

  const reduced = useReducedMotion()
  const bubbleScale = useSharedValue(reduced ? 1 : 0.9)
  const bubbleOpacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    bubbleScale.value = withSpring(1, { damping: 15, stiffness: 300 })
    bubbleOpacity.value = withTiming(1, { duration: duration.fast })
  }, [])

  const bubbleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleOpacity.value,
  }))

  const time = new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <Animated.View style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[2] }, bubbleAnim]}>
      {msg.productId ? (
        <TouchableOpacity
          style={[styles.productCard, isMine && { alignSelf: 'flex-end' }]}
          onPress={() => router.push(`/product/${msg.productId}`)}
          accessibilityRole="button"
          accessibilityLabel={`${msg.productName}. NPR ${msg.productPrice?.toLocaleString()}`}
        >
          <View style={styles.productCardImg}>
            <Text style={{ fontSize: 20 }}>{'\u{1F4E6}'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productCardName} numberOfLines={1}>{msg.productName}</Text>
            <Text style={styles.productCardPrice}>NPR {msg.productPrice?.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && { color: colors.white }]}>{msg.body}</Text>
      </View>
      <View style={[styles.bubbleMeta, isMine && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.bubbleTime}>{time}</Text>
        {isMine && msg.status && (
          <Text style={[styles.tick, msg.status === 'read' && styles.tickRead]}>
            {msg.status === 'read' ? '\u{2713}\u{2713}' : '\u{2713}'}
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

function TypingIndicator() {
  const reduced = useReducedMotion()
  const dot1 = useSharedValue(0)
  const dot2 = useSharedValue(0)
  const dot3 = useSharedValue(0)

  useEffect(() => {
    if (reduced) return
    const bounce = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(delay, withRepeat(withSequence(
        withTiming(-6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ), -1, true))
    }
    bounce(dot1, 0)
    bounce(dot2, 150)
    bounce(dot3, 300)
  }, [])

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }))
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }))
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }))

  return (
    <View style={styles.typingWrap}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, s1]} />
        <Animated.View style={[styles.typingDot, s2]} />
        <Animated.View style={[styles.typingDot, s3]} />
      </View>
    </View>
  )
}

const MOCK_REPLIES = [
  'Thanks for reaching out! Let me check on that for you.',
  'Sure, I can help with that. Give me a moment.',
  'That is a great question! The answer is yes.',
  'I will get back to you shortly with more details.',
  'Absolutely! We offer that service.',
]

function mockReply(_input: string): string {
  return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
}

function AssistantView({ threadId }: { threadId?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const sendScale = useSharedValue(1)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('chinooz-assistant') : null
      if (stored) {
        setMessages(JSON.parse(stored))
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (loaded.current && messages.length > 0) {
      try { localStorage.setItem('chinooz-assistant', JSON.stringify(messages)) } catch {}
    }
  }, [messages])

  const handleSend = useCallback(async (text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || thinking) return
    setInput('')

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      from: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)

    setThinking(true)
    try {
      const reply = await assistantService.sendMessage(trimmed)
      setMessages(prev => [...prev, reply])
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        from: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      }])
    }
    setThinking(false)
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }, [input, thinking])

  const handleClear = useCallback(() => {
    setMessages([])
    setShowClearDialog(false)
    try { localStorage.removeItem('chinooz-assistant') } catch {}
  }, [])

  const handlePressIn = () => { if (!reduced) sendScale.value = withTiming(0.95, { duration: duration.fast }) }
  const handlePressOut = () => { if (!reduced) sendScale.value = withSpring(1, { damping: 15, stiffness: 400 }) }
  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }))

  const showIntro = messages.length === 0

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.assistantHeader}>
        <View style={styles.assistantAvatar}>
          <Text style={{ fontSize: 20 }}>{'\u{1F916}'}</Text>
        </View>
        <Text style={styles.threadName}>{t('inbox.assistant')}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => setShowClearDialog(true)}
          accessibilityRole="button"
          accessibilityLabel={t('inbox.clearConversation')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u{1F5D1}'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[2] }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          showIntro ? (
            <View style={styles.introWrap}>
              <View style={styles.introAvatar}>
                <Text style={{ fontSize: 24 }}>{'\u{1F916}'}</Text>
              </View>
              <Text style={styles.introGreeting}>{t('inbox.assistantGreeting')}</Text>
              <View style={styles.chipsWrap}>
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <SuggestionChip
                    key={p.key}
                    label={t(`inbox.suggested${p.key.charAt(0).toUpperCase() + p.key.slice(1)}`)}
                    delay={i * 50}
                    onPress={() => handleSend(p.label)}
                  />
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AssistantBubble msg={item} router={router} t={t} />
        )}
        ListFooterComponent={thinking ? <TypingIndicator /> : null}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder={t('inbox.typeMessage')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          multiline
          maxLength={1000}
          accessibilityLabel={t('inbox.typeMessage')}
        />
        <Animated.View style={sendBtnStyle}>
          <TouchableOpacity
            onPress={() => handleSend()}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.5 }]}
            disabled={!input.trim() || thinking}
            accessibilityRole="button"
            accessibilityLabel={t('inbox.send')}
          >
            <Text style={{ fontSize: 16, color: colors.white }}>{'\u{27A4}'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {showClearDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>{t('inbox.clearConversation')}</Text>
            <Text style={styles.dialogBody}>{t('inbox.clearConfirm')}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setShowClearDialog(false)} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnCancel}>{t('inbox.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClear} style={[styles.dialogBtn, styles.dialogBtnDanger]}>
                <Text style={styles.dialogBtnDangerText}>{t('inbox.clear')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

function SuggestionChip({ label, delay, onPress }: { label: string; delay: number; onPress: () => void }) {
  const reduced = useReducedMotion()
  const scale = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }))
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const pressIn = () => { if (!reduced) scale.value = withTiming(0.97, { duration: duration.fast }) }
  const pressOut = () => { if (!reduced) scale.value = withSpring(1, { damping: 15, stiffness: 400 }) }

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.chip}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.chipText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

function AssistantBubble({ msg, router, t }: { msg: AssistantMessage; router: any; t: (k: string) => string }) {
  const isMine = msg.from === 'user'
  const reduced = useReducedMotion()
  const bubbleScale = useSharedValue(reduced ? 1 : 0.9)
  const bubbleOpacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    bubbleScale.value = withSpring(1, { damping: 15, stiffness: 300 })
    bubbleOpacity.value = withTiming(1, { duration: duration.slow })
  }, [])

  const bubbleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleOpacity.value,
  }))

  return (
    <Animated.View style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[3] }, bubbleAnim]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.assistantBubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && { color: colors.white }]}>{msg.text}</Text>
      </View>

      {msg.products && msg.products.length > 0 && (
        <FlatList
          horizontal
          data={msg.products}
          keyExtractor={p => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], paddingHorizontal: spacing[1], marginTop: spacing[2] }}
          renderItem={({ item: p }) => (
            <TouchableOpacity
              style={styles.carouselCard}
              onPress={() => router.push(`/product/${p.slug}`)}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}. NPR ${p.price.toLocaleString()}`}
            >
              <View style={styles.carouselImg}>
                <Text style={{ fontSize: 24 }}>{'\u{1F4E6}'}</Text>
              </View>
              <Text style={styles.carouselName} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.carouselPrice}>NPR {p.price.toLocaleString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {msg.quickLinks && msg.quickLinks.length > 0 && (
        <View style={styles.quickLinksWrap}>
          {msg.quickLinks.map((link, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickLinkChip}
              onPress={() => router.push(link.route)}
              accessibilityRole="button"
              accessibilityLabel={link.label}
            >
              <Text style={styles.quickLinkText}>{link.label} {'\u{203A}'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {msg.actions && msg.actions.length > 0 && (
        <View style={styles.actionsWrap}>
          {msg.actions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionBtn}
              onPress={() => {
                if (action.type === 'view_product' && action.productId) router.push(`/product/${action.productId}`)
                else if (action.type === 'open_deals') router.push('/deals')
                else if (action.type === 'open_orders') router.push('/orders')
                else if (action.type === 'open_categories') router.push('/categories')
              }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={styles.actionBtnText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  )
}

function SignInPrompt({ t, onSignIn }: { t: (k: string) => string; onSignIn: () => void }) {
  return (
    <View style={styles.signInWrap}>
      <Text style={{ fontSize: 48 }}>{'\u{1F512}'}</Text>
      <Text style={styles.signInTitle}>{t('inbox.signInPrompt')}</Text>
      <TouchableOpacity style={styles.signInBtn} onPress={onSignIn} accessibilityRole="button" accessibilityLabel={t('inbox.signIn')}>
        <Text style={styles.signInBtnText}>{t('inbox.signIn')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function ErrorState({ t, onRetry }: { t: (k: string) => string; onRetry: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Text style={{ fontSize: 48 }}>{'\u{26A0}'}</Text>
      <Text style={styles.errorTitle}>{t('inbox.errorTitle')}</Text>
      <Text style={styles.errorSubtitle}>{t('inbox.errorSubtitle')}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('inbox.retry')}>
        <Text style={styles.retryBtnText}>{t('inbox.retry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function InboxOfflineBanner({ t }: { t: (k: string) => string }) {
  const opacity = useSharedValue(0)
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 })
  }, [])
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View style={[styles.offlineBanner, animStyle]}>
      <View style={styles.offlineDot} />
      <Text style={styles.offlineText}>{t('inbox.offlineBanner')}</Text>
    </Animated.View>
  )
}

function PendingBubble({ text }: { text: string }) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0.5)
  useEffect(() => {
    if (reduced) return
    opacity.value = withRepeat(withSequence(
      withTiming(1, { duration: 750 }),
      withTiming(0.5, { duration: 750 }),
    ), -1, true)
  }, [])
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <View style={{ alignItems: 'flex-end', marginBottom: spacing[2] }}>
      <View style={[styles.bubble, styles.bubbleMine]}>
        <Text style={[styles.bubbleText, { color: colors.white }]}>{text}</Text>
      </View>
      <Animated.View style={[styles.bubbleMeta, { flexDirection: 'row-reverse' }, animStyle]}>
        <Text style={styles.pendingText}>{'\u{23F3}'} Pending</Text>
      </Animated.View>
    </View>
  )
}

const MS_HOUR = 3600000
const MS_DAY = 86400000

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

function notifTypeIcon(type: NotificationType): string {
  switch (type) {
    case 'order': return '\u{1F4E6}'
    case 'promo': return '\u{1F381}'
    case 'price_drop': return '\u{1F4C9}'
    case 'system': return '\u{2139}'
    case 'message': return '\u{1F4AC}'
    default: return '\u{1F514}'
  }
}

function notifTypeBg(type: NotificationType): string {
  switch (type) {
    case 'order': return colors.infoLight
    case 'promo': return '#FEF3C7'
    case 'price_drop': return colors.successLight
    case 'system': return colors.borderLight
    case 'message': return colors.infoLight
    default: return colors.borderLight
  }
}

function notifTypeColor(type: NotificationType): string {
  switch (type) {
    case 'order': return colors.info
    case 'promo': return colors.gold
    case 'price_drop': return colors.success
    case 'system': return colors.textMuted
    case 'message': return colors.info
    default: return colors.textMuted
  }
}

function formatTime(iso: string, t?: (k: string, o?: any) => string): string {
  const now = Date.now()
  const diff = now - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t ? t('inbox.timeNow') : 'now'
  if (mins < 60) return t ? t('inbox.timeMinutesAgo', { count: mins }) : `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t ? t('inbox.timeHoursAgo', { count: hrs }) : `${hrs}h`
  const days = Math.floor(hrs / 24)
  return t ? t('inbox.timeDaysAgo', { count: days }) : `${days}d`
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
  content: {
    flex: 1,
  },
  skeletonWrap: {
    padding: spacing[4],
    gap: spacing[4],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  markAllBtn: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  gearIcon: {
    fontSize: 20,
    color: colors.textMuted,
  },
  groupHeader: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1.5],
    backgroundColor: colors.background,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  deleteIcon: {
    fontSize: 20,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  notifUnread: {
    backgroundColor: colors.white,
  },
  unreadDot: {
    position: 'absolute',
    left: spacing[4] - 4,
    top: spacing[3] + 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
  },
  notifTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  notifBody: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: fontSize.base[1],
  },
  notifTime: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: spacing[0.5],
    flexShrink: 0,
  },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  convoUnread: {
    backgroundColor: colors.white,
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoAvatarText: {
    fontSize: 16,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  convoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoName: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '400',
    color: colors.text,
    flex: 1,
  },
  convoNameUnread: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  convoTime: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginLeft: spacing[2],
  },
  convoPreview: {
    fontSize: fontSize.base[0],
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
  searchIcon: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base[0],
    color: colors.text,
    padding: 0,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1.5],
  },
  unreadBadgeText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarText: {
    fontSize: 12,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  threadName: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  storeLink: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '500',
    color: colors.primary,
    marginTop: 1,
  },
  loadEarlierBtn: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  loadEarlierText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginVertical: spacing[3],
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dayText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radii.sm,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomRightRadius: radii.sm,
  },
  bubbleText: {
    fontSize: fontSize.md[0],
    color: colors.text,
    lineHeight: fontSize.md[1],
    fontWeight: '400',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[0.5],
    paddingHorizontal: spacing[1],
  },
  bubbleTime: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontWeight: '400',
  },
  tick: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '400',
  },
  tickRead: {
    color: colors.primary,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[1],
    maxWidth: '75%',
    alignSelf: 'flex-start',
  },
  productCardImg: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  productCardPrice: {
    fontSize: fontSize.sm[0],
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    marginTop: 2,
  },
  typingWrap: {
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  typingBubble: {
    flexDirection: 'row',
    gap: spacing[1.5],
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  attachBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.md[0],
    color: colors.text,
    fontWeight: '400',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introWrap: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[3],
  },
  introAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introGreeting: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '500',
    color: colors.textSecondary,
  },
  assistantBubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    maxWidth: '85%',
  },
  carouselCard: {
    width: 140,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing[2.5],
    gap: spacing[1],
  },
  carouselImg: {
    width: '100%',
    height: 80,
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselName: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  carouselPrice: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  quickLinksWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  quickLinkChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
  },
  quickLinkText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  actionBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dialogBox: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[6],
    marginHorizontal: spacing[8],
    gap: spacing[3],
  },
  dialogTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  dialogBody: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    lineHeight: fontSize.base[1],
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  dialogBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
  },
  dialogBtnCancel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textMuted,
  },
  dialogBtnDanger: {
    backgroundColor: colors.error,
  },
  dialogBtnDangerText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
  signInWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[3],
  },
  signInTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  signInBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing[2],
  },
  signInBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing[2],
  },
  errorSubtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing[2],
  },
  retryBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  offlineText: {
    fontSize: 13,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: '#92400E',
  },
  pendingText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontWeight: '400',
  },
})
