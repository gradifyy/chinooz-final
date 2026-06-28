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
  Modal,
  ScrollView,
  Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, Skeleton, useReducedMotion } from '@chinooz/ui'
import {
  useSellerConversations,
  useSellerMessages,
  useSendSellerMessage,
  useMarkSellerConversationRead,
  useChatOrderContext,
  useChatProductContext,
  useGenerateTracking,
  useAttachConversationContext,
  useSellerOrders,
  useSellerProducts,
} from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { SELLER_REPLY_TEMPLATES, SELLER_QUICK_REPLIES, mockBuyerReply, type ChatOrderContext, type ChatProductContext } from '@chinooz/mock-data'
import { colors, spacing, radii, fontSize, fontFamily, duration } from '@chinooz/theme'
import type { Conversation, Message, RichProductPayload, RichOrderPayload, RichTrackingPayload } from '@chinooz/types'
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
  const sellerId = useSellerSessionStore(s => s.sellerId)
  const { data: serverMessages, isLoading } = useSellerMessages(conversationId)
  const sendMutation = useSendSellerMessage()
  const markRead = useMarkSellerConversationRead()
  const trackingMutation = useGenerateTracking()
  const attachMutation = useAttachConversationContext()

  const { data: orderCtx, isLoading: orderCtxLoading } = useChatOrderContext(
    sellerId,
    convo?.contextType === 'order' ? convo?.orderId : undefined,
  )
  const { data: productCtx, isLoading: productCtxLoading } = useChatProductContext(
    convo?.contextType === 'product' ? convo?.productId : undefined,
  )

  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [loadEarlier, setLoadEarlier] = useState(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [showAttachPicker, setShowAttachPicker] = useState(false)
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

  const pushMessage = useCallback((msg: Message) => {
    setLocalMessages(prev => [...prev, msg])
    scrollToBottom(true)
  }, [scrollToBottom])

  const triggerBuyerReply = useCallback((sellerText: string) => {
    const delay = 1200 + Math.random() * 1200
    setTyping(true)
    try { AccessibilityInfo.announceForAccessibility(t('seller.messages.threadTypingGeneric')) } catch {}
    if (replyTimer.current) clearTimeout(replyTimer.current)
    replyTimer.current = setTimeout(() => {
      setTyping(false)
      pushMessage({
        id: `smsg-reply-${Date.now()}`,
        conversationId,
        senderId: 'buyer-1',
        senderName: convo?.participantName ?? 'Buyer',
        body: mockBuyerReply(sellerText),
        createdAt: new Date().toISOString(),
        read: false,
        status: 'delivered',
      })
    }, delay)
  }, [conversationId, convo, pushMessage, t])

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
    pushMessage(optimistic)
    setInput('')
    setShowTemplates(false)
    sendMutation.mutate({ conversationId, body: trimmed })
    triggerBuyerReply(trimmed)
  }, [input, conversationId, sendMutation, pushMessage, triggerBuyerReply])

  const handleShareProduct = useCallback(() => {
    if (!productCtx) return
    const rich: RichProductPayload = {
      productId: productCtx.id,
      name: productCtx.name,
      image: productCtx.image,
      price: productCtx.price,
    }
    pushMessage({
      id: `smsg-rich-${Date.now()}`,
      conversationId,
      senderId: 'seller-1',
      senderName: 'You',
      body: t('seller.messages.richProduct'),
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sent',
      richType: 'product',
      richProduct: rich,
    })
    triggerBuyerReply(rich.name)
  }, [productCtx, conversationId, pushMessage, triggerBuyerReply, t])

  const handleShareOrder = useCallback(() => {
    if (!orderCtx) return
    const rich: RichOrderPayload = {
      orderId: orderCtx.orderId,
      orderRef: orderCtx.orderRef,
      status: orderCtx.status,
      total: orderCtx.total,
      itemCount: orderCtx.items.reduce((s, it) => s + it.quantity, 0),
    }
    pushMessage({
      id: `smsg-rich-${Date.now()}`,
      conversationId,
      senderId: 'seller-1',
      senderName: 'You',
      body: t('seller.messages.richOrder'),
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sent',
      richType: 'order',
      richOrder: rich,
    })
    triggerBuyerReply(rich.orderRef)
  }, [orderCtx, conversationId, pushMessage, triggerBuyerReply, t])

  const handleSendTracking = useCallback(() => {
    if (!orderCtx) return
    trackingMutation.mutate(orderCtx.orderId, {
      onSuccess: (info) => {
        const rich: RichTrackingPayload = {
          carrier: info.carrier,
          trackingNumber: info.trackingNumber,
          url: info.url,
        }
        pushMessage({
          id: `smsg-rich-${Date.now()}`,
          conversationId,
          senderId: 'seller-1',
          senderName: 'You',
          body: t('seller.messages.richTrackingBody', { carrier: info.carrier, tracking: info.trackingNumber }),
          createdAt: new Date().toISOString(),
          read: false,
          status: 'sent',
          richType: 'tracking',
          richTracking: rich,
        })
        triggerBuyerReply(info.trackingNumber)
      },
    })
  }, [orderCtx, trackingMutation, conversationId, pushMessage, triggerBuyerReply, t])

  const handleFulfill = useCallback(() => {
    if (orderCtx) router.push('/orders' as any)
  }, [orderCtx, router])

  const handleAttach = useCallback((type: 'order' | 'product', id: string) => {
    attachMutation.mutate({ conversationId, context: { type, id } })
    setShowAttachPicker(false)
  }, [attachMutation, conversationId])

  const handleLoadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => { setLoadEarlier(false); setLoadingEarlier(false) }, 1200)
  }, [])

  const handlePressIn = () => { if (!reduced) sendScale.value = withTiming(0.9, { duration: duration.fast }) }
  const handlePressOut = () => { if (!reduced) sendScale.value = withSpring(1, { damping: 15, stiffness: 400 }) }
  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }))

  const contextLabel = contextText(convo, t)
  const contextHref = convo?.contextType === 'order' ? '/orders'
    : convo?.contextType === 'product' ? '/products' : null
  const contextAria = contextLabel ? t('seller.messages.threadContextAria', { context: contextLabel }) : undefined

  const hasContext = convo?.contextType && convo?.contextType !== 'general'

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
        {hasContext ? (
          <TouchableOpacity
            onPress={() => setContextExpanded(v => !v)}
            style={styles.expandBtn}
            accessibilityRole="button"
            accessibilityLabel={contextExpanded ? t('seller.messages.contextCollapse') : t('seller.messages.contextExpand')}
            accessibilityState={{ expanded: contextExpanded }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.expandIcon}>{contextExpanded ? '\u{25B2}' : '\u{25BC}'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setShowAttachPicker(true)}
            style={styles.expandBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.messages.contextAttachAria')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.expandIcon}>{'\u{1F4CE}'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasContext && contextExpanded ? (
        <ContextHeader
          convo={convo}
          orderCtx={orderCtx}
          orderCtxLoading={orderCtxLoading}
          productCtx={productCtx}
          productCtxLoading={productCtxLoading}
          onShareProduct={handleShareProduct}
          onShareOrder={handleShareOrder}
          onSendTracking={handleSendTracking}
          onFulfill={handleFulfill}
          onViewOrder={() => router.push('/orders' as any)}
          onViewProduct={() => router.push('/products' as any)}
          reduced={reduced}
          t={t}
        />
      ) : null}

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
          return <Bubble msg={item} isMine={isMine} reduced={reduced} t={t} onProductTap={(id) => router.push(`/products` as any)} />
        }}
      />

      {showTemplates ? (
        <TemplatesSheet
          onClose={() => setShowTemplates(false)}
          onPick={(body) => handleSend(body)}
          t={t}
        />
      ) : null}

      <AttachPicker
        visible={showAttachPicker}
        onClose={() => setShowAttachPicker(false)}
        onAttach={handleAttach}
        sellerId={sellerId}
        t={t}
      />

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

