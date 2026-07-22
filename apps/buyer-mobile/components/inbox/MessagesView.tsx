import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, type Router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { EmptyState, Skeleton, useReducedMotion } from '@chinooz/ui'
import Icon, { type IconName } from '../../components/Icon'
import { useAppTheme } from '../../components/ThemeProvider'
import {
  useMessages,
  useSendMessage,
  useMarkConversationRead,
} from '@chinooz/hooks'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { fontSz, spacing, springs, duration } from '@chinooz/theme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  type SharedValue,
} from 'react-native-reanimated'
import type { Conversation, Message } from '@chinooz/types'
import { makeStyles, MS_DAY, formatTime, SignInPrompt, ErrorState, InboxOfflineBanner } from './InboxShared'
import { mockReply } from './AssistantView'

export function MessagesView({
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
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
        icon={<Text style={{ fontSize: fontSz('display')[0] }}>{'\u{1F4AC}'}</Text>}
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
          <Icon name="search" size={16} color={colors.textTertiary} />
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
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { t } = useTranslation()
  const scale = useSharedValue(1)
  const isUnread = convo.unreadCount > 0
  const isSeller = convo.contextType === 'order' || convo.contextType === 'product'
  const ctxLabel = convo.contextType === 'order'
    ? (convo.orderRef ? `#${convo.orderRef}` : null)
    : convo.contextType === 'product'
      ? (convo.productName ?? null)
      : null
  const ctxIcon: IconName = convo.contextType === 'product' ? 'pricetag-outline' : 'cube-outline'

  const handlePressIn = () => { scale.value = withTiming(0.98, { duration: 100 }) }
  const handlePressOut = () => { scale.value = withSpring(1, springs.press) }

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
        accessibilityLabel={`${convo.participantName}. ${convo.lastMessage}. ${formatTime(convo.lastMessageAt, t)}${isUnread ? `. ${t('a11y.unreadCount', { count: convo.unreadCount })}` : ''}`}
      >
        <View style={styles.convoAvatarWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.convoAvatar}
          >
            <Text style={styles.convoAvatarText}>
              {convo.participantName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
          {isSeller && (
            <View style={styles.convoVerify}>
              <Icon name="checkmark" size={9} color={colors.white} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.convoHeader}>
            <Text style={[styles.convoName, isUnread && styles.convoNameUnread]} numberOfLines={1}>
              {convo.participantName}
            </Text>
            <Text style={styles.convoTime}>
              {formatTime(convo.lastMessageAt, t)}
            </Text>
          </View>
          <Text style={[styles.convoPreview, isUnread && styles.convoPreviewUnread]} numberOfLines={1}>
            {convo.lastMessage}
          </Text>
          {ctxLabel && (
            <View style={styles.convoCtx}>
              <Icon name={ctxIcon} size={11} color={colors.primary} />
              <Text style={styles.convoCtxText} numberOfLines={1}>{ctxLabel}</Text>
            </View>
          )}
        </View>
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText} accessibilityLabel={t('a11y.unreadCount', { count: convo.unreadCount })}>
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
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
  const wasOffline = useRef(isOffline)

  useEffect(() => {
    if (serverMessages) setLocalMessages(serverMessages)
  }, [serverMessages])

  // Flush any messages queued while offline once connectivity returns.
  useEffect(() => {
    if (wasOffline.current && !isOffline) {
      void (async () => {
        try {
          const raw = await AsyncStorage.getItem('chinooz-offline-queue')
          const queue: { conversationId: string; body: string; createdAt: string }[] = raw ? JSON.parse(raw) : []
          if (queue.length) {
            for (const q of queue) sendMessageMutation.mutate({ conversationId: q.conversationId, body: q.body })
            await AsyncStorage.removeItem('chinooz-offline-queue')
            setLocalMessages(prev => prev.map(m => (m.status === 'sending' ? { ...m, status: 'sent' } : m)))
          }
        } catch (err) { console.error('flush offline queue failed', err) }
      })()
    }
    wasOffline.current = isOffline
  }, [isOffline, sendMessageMutation])

  useEffect(() => {
    markReadMutation.mutate(conversationId)
  }, [conversationId, markReadMutation])

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
      void (async () => {
        try {
          const raw = await AsyncStorage.getItem('chinooz-offline-queue')
          const queue = raw ? JSON.parse(raw) : []
          queue.push({ conversationId, body: trimmed, createdAt: newMsg.createdAt })
          await AsyncStorage.setItem('chinooz-offline-queue', JSON.stringify(queue))
        } catch (err) { console.error('queue offline message failed', err) }
      })()
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
  }, [input, conversationId, convo, isOffline, sendMessageMutation])

  const handleLoadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => {
      setLoadEarlier(false)
      setLoadingEarlier(false)
    }, 1200)
  }, [])

  const handlePressIn = () => { scale.value = withTiming(0.95, { duration: 100 }) }
  const handlePressOut = () => { scale.value = withSpring(1, springs.press) }
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
          <Text style={{ fontSize: fontSz('lg')[0] }}>{'\u{2190}'}</Text>
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
        onContentSizeChange={() => {
          // Debounced scrollToEnd — the raw callback fires on every content
          // change (each keystroke, each message insert) causing layout passes
          // during rapid typing. RequestAnimationFrame batches it to one frame.
          requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: false }))
        }}
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
          <Text style={{ fontSize: fontSz('lg')[0], color: colors.textMuted }}>{'\u{1F4CE}'}</Text>
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
            <Icon name="send" size={17} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

type MessageItem = Message & { type?: 'message' }
type GroupedItem = MessageItem | { id: string; type: 'separator'; label: string }

function groupMessagesByDay(messages: Message[], t: (k: string, o?: Record<string, unknown>) => string): GroupedItem[] {
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

function dayLabel(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < MS_DAY && d.getDate() === now.getDate()) return t('inbox.today')
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return t('inbox.yesterday')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function BubbleRow({ msg, isMine, router }: { msg: Message; isMine: boolean; router: Router }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const reduced = useReducedMotion()
  const bubbleScale = useSharedValue(reduced ? 1 : 0.9)
  const bubbleOpacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    bubbleScale.value = withSpring(1, springs.press)
    bubbleOpacity.value = withTiming(1, { duration: duration.fast })
  }, [bubbleOpacity, bubbleScale, reduced])

  const bubbleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleOpacity.value,
  }))

  if (isMine && msg.status === 'sending') {
    return <PendingBubble text={msg.body} />
  }

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
            <Text style={{ fontSize: fontSz('xl')[0] }}>{'\u{1F4E6}'}</Text>
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

export function TypingIndicator() {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
  }, [dot1, dot2, dot3, reduced])

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

function PendingBubble({ text }: { text: string }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0.5)
  useEffect(() => {
    if (reduced) return
    opacity.value = withRepeat(withSequence(
      withTiming(1, { duration: 750 }),
      withTiming(0.5, { duration: 750 }),
    ), -1, true)
  }, [opacity, reduced])
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
