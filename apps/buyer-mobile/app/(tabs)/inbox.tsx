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
import { Screen, SegmentedControl, EmptyState, Skeleton, Avatar } from '@chinooz/ui'
import {
  useNotifications,
  useConversations,
  useMessages,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@chinooz/hooks'
import { useInboxStore } from '@chinooz/state'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
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
  const { activeTab, setActiveTab } = useInboxStore()
  const initialized = useRef(false)

  const { data: notifications, isLoading: loadingNotifs } = useNotifications()
  const { data: conversations, isLoading: loadingConvos } = useConversations()

  const notifUnread = useMemo(
    () => (notifications ?? []).filter(n => !n.read).length,
    [notifications],
  )
  const msgUnread = useMemo(
    () => (conversations ?? []).reduce((s, c) => s + c.unreadCount, 0),
    [conversations],
  )

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
          />
        )}
        {activeTab === 'messages' && (
          <MessagesView
            conversations={conversations ?? []}
            isLoading={loadingConvos}
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
}: {
  notifications: Notification[]
  isLoading: boolean
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

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap}>
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
        icon={<Text style={{ fontSize: 48 }}>{'\u{1F514}'}</Text>}
        title={t('emptyState.noNotifications')}
        subtitle={t('emptyState.noNotificationsSubtitle')}
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
        translateX.value = withTiming(-400, { duration: 250 })
        rowHeight.value = withTiming(0, { duration: 250 })
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)(notif.id)
        })
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 })
      }
    })

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }))

  const wrapperStyle = useAnimatedStyle(() => ({
    maxHeight: rowHeight.value === 0 ? withTiming(0, { duration: 250 }) : undefined,
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
              accessibilityLabel={`${notif.title}. ${notif.body}. ${formatTime(notif.createdAt)}`}
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
              <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
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
  threadId,
}: {
  conversations: Conversation[]
  isLoading: boolean
  threadId?: string
}) {
  const { t } = useTranslation()
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
        onBack={() => setSelectedConvo(null)}
      />
    )
  }

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap}>
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
        title={t('emptyState.noMessages')}
        subtitle={t('emptyState.noMessagesSubtitle')}
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
        accessibilityLabel={`${convo.participantName}. ${convo.lastMessage}. ${formatTime(convo.lastMessageAt)}${isUnread ? `. ${convo.unreadCount} unread` : ''}`}
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
              {formatTime(convo.lastMessageAt)}
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
  onBack,
}: {
  conversationId: string
  conversations: Conversation[]
  onBack: () => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: serverMessages, isLoading } = useMessages(conversationId)
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

  const grouped = useMemo(() => groupMessagesByDay(localMessages), [localMessages])

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
      status: 'sent',
    }
    setLocalMessages(prev => [...prev, newMsg])
    setInput('')
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)

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
      <View style={styles.skeletonWrap}>
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

function groupMessagesByDay(messages: Message[]): GroupedItem[] {
  const result: GroupedItem[] = []
  let lastDay = ''
  for (const msg of messages) {
    const day = dayLabel(msg.createdAt)
    if (day !== lastDay) {
      result.push({ id: `sep-${day}`, type: 'separator', label: day })
      lastDay = day
    }
    result.push({ ...msg, type: 'message' } as MessageItem)
  }
  return result
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < MS_DAY && d.getDate() === now.getDate()) return 'today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return 'yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function BubbleRow({ msg, isMine, router }: { msg: Message; isMine: boolean; router: any }) {
  const bubbleScale = useSharedValue(0.9)
  const bubbleOpacity = useSharedValue(0)

  useEffect(() => {
    bubbleScale.value = withSpring(1, { damping: 15, stiffness: 300 })
    bubbleOpacity.value = withTiming(1, { duration: 200 })
  }, [])

  const bubbleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleOpacity.value,
  }))

  const time = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

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
  const dot1 = useSharedValue(0)
  const dot2 = useSharedValue(0)
  const dot3 = useSharedValue(0)

  useEffect(() => {
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
  const [messages, setMessages] = useState<{ id: string; text: string; from: 'user' | 'assistant' }[]>([
    { id: 'greeting', text: t('inbox.chatGreeting'), from: 'assistant' },
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, text: trimmed, from: 'user' },
      { id: `a-${Date.now()}`, text: "I'm a mock assistant. This feature will be connected to a real AI soon!", from: 'assistant' },
    ])
    setInput('')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[2] }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.from === 'user' ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.from === 'user' && { color: colors.white },
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder={t('inbox.chatPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Text style={{ fontSize: 18 }}>{'\u{27A4}'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

function formatTime(iso: string): string {
  const now = Date.now()
  const diff = now - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
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
})