function ContextHeader({
  convo,
  orderCtx,
  orderCtxLoading,
  productCtx,
  productCtxLoading,
  onShareProduct,
  onShareOrder,
  onSendTracking,
  onFulfill,
  onViewOrder,
  onViewProduct,
  reduced,
  t,
}: {
  convo?: Conversation
  orderCtx?: ChatOrderContext | null
  orderCtxLoading: boolean
  productCtx?: ChatProductContext | null
  productCtxLoading: boolean
  onShareProduct: () => void
  onShareOrder: () => void
  onSendTracking: () => void
  onFulfill: () => void
  onViewOrder: () => void
  onViewProduct: () => void
  reduced: boolean
  t: (k: string, o?: any) => string
}) {
  const expandAnim = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    expandAnim.value = withTiming(1, { duration: 250 })
  }, [reduced])
  const animStyle = useAnimatedStyle(() => ({ opacity: expandAnim.value }))

  const isOrder = convo?.contextType === 'order'
  const isProduct = convo?.contextType === 'product'

  return (
    <Animated.View style={[styles.contextCard, animStyle]}>
      {isOrder ? (
        <View accessible accessibilityLabel={t('seller.messages.contextOrderTitle')}>
          <View style={styles.contextCardHeader}>
            <Text style={styles.contextCardTitle}>{t('seller.messages.contextOrderTitle')}</Text>
            <TouchableOpacity onPress={onViewOrder} accessibilityRole="button" accessibilityLabel={orderCtx ? t('seller.messages.contextViewOrderAria', { ref: orderCtx.orderRef }) : undefined}>
              <Text style={styles.contextLink}>{t('seller.messages.contextViewOrder')} {'\u{203A}'}</Text>
            </TouchableOpacity>
          </View>
          {orderCtxLoading ? (
            <View style={{ gap: spacing[1] }}>
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={12} />
            </View>
          ) : orderCtx ? (
            <View>
              <View style={styles.contextRow}>
                <Text style={styles.contextRef}>{orderCtx.orderRef}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{orderCtx.status}</Text>
                </View>
              </View>
              <View style={styles.contextItems}>
                {orderCtx.items.slice(0, 3).map(it => (
                  <View key={it.id} style={styles.contextItem}>
                    <Image source={{ uri: it.image }} style={styles.contextThumb} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.contextItemName} numberOfLines={1}>{it.name}</Text>
                      <Text style={styles.contextItemMeta}>x{it.quantity} · NPR {it.price.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.contextTotalRow}>
                <Text style={styles.contextTotalLabel}>{t('seller.messages.contextTotal')}</Text>
                <Text style={styles.contextTotalValue}>NPR {orderCtx.total.toLocaleString()}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.contextEmpty}>{t('seller.messages.contextNoLink')}</Text>
          )}
        </View>
      ) : null}

      {isProduct ? (
        <View accessible accessibilityLabel={t('seller.messages.contextProductTitle')}>
          <View style={styles.contextCardHeader}>
            <Text style={styles.contextCardTitle}>{t('seller.messages.contextProductTitle')}</Text>
            <TouchableOpacity onPress={onViewProduct} accessibilityRole="button" accessibilityLabel={productCtx ? t('seller.messages.contextViewProductAria', { name: productCtx.name }) : undefined}>
              <Text style={styles.contextLink}>{t('seller.messages.contextViewProduct')} {'\u{203A}'}</Text>
            </TouchableOpacity>
          </View>
          {productCtxLoading ? (
            <View style={{ gap: spacing[1] }}>
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={12} />
            </View>
          ) : productCtx ? (
            <View style={styles.contextItem}>
              <Image source={{ uri: productCtx.image }} style={styles.contextThumb} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.contextItemName} numberOfLines={1}>{productCtx.name}</Text>
                <Text style={styles.contextItemMeta}>NPR {productCtx.price.toLocaleString()}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.contextEmpty}>{t('seller.messages.contextNoLink')}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.actionChips}>
        {isProduct ? (
          <ActionChip label={t('seller.messages.actionShareProduct')} aria={t('seller.messages.actionShareProductAria')} onPress={onShareProduct} />
        ) : null}
        {isOrder ? (
          <>
            <ActionChip label={t('seller.messages.actionShareOrder')} aria={t('seller.messages.actionShareOrderAria')} onPress={onShareOrder} />
            <ActionChip label={t('seller.messages.actionSendTracking')} aria={t('seller.messages.actionSendTrackingAria')} onPress={onSendTracking} />
            <ActionChip label={t('seller.messages.actionFulfill')} aria={orderCtx ? t('seller.messages.actionFulfillAria', { ref: orderCtx.orderRef }) : t('seller.messages.actionFulfill')} onPress={onFulfill} />
          </>
        ) : null}
      </View>
    </Animated.View>
  )
}

function ActionChip({ label, aria, onPress }: { label: string; aria: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.actionChip}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={aria}
    >
      <Text style={styles.actionChipText}>{label}</Text>
    </TouchableOpacity>
  )
}

