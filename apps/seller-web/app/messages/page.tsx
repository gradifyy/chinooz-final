'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Screen, Container, EmptyState, Skeleton, Avatar, useReducedMotion } from '@chinooz/ui-web'
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
import { SELLER_QUICK_REPLIES, mockBuyerReply, fillTemplatePlaceholders, getPlaceholders, type ChatOrderContext, type ChatProductContext } from '@chinooz/mock-data'
import { useSellerSessionStore, useSellerMessagesStore, useSellerTemplatesStore } from '@chinooz/state'
import type { Conversation, Message, RichProductPayload, RichOrderPayload, RichTrackingPayload } from '@chinooz/types'

type FilterKey = 'all' | 'unread' | 'order' | 'product'

export default function SellerMessagesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const sellerId = useSellerSessionStore(s => s.sellerId)
  const setUnreadCount = useSellerMessagesStore(s => s.setUnreadCount)
  const reduced = useReducedMotion()

  const { data: conversations, isLoading, isError, refetch } = useSellerConversations(sellerId)
  const markRead = useMarkSellerConversationRead()

  const threadParam = searchParams.get('thread') ?? undefined
  const [selectedId, setSelectedId] = useState<string | null>(threadParam ?? null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [isDesktop, setIsDesktop] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const list = conversations ?? []

  const unreadTotal = useMemo(() => list.reduce((s, c) => s + c.unreadCount, 0), [list])
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

  const handleOpen = useCallback((convo: Conversation) => {
    if (convo.unreadCount > 0) markRead.mutate(convo.id)
    setSelectedId(convo.id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('thread', convo.id)
    router.replace(`/messages?${params.toString()}`, { scroll: false })
  }, [markRead, router, searchParams])

  const handleBack = useCallback(() => {
    setSelectedId(null)
    router.replace('/messages', { scroll: false })
  }, [router])

  if (!isLoggedIn) {
    return (
      <Screen>
        <Container className="py-10">
          <div className="max-w-md mx-auto text-center flex flex-col items-center gap-3">
            <span className="text-5xl">{'\u{1F512}'}</span>
            <h1 className="text-xl font-semibold text-text">{t('seller.messages.signInPrompt')}</h1>
            <button
              onClick={() => router.push('/onboarding')}
              className="h-12 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
              aria-label={t('seller.messages.signIn')}
            >
              {t('seller.messages.signIn')}
            </button>
          </div>
        </Container>
      </Screen>
    )
  }

  if (isError && !isLoading) {
    return (
      <Screen>
        <Container className="py-10">
          <div className="max-w-md mx-auto text-center flex flex-col items-center gap-2">
            <span className="text-5xl">{'\u{26A0}'}</span>
            <h1 className="text-xl font-semibold text-text">{t('seller.messages.errorTitle')}</h1>
            <p className="text-sm text-text-muted">{t('seller.messages.errorSubtitle')}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 h-12 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
              aria-label={t('seller.messages.retry')}
            >
              {t('seller.messages.retry')}
            </button>
          </div>
        </Container>
      </Screen>
    )
  }

  const showList = isDesktop || !selectedId
  const showThread = !!selectedId

  return (
    <Screen>
      <Container className="py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text">{t('seller.messages.title')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t('seller.messages.subtitle')}</p>
        </div>

        <div
          className={`flex gap-4 ${isDesktop ? 'flex-row' : 'flex-col'}`}
          style={{ height: isDesktop ? 'calc(100vh - 180px)' : 'auto' }}
        >
          {showList && (
            <section
              aria-label={t('seller.messages.title')}
              className={`${isDesktop ? 'w-[360px] shrink-0 border border-border rounded-lg overflow-hidden bg-surface flex flex-col' : 'flex flex-col'}`}
            >
              <div className="p-3 border-b border-border-light">
                <div className="flex items-center gap-2 h-10 bg-background rounded-md px-3">
                  <span className="text-sm text-text-tertiary" aria-hidden="true">{'\u{1F50D}'}</span>
                  <input
                    className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-tertiary"
                    placeholder={t('seller.messages.search')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label={t('seller.messages.searchAria')}
                    inputMode="search"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <FilterChip label={t('seller.messages.filterAll')} active={filter === 'all'} onPress={() => setFilter('all')} ariaLabel={t('seller.messages.filterAllAria')} />
                  <FilterChip label={t('seller.messages.filterUnread')} active={filter === 'unread'} onPress={() => setFilter('unread')} ariaLabel={t('seller.messages.filterUnreadAria')} />
                  <FilterChip label={t('seller.messages.filterOrders')} active={filter === 'order'} onPress={() => setFilter('order')} ariaLabel={t('seller.messages.filterOrdersAria')} />
                  <FilterChip label={t('seller.messages.filterProducts')} active={filter === 'product'} onPress={() => setFilter('product')} ariaLabel={t('seller.messages.filterProductsAria')} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col" aria-busy="true" aria-label={t('seller.messages.loading')}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4" style={{ height: 72 }}>
                        <Skeleton width={40} height={40} circle />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <Skeleton width="60%" height={14} />
                          <Skeleton width="85%" height={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sorted.length === 0 ? (
                  <EmptyState
                    icon={<span className="text-5xl">{'\u{1F4AC}'}</span>}
                    title={list.length === 0 ? t('seller.messages.emptyTitle') : t('seller.messages.emptyFilteredTitle')}
                    subtitle={list.length === 0 ? t('seller.messages.emptySubtitle') : t('seller.messages.emptyFilteredSubtitle')}
                  />
                ) : (
                  <ul className="list-none p-0 m-0">
                    {sorted.map(item => {
                      const isUnread = item.unreadCount > 0
                      const isSelected = item.id === selectedId
                      const contextLabel = contextText(item, t)
                      const parts = [item.participantName, item.lastMessage, formatTime(item.lastMessageAt, t)]
                      if (isUnread) parts.push(t('seller.messages.unreadAria', { count: item.unreadCount }))
                      if (contextLabel) parts.push(contextLabel)
                      const ariaLabel = parts.join('. ')
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => handleOpen(item)}
                            className={`relative flex items-center gap-3 w-full px-4 text-left border-b transition-all duration-150 hover:bg-background active:scale-[0.98] ${reduced ? '' : 'motion-reduce:transition-none'} ${isUnread ? 'bg-[rgba(138,27,87,0.04)]' : 'bg-surface'} ${isSelected ? 'ring-2 ring-inset ring-primary-50' : ''}`}
                            style={{ height: 72, borderColor: '#E5E5E5' }}
                            aria-label={ariaLabel}
                            aria-current={isSelected}
                          >
                            <Avatar source={item.participantAvatar} name={item.participantName} size="md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-base truncate ${isUnread ? 'font-semibold text-text' : 'font-normal text-text'}`}>
                                  {item.participantName}
                                </p>
                                <span className="text-xs text-text-muted ml-2 shrink-0">
                                  {formatTime(item.lastMessageAt, t)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                <p className="text-sm text-text-muted truncate flex-1">{item.lastMessage}</p>
                                {isUnread && (
                                  <span
                                    className="inline-flex items-center justify-center bg-primary text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 shrink-0"
                                    aria-label={t('seller.messages.unreadAria', { count: item.unreadCount })}
                                  >
                                    {item.unreadCount}
                                  </span>
                                )}
                              </div>
                              {contextLabel && (
                                <span className="mt-1 inline-flex items-center text-xs font-medium text-text-muted bg-border-light rounded px-1.5 py-0.5 max-w-full">
                                  <span className="truncate">{contextLabel}</span>
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {showThread && (
            <section
              aria-label={t('seller.messages.title')}
              className={`${isDesktop ? 'flex-1 border border-border rounded-lg overflow-hidden bg-surface flex flex-col' : 'flex flex-col'}`}
              style={{ height: isDesktop ? 'auto' : 'calc(100vh - 160px)' }}
            >
              <ThreadView
                conversationId={selectedId!}
                conversations={list}
                onBack={handleBack}
                isDesktop={isDesktop}
              />
            </section>
          )}
        </div>
      </Container>
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
    <button
      onClick={onPress}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors min-h-[32px] ${
        active ? 'bg-primary text-white border-primary' : 'bg-background text-text border-border hover:bg-primary-50'
      }`}
    >
      {label}
    </button>
  )
}

function contextText(c?: Conversation, t?: (k: string, o?: any) => string): string | null {
  if (!c || !t) return null
  if (c.contextType === 'order' && c.orderRef) return t('seller.messages.contextOrder', { ref: c.orderRef })
  if (c.contextType === 'product' && c.productName) return `${t('seller.messages.contextProduct')} · ${c.productName}`
  if (c.contextType === 'general') return t('seller.messages.contextGeneral')
  return null
}

function ThreadView({
  conversationId,
  conversations,
  onBack,
  isDesktop,
}: {
  conversationId: string
  conversations: Conversation[]
  onBack: () => void
  isDesktop: boolean
}) {
  const { t, i18n } = useTranslation()
  const isNe = i18n.language === 'ne'
  const router = useRouter()
  const sellerId = useSellerSessionStore(s => s.sellerId)
  const { data: serverMessages, isLoading, isError: threadError, refetch: refetchThread } = useSellerMessages(conversationId)
  const sendMutation = useSendSellerMessage()
  const markRead = useMarkSellerConversationRead()
  const trackingMutation = useGenerateTracking()
  const attachMutation = useAttachConversationContext()
  const convo = conversations.find(c => c.id === conversationId)
  const templates = useSellerTemplatesStore(s => s.templates)
  const addTemplate = useSellerTemplatesStore(s => s.addTemplate)
  const updateTemplate = useSellerTemplatesStore(s => s.updateTemplate)
  const deleteTemplate = useSellerTemplatesStore(s => s.deleteTemplate)
  const awayMessage = useSellerTemplatesStore(s => s.awayMessage)
  const setAwayEnabled = useSellerTemplatesStore(s => s.setAwayEnabled)
  const setAwayBody = useSellerTemplatesStore(s => s.setAwayBody)

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
  const [isOffline, setIsOffline] = useState(false)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showAttachPicker, setShowAttachPicker] = useState(false)
  const [contextCollapsed, setContextCollapsed] = useState(false)
  const [loadEarlier, setLoadEarlier] = useState(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reduced = useReducedMotion()
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (serverMessages) setLocalMessages(serverMessages) }, [serverMessages])
  useEffect(() => { if (conversationId) markRead.mutate(conversationId) }, [conversationId, markRead])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [localMessages, typing])
  useEffect(() => () => { if (replyTimer.current) clearTimeout(replyTimer.current) }, [])

  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    const off = () => setIsOffline(true)
    const on = () => setIsOffline(false)
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  const grouped = useMemo(() => groupByDay(localMessages, t), [localMessages, t])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [])

  const pushMessage = useCallback((msg: Message) => {
    setLocalMessages(prev => [...prev, msg])
    scrollToBottom()
  }, [scrollToBottom])

  const triggerBuyerReply = useCallback((sellerText: string) => {
    const delay = 1200 + Math.random() * 1200
    setTyping(true)
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
  }, [conversationId, convo, pushMessage])

  const handleSend = useCallback((text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    const msgId = `smsg-opt-${Date.now()}`
    pushMessage({
      id: msgId,
      conversationId,
      senderId: 'seller-1',
      senderName: 'You',
      body: trimmed,
      createdAt: new Date().toISOString(),
      read: false,
      status: isOffline ? 'sending' : 'sent',
    })
    setInput('')
    setShowTemplates(false)
    if (textareaRef.current) textareaRef.current.style.height = '40px'

    if (isOffline) {
      try {
        const queue = JSON.parse(localStorage.getItem('chinooz-seller-offline-queue') || '[]')
        queue.push({ conversationId, body: trimmed, msgId, createdAt: new Date().toISOString() })
        localStorage.setItem('chinooz-seller-offline-queue', JSON.stringify(queue))
      } catch {}
      return
    }

    sendMutation.mutate({ conversationId, body: trimmed }, {
      onError: () => {
        setFailedIds(prev => new Set(prev).add(msgId))
      },
    })
    triggerBuyerReply(trimmed)
  }, [input, conversationId, sendMutation, pushMessage, triggerBuyerReply, isOffline])

  const handleRetrySend = useCallback((msgId: string) => {
    const msg = localMessages.find(m => m.id === msgId)
    if (!msg) return
    setFailedIds(prev => { const s = new Set(prev); s.delete(msgId); return s })
    setLocalMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sending' as const } : m))
    sendMutation.mutate({ conversationId, body: msg.body }, {
      onSuccess: () => {
        setLocalMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sent' as const } : m))
      },
      onError: () => {
        setFailedIds(prev => new Set(prev).add(msgId))
        setLocalMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sent' as const } : m))
      },
    })
  }, [localMessages, conversationId, sendMutation])

  const handleInsertTemplate = useCallback((body: string) => {
    const filled = fillTemplatePlaceholders(body, {
      orderRef: orderCtx?.orderRef,
      trackingNumber: undefined,
      buyerName: convo?.participantName,
    })
    setInput(filled)
    setShowTemplates(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px'
      textareaRef.current.style.height = Math.min(120, textareaRef.current.scrollHeight) + 'px'
    }
  }, [orderCtx, convo])

  const handleShareProduct = useCallback(() => {
    if (!productCtx) return
    const rich: RichProductPayload = { productId: productCtx.id, name: productCtx.name, image: productCtx.image, price: productCtx.price }
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
        const rich: RichTrackingPayload = { carrier: info.carrier, trackingNumber: info.trackingNumber, url: info.url }
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
    router.push('/orders')
  }, [router])

  const handleAttach = useCallback((type: 'order' | 'product', id: string) => {
    attachMutation.mutate({ conversationId, context: { type, id } })
    setShowAttachPicker(false)
  }, [attachMutation, conversationId])

  const handleLoadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => { setLoadEarlier(false); setLoadingEarlier(false) }, 1200)
  }, [])

  const handleTextareaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = '40px'
    el.style.height = Math.min(120, el.scrollHeight) + 'px'
  }, [])

  const contextLabel = contextText(convo, t)
  const hasContext = convo?.contextType && convo?.contextType !== 'general'

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-3 p-4" aria-busy="true" aria-label={t('seller.messages.threadLoading')}>
        <div className="flex justify-start"><Skeleton width="70%" height={36} borderRadius={18} /></div>
        <div className="flex justify-end"><Skeleton width="50%" height={36} borderRadius={18} /></div>
        <div className="flex justify-start"><Skeleton width="60%" height={36} borderRadius={18} /></div>
        <div className="flex justify-end"><Skeleton width="65%" height={36} borderRadius={18} /></div>
        <div className="flex justify-start"><Skeleton width="40%" height={36} borderRadius={18} /></div>
      </div>
    )
  }

  if (threadError && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6" role="alert" aria-label={t('seller.messages.errorThread')}>
        <span className="text-5xl">{'\u{26A0}'}</span>
        <h2 className="text-lg font-semibold text-text text-center">{t('seller.messages.errorThread')}</h2>
        <p className="text-sm text-text-muted text-center">{t('seller.messages.errorThreadSubtitle')}</p>
        <button
          onClick={() => refetchThread()}
          className="mt-2 rounded-lg border border-primary text-primary font-semibold px-5 py-2.5 hover:bg-primary-50 transition-colors"
          aria-label={t('seller.messages.errorThreadRetry')}
        >
          {t('seller.messages.errorThreadRetry')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-row flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-w-0">
        {isOffline && (
          <div className="flex items-center gap-2 bg-warning-light px-4 py-2 border-b border-border-light" role="status" aria-label={t('seller.messages.offlineBanner')}>
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-sm text-text">{t('seller.messages.offlineBanner')}</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          {!isDesktop && (
            <button
              onClick={onBack}
              className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-background transition-colors"
              aria-label={t('seller.messages.threadBack')}
            >
              <span aria-hidden="true">{'\u{2190}'}</span>
            </button>
          )}
          <Avatar source={convo?.participantAvatar} name={convo?.participantName ?? ''} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-text truncate">{convo?.participantName ?? conversationId}</p>
            {contextLabel && (
              <button
                onClick={() => { if (hasContext) router.push(convo?.contextType === 'order' ? '/orders' : '/products') }}
                disabled={!hasContext}
                className="text-xs text-primary font-medium hover:underline disabled:text-text-muted disabled:no-underline truncate text-left"
                aria-label={t('seller.messages.threadContextAria', { context: contextLabel })}
              >
                {contextLabel}{hasContext ? ' \u{203A}' : ''}
              </button>
            )}
          </div>
          {!isDesktop && hasContext && (
            <button
              onClick={() => setContextCollapsed(v => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:bg-background"
              aria-label={contextCollapsed ? t('seller.messages.contextExpand') : t('seller.messages.contextCollapse')}
              aria-expanded={!contextCollapsed}
            >
              <span aria-hidden="true">{contextCollapsed ? '\u{25BC}' : '\u{25B2}'}</span>
            </button>
          )}
        </div>

        {!isDesktop && hasContext && !contextCollapsed && (
          <ContextPanel
            convo={convo}
            orderCtx={orderCtx}
            orderCtxLoading={orderCtxLoading}
            productCtx={productCtx}
            productCtxLoading={productCtxLoading}
            onShareProduct={handleShareProduct}
            onShareOrder={handleShareOrder}
            onSendTracking={handleSendTracking}
            onFulfill={handleFulfill}
            onViewOrder={() => router.push('/orders')}
            onViewProduct={() => router.push('/products')}
            reduced={reduced}
            t={t}
          />
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0">
          {loadEarlier && (
            <div className="flex justify-center mb-2">
              <button
                onClick={handleLoadEarlier}
                disabled={loadingEarlier}
                className="text-sm font-medium text-primary hover:underline disabled:text-text-muted"
                aria-label={t('seller.messages.threadLoadEarlier')}
              >
                {loadingEarlier ? '\u{2026}' : t('seller.messages.threadLoadEarlier')}
              </button>
            </div>
          )}
          {grouped.map(item => {
            if (item.type === 'separator') {
              return (
                <div key={item.id} className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-border-light" />
                  <span className="text-xs text-text-muted font-medium bg-background px-2 py-0.5 rounded-full">{item.label}</span>
                  <div className="flex-1 h-px bg-border-light" />
                </div>
              )
            }
            const isMine = item.senderId === 'seller-1'
            const time = new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
            const tick = item.status === 'read' ? t('seller.messages.threadTickRead') : item.status === 'delivered' ? t('seller.messages.threadTickDelivered') : item.status === 'sent' ? t('seller.messages.threadTickSent') : null

            if (item.richType === 'product' && item.richProduct) {
              const rp = item.richProduct
              const aria = t('seller.messages.richProductAria', { name: rp.name, price: rp.price })
              return (
                <div key={item.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${reduced ? '' : 'animate-[fadeIn_200ms_ease-out]'}`} aria-label={aria}>
                  <button
                    onClick={() => router.push('/products')}
                    className={`flex items-center gap-2 max-w-[78%] p-2 rounded-2xl text-left ${isMine ? 'bg-primary' : 'bg-background border border-border-light'}`}
                    aria-label={aria}
                  >
                    <img src={rp.image} alt="" className="w-12 h-12 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-text'}`}>{rp.name}</p>
                      <p className={`text-sm ${isMine ? 'text-primary-50' : 'text-text-muted'}`}>NPR {rp.price.toLocaleString()}</p>
                    </div>
                  </button>
                  <span className="text-[10px] text-text-tertiary mt-1">{time}</span>
                </div>
              )
            }

            if (item.richType === 'order' && item.richOrder) {
              const ro = item.richOrder
              const aria = t('seller.messages.richOrderAria', { ref: ro.orderRef, status: ro.status, total: ro.total })
              return (
                <div key={item.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${reduced ? '' : 'animate-[fadeIn_200ms_ease-out]'}`} aria-label={aria}>
                  <div className={`min-w-[200px] max-w-[78%] p-2 rounded-2xl ${isMine ? 'bg-primary' : 'bg-background border border-border-light'}`} aria-label={aria}>
                    <p className={`text-[10px] font-semibold uppercase ${isMine ? 'text-primary-50' : 'text-text-muted'}`}>{t('seller.messages.richOrder')}</p>
                    <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-text'}`}>{ro.orderRef}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${isMine ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary'}`}>{ro.status}</span>
                      <span className={`text-sm ${isMine ? 'text-primary-50' : 'text-text-muted'}`}>NPR {ro.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-tertiary mt-1">{time}</span>
                </div>
              )
            }

            if (item.richType === 'tracking' && item.richTracking) {
              const rt = item.richTracking
              const aria = t('seller.messages.richTrackingAria', { carrier: rt.carrier, tracking: rt.trackingNumber })
              return (
                <div key={item.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${reduced ? '' : 'animate-[fadeIn_200ms_ease-out]'}`} aria-label={aria}>
                  <div className={`min-w-[200px] max-w-[78%] px-3 py-2 rounded-2xl ${isMine ? 'bg-primary text-white' : 'bg-background text-text border border-border-light'}`} aria-label={aria}>
                    <p className={`text-[10px] font-semibold uppercase ${isMine ? 'text-primary-50' : 'text-text-muted'}`}>{t('seller.messages.richTracking')}</p>
                    <p className="text-sm">{item.body}</p>
                  </div>
                  <span className="text-[10px] text-text-tertiary mt-1">{time}</span>
                </div>
              )
            }

            const ariaParts = [item.senderName, item.body, time]
            if (tick) ariaParts.push(tick)
            return (
              <div
                key={item.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${reduced ? '' : 'animate-[fadeIn_200ms_ease-out]'}`}
                aria-label={ariaParts.join('. ')}
              >
                <div
                  className={`max-w-[78%] px-3 py-2 text-sm leading-5 ${isMine ? 'bg-primary text-white rounded-2xl rounded-br-sm' : 'bg-background text-text border border-border-light rounded-2xl rounded-bl-sm'}`}
                >
                  {item.body}
                </div>
                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] text-text-tertiary">{time}</span>
                  {isMine && item.status && (
                    <span className={`text-[10px] ${item.status === 'read' ? 'text-primary' : 'text-text-tertiary'}`} aria-hidden="true">
                      {item.status === 'read' ? '\u{2713}\u{2713}' : '\u{2713}'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {typing && (
            <div className="flex items-start" aria-live="polite" aria-label={t('seller.messages.threadTypingGeneric')}>
              <div className="flex items-center gap-1 bg-background border border-border-light rounded-2xl rounded-bl-sm px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          {localMessages.length === 0 && !typing && (
            <div className="m-auto text-sm text-text-muted text-center px-6">
              {t('seller.messages.emptySubtitle')}
            </div>
          )}
        </div>

        {showTemplates && (
          <div className="border-t border-border-light bg-surface px-4 py-3 max-h-72 overflow-y-auto" role="dialog" aria-label={t('seller.messages.threadTemplates')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text">{t('seller.messages.threadTemplates')}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowTemplates(false); setShowTemplateManager(true) }} className="text-sm font-medium text-primary hover:underline" aria-label={t('seller.messages.templateManagerAria')}>
                  {t('seller.messages.templateManager')}
                </button>
                <button onClick={() => setShowTemplates(false)} className="text-text-muted hover:text-text" aria-label={t('common.close')}>{'\u{2715}'}</button>
              </div>
            </div>
            <div className="flex flex-col">
              {templates.filter(tpl => !tpl.isBuiltIn).length > 0 && (
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-1 mb-1">{t('seller.messages.templateCustom')}</p>
              )}
              {templates.filter(tpl => !tpl.isBuiltIn).map(tpl => (
                <button key={tpl.id} onClick={() => handleInsertTemplate(tpl.body)} className="text-left py-2 border-b border-border-light last:border-0 hover:bg-background transition-colors" aria-label={t('seller.messages.templateInsertAria', { label: tpl.label })}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-text">{tpl.label}</p>
                    {tpl.hasPlaceholders && <span className="text-[10px] text-primary font-semibold bg-primary-50 px-1 rounded">{'}'}</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{tpl.body}</p>
                </button>
              ))}
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-2 mb-1">{t('seller.messages.templateBuiltIn')}</p>
              {templates.filter(tpl => tpl.isBuiltIn).map(tpl => (
                <button key={tpl.id} onClick={() => handleInsertTemplate(tpl.body)} className="text-left py-2 border-b border-border-light last:border-0 hover:bg-background transition-colors" aria-label={t('seller.messages.templateInsertAria', { label: tpl.label })}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-text">{tpl.label}</p>
                    {tpl.hasPlaceholders && <span className="text-[10px] text-primary font-semibold bg-primary-50 px-1 rounded">{'}'}</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{tpl.body}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <TemplateManagerModal
          visible={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          templates={templates}
          onAdd={addTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
          awayMessage={awayMessage}
          onSetAwayEnabled={setAwayEnabled}
          onSetAwayBody={setAwayBody}
          t={t}
        />

        <AttachPickerModal
          visible={showAttachPicker}
          onClose={() => setShowAttachPicker(false)}
          onAttach={handleAttach}
          sellerId={sellerId}
          t={t}
        />

        <div className="flex items-center gap-2 px-3 pt-2 bg-surface overflow-x-auto scrollbar-none">
          {SELLER_QUICK_REPLIES.map(q => (
            <button
              key={q.id}
              onClick={() => handleInsertTemplate(isNe ? q.bodyNe : q.body)}
              className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:border-primary hover:text-primary active:scale-[0.96] transition-all"
              aria-label={t('seller.messages.quickReplyAria', { label: isNe ? q.labelNe : q.label })}
            >
              {isNe ? q.labelNe : q.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 p-3 border-t border-border-light bg-surface">
          <button
            className="h-9 w-9 flex items-center justify-center rounded-md text-text-muted hover:bg-background transition-colors shrink-0"
            aria-label={t('seller.messages.threadAttachAria')}
          >
            <span aria-hidden="true">{'\u{1F4CE}'}</span>
          </button>
          <button
            onClick={() => setShowTemplates(v => !v)}
            className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors shrink-0 ${showTemplates ? 'text-primary bg-primary-50' : 'text-primary hover:bg-primary-50'}`}
            aria-label={t('seller.messages.threadTemplatesAria')}
            aria-expanded={showTemplates}
          >
            <span aria-hidden="true">{'\u{270D}'}</span>
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-2xl bg-background px-3 py-2 text-sm text-text outline-none border border-border-light focus:border-primary"
            placeholder={t('seller.messages.threadTypeMessage')}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            aria-label={t('seller.messages.threadTypeMessage')}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary-dark active:scale-95 transition-all shrink-0"
            aria-label={t('seller.messages.threadSend')}
          >
            <span aria-hidden="true">{'\u{27A4}'}</span>
          </button>
        </div>
      </div>

      {isDesktop && (
        <aside className="w-72 shrink-0 border-l border-border bg-surface overflow-y-auto" aria-label={t('seller.messages.contextPanelTitle')}>
          <ContextPanel
            convo={convo}
            orderCtx={orderCtx}
            orderCtxLoading={orderCtxLoading}
            productCtx={productCtx}
            productCtxLoading={productCtxLoading}
            onShareProduct={handleShareProduct}
            onShareOrder={handleShareOrder}
            onSendTracking={handleSendTracking}
            onFulfill={handleFulfill}
            onViewOrder={() => router.push('/orders')}
            onViewProduct={() => router.push('/products')}
            reduced={reduced}
            t={t}
          />
          {!hasContext && (
            <div className="p-4">
              <button
                onClick={() => setShowAttachPicker(true)}
                className="w-full rounded-full border border-primary text-primary text-sm font-medium py-2 hover:bg-primary-50 transition-colors"
                aria-label={t('seller.messages.contextAttachAria')}
              >
                {t('seller.messages.contextAttach')}
              </button>
            </div>
          )}
        </aside>
      )}

      {!isDesktop && !hasContext && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowAttachPicker(true)}
            className="w-full rounded-full border border-primary text-primary text-sm font-medium py-2 hover:bg-primary-50 transition-colors"
            aria-label={t('seller.messages.contextAttachAria')}
          >
            {t('seller.messages.contextAttach')}
          </button>
        </div>
      )}
    </div>
  )
}

function ContextPanel({
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
  const isOrder = convo?.contextType === 'order'
  const isProduct = convo?.contextType === 'product'

  return (
    <div className={`p-4 flex flex-col gap-2 ${reduced ? '' : 'animate-[fadeIn_250ms_ease-out]'}`}>
      {isOrder && (
        <section className="bg-surface rounded-lg border border-border-light p-4 flex flex-col gap-2" aria-labelledby="ctx-order-title">
          <div className="flex items-center justify-between">
            <h3 id="ctx-order-title" className="text-sm font-semibold text-text">{t('seller.messages.contextOrderTitle')}</h3>
            <button onClick={onViewOrder} className="text-sm font-medium text-primary hover:underline" aria-label={orderCtx ? t('seller.messages.contextViewOrderAria', { ref: orderCtx.orderRef }) : t('seller.messages.contextViewOrder')}>
              {t('seller.messages.contextViewOrder')} {'\u{203A}'}
            </button>
          </div>
          {orderCtxLoading ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={12} />
            </div>
          ) : orderCtx ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-text">{orderCtx.orderRef}</span>
                <span className="text-xs font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded-full capitalize">{orderCtx.status}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {orderCtx.items.slice(0, 3).map(it => (
                  <div key={it.id} className="flex items-center gap-2">
                    <img src={it.image} alt="" className="w-8 h-8 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text truncate">{it.name}</p>
                      <p className="text-xs text-text-muted">x{it.quantity} · NPR {it.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border-light">
                <span className="text-sm font-medium text-text-muted">{t('seller.messages.contextTotal')}</span>
                <span className="text-sm font-bold text-text">NPR {orderCtx.total.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted py-2">{t('seller.messages.contextNoLink')}</p>
          )}
        </section>
      )}

      {isProduct && (
        <section className="bg-surface rounded-lg border border-border-light p-4 flex flex-col gap-2" aria-labelledby="ctx-product-title">
          <div className="flex items-center justify-between">
            <h3 id="ctx-product-title" className="text-sm font-semibold text-text">{t('seller.messages.contextProductTitle')}</h3>
            <button onClick={onViewProduct} className="text-sm font-medium text-primary hover:underline" aria-label={productCtx ? t('seller.messages.contextViewProductAria', { name: productCtx.name }) : t('seller.messages.contextViewProduct')}>
              {t('seller.messages.contextViewProduct')} {'\u{203A}'}
            </button>
          </div>
          {productCtxLoading ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={12} />
            </div>
          ) : productCtx ? (
            <div className="flex items-center gap-2">
              <img src={productCtx.image} alt="" className="w-8 h-8 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text truncate">{productCtx.name}</p>
                <p className="text-xs text-text-muted">NPR {productCtx.price.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted py-2">{t('seller.messages.contextNoLink')}</p>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {isProduct && (
          <button onClick={onShareProduct} className="rounded-full border border-primary text-primary text-sm font-medium px-3 py-1.5 hover:bg-primary-50 transition-colors" aria-label={t('seller.messages.actionShareProductAria')}>
            {t('seller.messages.actionShareProduct')}
          </button>
        )}
        {isOrder && (
          <>
            <button onClick={onShareOrder} className="rounded-full border border-primary text-primary text-sm font-medium px-3 py-1.5 hover:bg-primary-50 transition-colors" aria-label={t('seller.messages.actionShareOrderAria')}>
              {t('seller.messages.actionShareOrder')}
            </button>
            <button onClick={onSendTracking} className="rounded-full border border-primary text-primary text-sm font-medium px-3 py-1.5 hover:bg-primary-50 transition-colors" aria-label={t('seller.messages.actionSendTrackingAria')}>
              {t('seller.messages.actionSendTracking')}
            </button>
            <button onClick={onFulfill} className="rounded-full border border-primary text-primary text-sm font-medium px-3 py-1.5 hover:bg-primary-50 transition-colors" aria-label={orderCtx ? t('seller.messages.actionFulfillAria', { ref: orderCtx.orderRef }) : t('seller.messages.actionFulfill')}>
              {t('seller.messages.actionFulfill')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AttachPickerModal({
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
  const { data: productsRes } = useSellerProducts({} as any)
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

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label={t('seller.messages.contextAttachTitle')}>
      <div
        className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h2 className="text-base font-bold text-text">{t('seller.messages.contextAttachTitle')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text" aria-label={t('common.close')}>{'\u{2715}'}</button>
        </div>
        <p className="text-sm text-text-muted px-4 pt-2">{t('seller.messages.contextAttachSubtitle')}</p>
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setTab('order')}
            className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${tab === 'order' ? 'bg-primary text-white border-primary' : 'border-border text-text hover:bg-background'}`}
            aria-pressed={tab === 'order'}
            aria-label={t('seller.messages.contextAttachOrder')}
          >
            {t('seller.messages.contextAttachOrder')}
          </button>
          <button
            onClick={() => setTab('product')}
            className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${tab === 'product' ? 'bg-primary text-white border-primary' : 'border-border text-text hover:bg-background'}`}
            aria-pressed={tab === 'product'}
            aria-label={t('seller.messages.contextAttachProduct')}
          >
            {t('seller.messages.contextAttachProduct')}
          </button>
        </div>
        <div className="px-4 py-2">
          <input
            className="w-full h-10 rounded-md bg-background px-3 text-sm text-text outline-none border border-border-light focus:border-primary"
            placeholder={t('seller.messages.contextAttachSearch')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t('seller.messages.contextAttachSearch')}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {tab === 'order' ? (
            filteredOrders.length === 0 ? (
              <p className="text-center text-text-muted py-4">{t('seller.messages.emptyFilteredTitle')}</p>
            ) : filteredOrders.map(o => (
              <button
                key={o.subOrderId}
                onClick={() => onAttach('order', o.orderId)}
                className="flex items-center justify-between w-full py-2 border-b border-border-light last:border-0 hover:bg-background transition-colors text-left"
                aria-label={`${o.orderId} · ${o.buyerName} · NPR ${o.total.toLocaleString()}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{o.orderId}</p>
                  <p className="text-xs text-text-muted truncate">{o.buyerName} · NPR {o.total.toLocaleString()}</p>
                </div>
                <span className="text-xs text-text-muted capitalize">{o.status}</span>
              </button>
            ))
          ) : (
            filteredProducts.length === 0 ? (
              <p className="text-center text-text-muted py-4">{t('seller.messages.emptyFilteredTitle')}</p>
            ) : filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => onAttach('product', p.id)}
                className="flex items-center justify-between w-full py-2 border-b border-border-light last:border-0 hover:bg-background transition-colors text-left"
                aria-label={`${p.name} · NPR ${p.price.toLocaleString()}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{p.name}</p>
                  <p className="text-xs text-text-muted truncate">{p.sku} · NPR {p.price.toLocaleString()}</p>
                </div>
                <span className="text-xs text-text-muted capitalize">{p.status}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
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
