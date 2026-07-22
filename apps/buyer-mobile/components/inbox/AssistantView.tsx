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
import { useReducedMotion } from '@chinooz/ui'
import Icon from '../../components/Icon'
import { useAppTheme } from '../../components/ThemeProvider'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { assistantService, type AssistantMessage, SUGGESTED_PROMPTS } from '@chinooz/mock-data'
import { fontSz, spacing, springs, duration } from '@chinooz/theme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated'
import { makeStyles } from './InboxShared'
import { TypingIndicator } from './MessagesView'

const MOCK_REPLIES = [
  'Thanks for reaching out! Let me check on that for you.',
  'Sure, I can help with that. Give me a moment.',
  'That is a great question! The answer is yes.',
  'I will get back to you shortly with more details.',
  'Absolutely! We offer that service.',
]

export function mockReply(_input: string): string {
  return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
}

export function AssistantView({ threadId: _threadId }: { threadId?: string }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem('chinooz-assistant')
        if (stored) setMessages(JSON.parse(stored))
      } catch (err) { console.error('load assistant messages failed', err) }
    })()
  }, [])

  useEffect(() => {
    if (loaded.current && messages.length > 0) {
      AsyncStorage.setItem('chinooz-assistant', JSON.stringify(messages)).catch(() => {})
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
    AsyncStorage.removeItem('chinooz-assistant').catch(() => {})
  }, [])

  const handlePressIn = () => { if (!reduced) sendScale.value = withTiming(0.95, { duration: duration.fast }) }
  const handlePressOut = () => { if (!reduced) sendScale.value = withSpring(1, springs.press) }
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
          <Icon name="sparkles" size={20} color={colors.primary} />
        </View>
        <Text style={styles.threadName}>{t('inbox.assistant')}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => setShowClearDialog(true)}
          accessibilityRole="button"
          accessibilityLabel={t('inbox.clearConversation')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[2] }}
        onContentSizeChange={() => {
          // Debounced scrollToEnd — batches rapid content changes into one frame
          requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: false }))
        }}
        ListHeaderComponent={
          showIntro ? (
            <View style={styles.introWrap}>
              <View style={styles.introAvatar}>
                <Icon name="sparkles" size={26} color={colors.primary} />
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
          <AssistantBubble msg={item} router={router} />
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
            <Icon name="send" size={17} color={colors.white} />
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
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const reduced = useReducedMotion()
  const scale = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    scale.value = withDelay(delay, withSpring(1, springs.press))
  }, [delay, reduced, scale])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const pressIn = () => { if (!reduced) scale.value = withTiming(0.97, { duration: duration.fast }) }
  const pressOut = () => { if (!reduced) scale.value = withSpring(1, springs.press) }

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

function AssistantBubble({ msg, router }: { msg: AssistantMessage; router: Router }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const isMine = msg.from === 'user'
  const reduced = useReducedMotion()
  const bubbleScale = useSharedValue(reduced ? 1 : 0.9)
  const bubbleOpacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    bubbleScale.value = withSpring(1, springs.press)
    bubbleOpacity.value = withTiming(1, { duration: duration.slow })
  }, [bubbleOpacity, bubbleScale, reduced])

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
                <Text style={{ fontSize: fontSz('2xl')[0] }}>{'\u{1F4E6}'}</Text>
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