function AttachPicker({
  visible,
  onClose,
  onAttach,
  sellerId,
  t,
}: {
  visible: boolean
  onClose: () => void
  onAttach: (type: 'order' | 'product', id: string) => void
  sellerId: string | null
  t: (k: string, o?: any) => string
}) {
  const [tab, setTab] = useState<'order' | 'product'>('order')
  const [search, setSearch] = useState('')
  const { data: orders } = useSellerOrders(sellerId)
  const { data: productsRes } = useSellerProducts({})
  const products = productsRes?.items ?? []

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = orders ?? []
    if (!q) return all.slice(0, 20)
    return all.filter(o => o.orderId.toLowerCase().includes(q) || o.buyerName.toLowerCase().includes(q)).slice(0, 20)
  }, [orders, search])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 20)
  }, [products, search])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityRole="alert" accessibilityLabel={t('seller.messages.contextAttachTitle')}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet} accessibilityLabel={t('seller.messages.contextAttachTitle')}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{t('seller.messages.contextAttachTitle')}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u{2715}'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pickerSubtitle}>{t('seller.messages.contextAttachSubtitle')}</Text>
          <View style={styles.pickerTabs}>
            <TouchableOpacity
              style={[styles.pickerTab, tab === 'order' && styles.pickerTabActive]}
              onPress={() => setTab('order')}
              accessibilityRole="button"
              accessibilityLabel={t('seller.messages.contextAttachOrder')}
              accessibilityState={{ selected: tab === 'order' }}
            >
              <Text style={[styles.pickerTabText, tab === 'order' && styles.pickerTabTextActive]}>{t('seller.messages.contextAttachOrder')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerTab, tab === 'product' && styles.pickerTabActive]}
              onPress={() => setTab('product')}
              accessibilityRole="button"
              accessibilityLabel={t('seller.messages.contextAttachProduct')}
              accessibilityState={{ selected: tab === 'product' }}
            >
              <Text style={[styles.pickerTabText, tab === 'product' && styles.pickerTabTextActive]}>{t('seller.messages.contextAttachProduct')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearchWrap}>
            <TextInput
              style={styles.pickerSearch}
              placeholder={t('seller.messages.contextAttachSearch')}
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel={t('seller.messages.contextAttachSearch')}
            />
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {tab === 'order' ? (
              filteredOrders.length === 0 ? (
                <Text style={styles.pickerEmpty}>{t('seller.messages.emptyFilteredTitle')}</Text>
              ) : filteredOrders.map(o => (
                <TouchableOpacity
                  key={o.subOrderId}
                  style={styles.pickerRow}
                  onPress={() => onAttach('order', o.orderId)}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.orderId} · ${o.buyerName} · NPR ${o.total.toLocaleString()}`}
                >
                  <View style={styles.pickerRowLeft}>
                    <Text style={styles.pickerRowTitle}>{o.orderId}</Text>
                    <Text style={styles.pickerRowSub} numberOfLines={1}>{o.buyerName} · NPR {o.total.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.pickerRowStatus}>{o.status}</Text>
                </TouchableOpacity>
              ))
            ) : (
              filteredProducts.length === 0 ? (
                <Text style={styles.pickerEmpty}>{t('seller.messages.emptyFilteredTitle')}</Text>
              ) : filteredProducts.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickerRow}
                  onPress={() => onAttach('product', p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} · NPR ${p.price.toLocaleString()}`}
                >
                  <View style={styles.pickerRowLeft}>
                    <Text style={styles.pickerRowTitle} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.pickerRowSub} numberOfLines={1}>{p.sku} · NPR {p.price.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.pickerRowStatus}>{p.status}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function Bubble({ msg, isMine, reduced, t, onProductTap }: { msg: Message; isMine: boolean; reduced: boolean; t: (k: string, o?: any) => string; onProductTap: (id: string) => void }) {
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

  if (msg.richType === 'product' && msg.richProduct) {
    const rp = msg.richProduct
    const aria = t('seller.messages.richProductAria', { name: rp.name, price: rp.price })
    return (
      <Animated.View style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[2] }, anim]} accessibilityLabel={aria}>
        <TouchableOpacity
          style={[styles.richCard, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
          onPress={() => onProductTap(rp.productId)}
          accessibilityRole="button"
          accessibilityLabel={aria}
        >
          <Image source={{ uri: rp.image }} style={styles.richThumb} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.richName, isMine && { color: colors.white }]} numberOfLines={2}>{rp.name}</Text>
            <Text style={[styles.richPrice, isMine && { color: colors.primary50 }]}>NPR {rp.price.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
        <Text style={[styles.bubbleTime, isMine && { textAlign: 'right' }]}>{time}</Text>
      </Animated.View>
    )
  }

  if (msg.richType === 'order' && msg.richOrder) {
    const ro = msg.richOrder
    const aria = t('seller.messages.richOrderAria', { ref: ro.orderRef, status: ro.status, total: ro.total })
    return (
      <Animated.View style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[2] }, anim]} accessibilityLabel={aria}>
        <View style={[styles.richCard, styles.richOrderCard, isMine ? styles.bubbleMine : styles.bubbleTheirs]} accessible accessibilityLabel={aria}>
          <Text style={[styles.richLabel, isMine && { color: colors.primary50 }]}>{t('seller.messages.richOrder')}</Text>
          <Text style={[styles.richName, isMine && { color: colors.white }]} numberOfLines={1}>{ro.orderRef}</Text>
          <View style={styles.richOrderRow}>
            <View style={styles.richStatusPill}>
              <Text style={[styles.richStatusText, isMine && { color: colors.white }]}>{ro.status}</Text>
            </View>
            <Text style={[styles.richPrice, isMine && { color: colors.primary50 }]}>NPR {ro.total.toLocaleString()}</Text>
          </View>
        </View>
        <Text style={[styles.bubbleTime, isMine && { textAlign: 'right' }]}>{time}</Text>
      </Animated.View>
    )
  }

  if (msg.richType === 'tracking' && msg.richTracking) {
    const rt = msg.richTracking
    const aria = t('seller.messages.richTrackingAria', { carrier: rt.carrier, tracking: rt.trackingNumber })
    return (
      <Animated.View style={[{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: spacing[2] }, anim]} accessibilityLabel={aria}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, { minWidth: 200 }]} accessible accessibilityLabel={aria}>
          <Text style={[styles.richLabel, isMine && { color: colors.primary50 }]}>{t('seller.messages.richTracking')}</Text>
          <Text style={[styles.bubbleText, isMine && { color: colors.white }]}>{msg.body}</Text>
        </View>
        <Text style={[styles.bubbleTime, isMine && { textAlign: 'right' }]}>{time}</Text>
      </Animated.View>
    )
  }

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
    <View style={styles.typingWrap} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, s1]} />
        <Animated.View style={[styles.typingDot, s2]} />
        <Animated.View style={[styles.typingDot, s3]} />
      </View>
    </View>
  )
}

