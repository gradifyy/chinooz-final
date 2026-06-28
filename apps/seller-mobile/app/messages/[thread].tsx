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
  AccessibilityInfo,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, Skeleton, useReducedMotion } from '@chinooz/ui'
import {
  useSellerConversations,
  useSellerMessages,
  useSendSellerMessage,
  useMarkSellerConversationRead,
} from '@chinooz/hooks'
import { SELLER_REPLY_TEMPLATES, SELLER_QUICK_REPLIES, mockBuyerReply } from '@chinooz/mock-data'
import { colors, spacing, radii, fontSize, fontFamily, duration, easing } from '@chinooz/theme'
import type { Conversation, Message } from '@chinooz/types'
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

export default function SellerThreadScreen() {
  const router = useRouter()
  const { thread } = useLocalSearchParams<{ thread: string }>()
  const { data: conversations } = useSellerConversations()
  const convo = (conversations ?? []).find(c => c.id === thread)

  return (
    <Screen noScroll safeArea>
      <ThreadView conversationId={thread} convo={convo} onBack={() => router.back()} />
    </Screen>
  )
}

function ThreadView({
  conversationId,
  convo,
  onBack,
}: {
  conversationId: string
  convo?: Conversation
  onBack: () => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: serverMessages, isLoading } = useSellerMessages(conversationId)
  const sendMutation = useSendSellerMessage()
  const markRead = useMarkSellerConversationRead()
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [loadEarlier, setLoadEarlier] = useState(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [inputHeight, setInputHeight] = useState(40)
  const flatListRef = useRef<FlatList>(null)
  const reduced = useReducedMotion()
  const sendScale = useSharedValue(1)
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (serverMessages) setLocalMessages(serverMessages) }, [serverMessages])
  useEffect(() => { if (conversationId) markRead.mutate(conversationId) }, [conversationId, markRead])
  useEffect(() => () => { if (replyTimer.current) clearTimeout(replyTimer.current) }, [])

  const grouped = useMemo(() => groupByDay(localMessages, t), [localMessages, t])

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated }))
  }, [])

  const handleSend = useCallback((text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    const optimistic: Message = {
      id: `smsg-opt-${Date.now()}`,
      conversationId,
      senderId: 'seller-1',
      senderName: 'You',
      body: trimmed,
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sent',
    }
    setLocalMessages(prev => [...prev, optimistic])
    setInput('')
    setShowTemplates(false)
    scrollToBottom(true)
    sendMutation.mutate({ conversationId, body: trimmed })

    const delay = 1200 + Math.random() * 1200
    setTyping(true)
    try {
      AccessibilityInfo.announceForAccessibility(
        t('seller.messages.threadTypingGeneric'),
      )
    } catch {}
    if (replyTimer.current) clearTimeout(replyTimer.current)
    replyTimer.current = setTimeout(() => {
      setTyping(false)
      const reply: Message = {
        id: `smsg-reply-${Date.now()}`,
        conversationId,
        senderId: 'buyer-1',
        senderName: convo?.participantName ?? 'Buyer',
        body: mockBuyerReply(trimmed),
        createdAt: new Date().toISOString(),
        read: false,
        status: 'delivered',
      }
      setLocalMessages(prev => [...prev, reply])
      scrollToBottom(true)
    }, delay)
  }, [input, conversationId, sendMutation, convo, scrollToBottom, t])

  const handleLoadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => {
      setLoadEarlier(false)
      setLoadingEarlier(false)
    }, 1200)
  }, [])

  const handlePressIn = () => { if (!reduced) sendScale.value = withTiming(0.9, { duration: duration.fast }) }
  const handlePressOut = () => { if (!reduced) sendScale.value = withSpring(1, { damping: 15, stiffness: 400 }) }
  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }))

  const contextLabel = contextText(convo, t)
  const contextHref = convo?.contextType === 'order' && convo?.orderId
    ? `/orders`
    : convo?.contextType === 'product' && convo?.productId
      ? `/products`
      : null
  const contextAria = contextLabel
    ? t('seller.messages.threadContextAria', { context: contextLabel })
    : undefined

  if (isLoading) {
    return (
      <View style={styles.skeletonWrap} accessibilityRole="none" accessibilityState={{ busy: true }} accessibilityLabel={t('seller.messages.threadLoading')}>
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.threadHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('seller.messages.threadBack')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18 }}>{'\u{2190}'}</Text>
        </TouchableOpacity>
        <View style={styles.threadAvatar}>
          <Text style={styles.threadAvatarText}>
            {(convo?.participantName ?? 'B').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.threadName} numberOfLines={1}>{convo?.participantName ?? conversationId}</Text>
          {contextLabel ? (
            <TouchableOpacity
              onPress={() => { if (contextHref) router.push(contextHref as any) }}
              disabled={!contextHref}
              accessibilityRole="button"
              accessibilityLabel={contextAria}
            >
              <Text style={[styles.threadContext, !!contextHref && styles.threadContextLink]} numberOfLines={1}>
                {contextLabel}{contextHref ? ' \u{203A}' : ''}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={grouped}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[2] }}
        onContentSizeChange={() => scrollToBottom(false)}
        ListHeaderComponent={
          loadEarlier ? (
            <TouchableOpacity
              style={styles.loadEarlierBtn}
              onPress={handleLoadEarlier}
              disabled={loadingEarlier}
              accessibilityRole="button"
              accessibilityLabel={t('seller.messages.threadLoadEarlier')}
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
                <Text style={styles.loadEarlierText}>{t('seller.messages.threadLoadEarlier')}</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        ListFooterComponent={
          typing ? <TypingIndicator name={convo?.participantName} reduced={reduced} t={t} /> : null
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
          const isMine = item.senderId === 'seller-1'
          return <Bubble msg={item} isMine={isMine} reduced={reduced} t={t} />
        }}
      />

      {showTemplates ? (
        <TemplatesSheet
          onClose={() => setShowTemplates(false)}
          onPick={(body) => handleSend(body)}
          t={t}
        />
      ) : null}

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          accessibilityRole="button"
          accessibilityLabel={t('seller.messages.threadAttachAria')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u{1F4CE}'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={() => setShowTemplates(v => !v)}
          accessibilityRole="button"
          accessibilityLabel={t('seller.messages.threadTemplatesAria')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 16, color: colors.primary }}>{'\u{270D}'}</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.chatInput, { height: Math.max(40, Math.min(120, inputHeight)) }]}
          placeholder={t('seller.messages.threadTypeMessage')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onContentSizeChange={e => setInputHeight(e.nativeEvent.contentSize.height)}
          multiline
          maxLength={1000}
          accessibilityLabel={t('seller.messages.threadTypeMessage')}
        />
        <Animated.View style={sendBtnStyle}>
          <TouchableOpacity
            onPress={() => handleSend()}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.5 }]}
            disabled={!input.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('seller.messages.threadSend')}
          >
            <Text style={{ fontSize: 16, color: colors.white }}>{'\u{27A4}'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

function Bubble({ msg, isMine, reduced, t }: { msg: Message; isMine: boolean; reduced: boolean; t: (k: string, o?: any) => string }) {
  const scale = useSharedValue(reduced ? 1 : 0.95)
  const opacity = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
    opacity.value = withTiming(1, { duration: 200 })
  }, [reduced])
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }))
  const time = new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })

  const tickLabel = msg.status === 'read' ? t('seller.messages.threadTickRead')
    : msg.status === 'delivered' ? t('seller.messages.threadTickDelivered')
    : msg.status === 'sent' ? t('seller.messages.threadTickSent')
    : undefined

  const ariaParts = [msg.senderName, msg.body, time]
  if (tickLabel) ariaParts.push(tickLabel)
  const ariaLabel = ariaParts.join('. ')

  return (
    <Animated.View
      style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[2] }, anim]}
      accessibilityLabel={ariaLabel}
    >
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, isMine ? styles.bubbleMineTail : styles.bubbleTheirsTail]}>
        <Text style={[styles.bubbleText, isMine && { color: colors.white }]}>{msg.body}</Text>
      </View>
      <View style={[styles.bubbleMeta, isMine && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.bubbleTime}>{time}</Text>
        {isMine && msg.status ? (
          <Text style={[styles.tick, msg.status === 'read' && styles.tickRead]}>
            {msg.status === 'read' ? '\u{2713}\u{2713}' : '\u{2713}'}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  )
}

function TypingIndicator({ name, reduced, t }: { name?: string; reduced: boolean; t: (k: string, o?: any) => string }) {
  const dot1 = useSharedValue(0)
  const dot2 = useSharedValue(0)
  const dot3 = useSharedValue(0)

  useEffect(() => {
    if (reduced) return
    const bounce = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(delay, withRepeat(withSequence(
        withTiming(-5, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ), -1, true))
    }
    bounce(dot1, 0)
    bounce(dot2, 150)
    bounce(dot3, 300)
  }, [reduced])

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }))
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }))
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }))

  const label = name ? t('seller.messages.threadTyping', { name }) : t('seller.messages.threadTypingGeneric')

  return (
    <View
      style={styles.typingWrap}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, s1]} />
        <Animated.View style={[styles.typingDot, s2]} />
        <Animated.View style={[styles.typingDot, s3]} />
      </View>
    </View>
  )
}

