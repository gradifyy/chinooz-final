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
import { Screen, Skeleton, useReducedMotion } from '@chinooz/ui'
import {
  useSellerConversations,
  useSellerMessages,
  useSendSellerMessage,
  useMarkSellerConversationRead,
} from '@chinooz/hooks'
import { colors, spacing, radii, fontSize, fontFamily, duration } from '@chinooz/theme'
import type { Message } from '@chinooz/types'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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
  convo?: { participantName?: string; participantAvatar?: string; orderRef?: string; productName?: string; contextType?: string }
  onBack: () => void
}) {
  const { t } = useTranslation()
  const { data: serverMessages, isLoading } = useSellerMessages(conversationId)
  const sendMutation = useSendSellerMessage()
  const markRead = useMarkSellerConversationRead()
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const flatListRef = useRef<FlatList>(null)
  const reduced = useReducedMotion()
  const sendScale = useSharedValue(1)

  useEffect(() => { if (serverMessages) setLocalMessages(serverMessages) }, [serverMessages])
  useEffect(() => { if (conversationId) markRead.mutate(conversationId) }, [conversationId, markRead])

  const grouped = useMemo(() => groupByDay(localMessages, t), [localMessages, t])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
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
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80)
    sendMutation.mutate({ conversationId, body: trimmed })
  }, [input, conversationId, sendMutation])

  const handlePressIn = () => { if (!reduced) sendScale.value = withTiming(0.95, { duration: duration.fast }) }
  const handlePressOut = () => { if (!reduced) sendScale.value = withSpring(1, { damping: 15, stiffness: 400 }) }
  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }))

  const contextLabel = convo?.contextType === 'order' && convo?.orderRef
    ? t('seller.messages.contextOrder', { ref: convo.orderRef })
    : convo?.contextType === 'product' && convo?.productName
      ? `${t('seller.messages.contextProduct')} · ${convo.productName}`
      : null

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('seller.messages.threadBack')}>
          <Text style={{ fontSize: 18 }}>{'\u{2190}'}</Text>
        </TouchableOpacity>
        <View style={styles.threadAvatar}>
          <Text style={styles.threadAvatarText}>
            {(convo?.participantName ?? 'B').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.threadName} numberOfLines={1}>{convo?.participantName ?? conversationId}</Text>
          {contextLabel ? <Text style={styles.threadContext} numberOfLines={1}>{contextLabel}</Text> : null}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={grouped}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[2] }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
          return <Bubble msg={item} isMine={isMine} />
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder={t('seller.messages.threadTypeMessage')}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          accessibilityLabel={t('seller.messages.threadTypeMessage')}
        />
        <Animated.View style={sendBtnStyle}>
          <TouchableOpacity
            onPress={handleSend}
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

function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  const reduced = useReducedMotion()
  const scale = useSharedValue(reduced ? 1 : 0.9)
  const opacity = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
    opacity.value = withTiming(1, { duration: duration.fast })
  }, [reduced])
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }))
  const time = new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
  return (
    <Animated.View style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[2] }, anim]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && { color: colors.white }]}>{msg.body}</Text>
      </View>
      <Text style={[styles.bubbleTime, isMine && { textAlign: 'right' }]}>{time}</Text>
    </Animated.View>
  )
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
  daySeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing[3], gap: spacing[2] },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dayText: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '500' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.lg },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  bubbleText: { fontSize: fontSize.base[0], color: colors.text, lineHeight: fontSize.base[1] },
  bubbleTime: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
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
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
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
})