function TemplatesSheet({ onClose, onPick, t }: { onClose: () => void; onPick: (body: string) => void; t: (k: string, o?: any) => string }) {
  return (
    <View style={styles.templatesWrap} accessibilityLabel={t('seller.messages.threadTemplates')}>
      <View style={styles.templatesHeader}>
        <Text style={styles.templatesTitle}>{t('seller.messages.threadTemplates')}</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u{2715}'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.templatesList}>
        {SELLER_QUICK_REPLIES.map(q => (
          <TouchableOpacity key={q.id} style={styles.templateChip} onPress={() => onPick(q.body)} accessibilityRole="button" accessibilityLabel={q.label}>
            <Text style={styles.templateChipText}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.templatesSub}>{t('seller.messages.threadTemplates')}</Text>
      <View style={styles.templatesList}>
        {SELLER_REPLY_TEMPLATES.map(tpl => (
          <TouchableOpacity key={tpl.id} style={styles.templateRow} onPress={() => onPick(tpl.body)} accessibilityRole="button" accessibilityLabel={tpl.label}>
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
  threadAvatarText: { fontSize: fontSize.sm[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.primary },
  threadName: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  threadContext: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  threadContextLink: { color: colors.primary, fontWeight: '500' },
  expandBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  expandIcon: { fontSize: 10, color: colors.textMuted },
  contextCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  contextCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contextCardTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  contextLink: { fontSize: fontSize.sm[0], color: colors.primary, fontWeight: '500' },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contextRef: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  statusPill: { backgroundColor: colors.primary50, borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  statusPillText: { fontSize: fontSize.xs[0], color: colors.primary, fontWeight: '600', textTransform: 'capitalize' },
  contextItems: { gap: spacing[1], marginTop: spacing[1] },
  contextItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  contextThumb: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.borderLight },
  contextItemName: { fontSize: fontSize.sm[0], color: colors.text, fontWeight: '500' },
  contextItemMeta: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 1 },
  contextTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[2], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight },
  contextTotalLabel: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500' },
  contextTotalValue: { fontSize: fontSize.base[0], color: colors.text, fontWeight: '700' },
  contextEmpty: { fontSize: fontSize.sm[0], color: colors.textMuted, paddingVertical: spacing[2] },
  actionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1] },
  actionChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  actionChipText: { fontSize: fontSize.sm[0], color: colors.primary, fontWeight: '500' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing[4], maxHeight: '80%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text },
  pickerSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  pickerTabs: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  pickerTab: { flex: 1, paddingVertical: spacing[2], alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  pickerTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerTabText: { fontSize: fontSize.sm[0], color: colors.text, fontWeight: '500' },
  pickerTabTextActive: { color: colors.white, fontWeight: '600' },
  pickerSearchWrap: { marginTop: spacing[2] },
  pickerSearch: { backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.base[0], color: colors.text },
  pickerEmpty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing[4] },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  pickerRowLeft: { flex: 1, minWidth: 0 },
  pickerRowTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  pickerRowSub: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 1 },
  pickerRowStatus: { fontSize: fontSize.xs[0], color: colors.textMuted, textTransform: 'capitalize' },
  richCard: { flexDirection: 'row', gap: spacing[2], maxWidth: '78%', padding: spacing[2], borderRadius: radii.lg },
  richThumb: { width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.borderLight },
  richName: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },
  richPrice: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  richOrderCard: { minWidth: 200, flexDirection: 'column' },
  richLabel: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  richOrderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[1] },
  richStatusPill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  richStatusText: { fontSize: fontSize.xs[0], fontWeight: '600', textTransform: 'capitalize' },
  daySeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing[3], gap: spacing[2] },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dayText: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '500', backgroundColor: colors.background, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.full },
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
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  templateBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: colors.background, borderRadius: radii.xl, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.base[0], color: colors.text },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  templatesWrap: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingHorizontal: spacing[4], paddingVertical: spacing[3], maxHeight: 320 },
  templatesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  templatesTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  templatesSub: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: spacing[2], marginBottom: spacing[1], fontWeight: '500' },
  templatesList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  templateChip: { backgroundColor: colors.primary50, borderRadius: radii.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1.5] },
  templateChipText: { fontSize: fontSize.sm[0], color: colors.primary, fontWeight: '500' },
  templateRow: { paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  templateLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  templateBody: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
})