function TemplatesSheet({
  onClose,
  onPick,
  t,
}: {
  onClose: () => void
  onPick: (body: string) => void
  t: (k: string, o?: any) => string
}) {
  return (
    <View style={styles.templatesWrap} accessibilityLabel={t('seller.messages.threadTemplates')}>
      <View style={styles.templatesHeader}>
        <Text style={styles.templatesTitle}>{t('seller.messages.threadTemplates')}</Text>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u{2715}'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.templatesList}>
        {SELLER_QUICK_REPLIES.map(q => (
          <TouchableOpacity
            key={q.id}
            style={styles.templateChip}
            onPress={() => onPick(q.body)}
            accessibilityRole="button"
            accessibilityLabel={q.label}
          >
            <Text style={styles.templateChipText}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.templatesSub}>{t('seller.messages.threadTemplates')}</Text>
      <View style={styles.templatesList}>
        {SELLER_REPLY_TEMPLATES.map(tpl => (
          <TouchableOpacity
            key={tpl.id}
            style={styles.templateRow}
            onPress={() => onPick(tpl.body)}
            accessibilityRole="button"
            accessibilityLabel={tpl.label}
          >
            <Text style={styles.templateLabel}>{tpl.label}</Text>
            <Text style={styles.templateBody} numberOfLines={2}>{tpl.body}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function contextText(c?: Conversation, t?: (k: string, o?: any) => string): string | null {
  if (!c || !t) return null
  if (c.contextType === 'order' && c.orderRef) return t('seller.messages.contextOrder', { ref: c.orderRef })
  if (c.contextType === 'product' && c.productName) return `${t('seller.messages.contextProduct')} · ${c.productName}`
  if (c.contextType === 'general') return t('seller.messages.contextGeneral')
  return null
}

type Grouped = (Message & { type?: 'message' }) | { id: string; type: 'separator'; label: string }

function groupByDay(messages: Message[], t: (k: string, o?: any) => string): Grouped[] {
  const result: Grouped[] = []
  let lastDay = ''
  for (const msg of messages) {
    const day = dayLabel(msg.createdAt, t)
    if (day !== lastDay) {
      result.push({ id: `sep-${day}`, type: 'separator', label: day })
      lastDay = day
    }
    result.push({ ...msg, type: 'message' })
  }
  return result
}

function dayLabel(iso: string, t: (k: string, o?: any) => string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) return t('seller.messages.today')
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.getDate() === y.getDate() && d.getMonth() === y.getMonth()) return t('seller.messages.yesterday')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const styles = StyleSheet.create({
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center' },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  threadAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  threadName: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  threadContext: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  threadContextLink: { color: colors.primary, fontWeight: '500' },
  daySeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing[3], gap: spacing[2] },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dayText: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontWeight: '500',
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  loadEarlierBtn: { alignItems: 'center', paddingVertical: spacing[2], marginBottom: spacing[2] },
  loadEarlierText: { fontSize: fontSize.sm[0], color: colors.primary, fontWeight: '500' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  bubbleMineTail: { borderTopRightRadius: radii.xl, borderBottomRightRadius: 4 },
  bubbleTheirsTail: { borderTopLeftRadius: radii.xl, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: fontSize.base[0], color: colors.text, lineHeight: fontSize.base[1] },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 2 },
  bubbleTime: { fontSize: fontSize.xs[0], color: colors.textTertiary },
  tick: { fontSize: fontSize.xs[0], color: colors.textTertiary },
  tickRead: { color: colors.primary },
  typingWrap: { alignItems: 'flex-start', marginBottom: spacing[2] },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  templateBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: fontSize.base[0],
    color: colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templatesWrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxHeight: 320,
  },
  templatesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  templatesTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  templatesSub: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: spacing[2], marginBottom: spacing[1], fontWeight: '500' },
  templatesList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  templateChip: {
    backgroundColor: colors.primary50,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  templateChipText: { fontSize: fontSize.sm[0], color: colors.primary, fontWeight: '500' },
  templateRow: { paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  templateLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  templateBody: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
})
