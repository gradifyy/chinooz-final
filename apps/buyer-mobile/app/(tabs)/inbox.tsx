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
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, SegmentedControl, EmptyState, Skeleton, Avatar } from '@chinooz/ui'
import { useNotifications, useConversations, useMessages } from '@chinooz/hooks'
import { useInboxStore } from '@chinooz/state'
import { colors, spacing, radii, fontSize, fontFamily, duration, easing } from '@chinooz/theme'
import type { InboxTab } from '@chinooz/types'
import type { Notification, Conversation, Message } from '@chinooz/types'

const TAB_KEYS: InboxTab[] = ['notifications', 'messages', 'assistant']

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

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={40} height={40} circle />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="90%" height={12} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>{'\u{1F514}'}</Text>}
        title={t('emptyState.noNotifications')}
        subtitle={t('emptyState.noNotificationsSubtitle')}
      />
    )
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingVertical: spacing[2] }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.notifItem, !item.read && styles.notifUnread]}
          activeOpacity={0.7}
        >
          <View style={styles.notifIcon}>
            <Text style={{ fontSize: 20 }}>
              {notifEmoji(item.type)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )}
    />
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

  useEffect(() => {
    if (threadId) setSelectedConvo(threadId)
  }, [threadId])

  if (selectedConvo) {
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
            <Skeleton width={44} height={44} circle />
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
      data={conversations}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingVertical: spacing[2] }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.convoItem}
          activeOpacity={0.7}
          onPress={() => setSelectedConvo(item.id)}
        >
          <Avatar name={item.participantName} size="md" />
          <View style={{ flex: 1 }}>
            <View style={styles.convoHeader}>
              <Text style={styles.convoName} numberOfLines={1}>
                {item.participantName}
              </Text>
              <Text style={styles.convoTime}>
                {formatTime(item.lastMessageAt)}
              </Text>
            </View>
            <Text style={styles.convoPreview} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
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
  const { data: messages, isLoading } = useMessages(conversationId)
  const convo = conversations.find(c => c.id === conversationId)
  const [input, setInput] = useState('')

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap}>
        {Array.from({ length: 3 }).map((_, i) => (
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
    >
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ fontSize: 18 }}>{'\u{2190}'}</Text>
        </TouchableOpacity>
        <Text style={styles.threadName}>{convo?.participantName ?? conversationId}</Text>
      </View>
      <FlatList
        data={messages ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[2] }}
        renderItem={({ item }) => {
          const isMine = item.senderId === 'user-1'
          return (
            <View
              style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
            >
              <Text style={[styles.bubbleText, isMine && { color: colors.white }]}>
                {item.body}
              </Text>
            </View>
          )
        }}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder={t('inbox.chatPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
        />
      </View>
    </KeyboardAvoidingView>
  )
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

function notifEmoji(type: string): string {
  switch (type) {
    case 'order': return '\u{1F4E6}'
    case 'promo': return '\u{1F381}'
    case 'system': return '\u{2139}'
    case 'message': return '\u{1F4AC}'
    default: return '\u{1F514}'
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
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  notifUnread: {
    backgroundColor: colors.primary50,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  notifBody: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: fontSize.sm[1],
  },
  notifTime: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
    marginTop: spacing[1],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: spacing[1.5],
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
  convoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  convoTime: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
    marginLeft: spacing[2],
  },
  convoPreview: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
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
  threadName: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radii.xl,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.sm,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    borderBottomLeftRadius: radii.sm,
  },
  bubbleText: {
    fontSize: fontSize.base[0],
    color: colors.text,
    lineHeight: fontSize.base[1],
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    fontSize: fontSize.base[0],
    color: colors.text,
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
