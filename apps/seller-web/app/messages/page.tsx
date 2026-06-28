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
} from '@chinooz/hooks'
import { SELLER_REPLY_TEMPLATES, SELLER_QUICK_REPLIES, mockBuyerReply } from '@chinooz/mock-data'
import { useSellerSessionStore, useSellerMessagesStore } from '@chinooz/state'
import type { Conversation, Message } from '@chinooz/types'

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
  const { t } = useTranslation()
  const router = useRouter()
  const { data: serverMessages, isLoading } = useSellerMessages(conversationId)
  const sendMutation = useSendSellerMessage()
  const markRead = useMarkSellerConversationRead()
  const convo = conversations.find(c => c.id === conversationId)
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
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

  const grouped = useMemo(() => groupByDay(localMessages, t), [localMessages, t])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
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
    if (textareaRef.current) textareaRef.current.style.height = '40px'
    scrollToBottom()
    sendMutation.mutate({ conversationId, body: trimmed })

    const delay = 1200 + Math.random() * 1200
    setTyping(true)
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
      scrollToBottom()
    }, delay)
  }, [input, conversationId, sendMutation, convo, scrollToBottom])

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
  const contextHref = convo?.contextType === 'order' ? '/orders' : convo?.contextType === 'product' ? '/products' : null

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-3 p-4" aria-busy="true" aria-label={t('seller.messages.threadLoading')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton width="60%" height={36} borderRadius={18} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
              onClick={() => { if (contextHref) router.push(contextHref) }}
              disabled={!contextHref}
              className="text-xs text-primary font-medium hover:underline disabled:text-text-muted disabled:no-underline truncate text-left"
              aria-label={t('seller.messages.threadContextAria', { context: contextLabel })}
            >
              {contextLabel}{contextHref ? ' \u{203A}' : ''}
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0">
        {loadEarlier && (
          <div className="flex justify-center mb-2">
            <button
              onClick={handleLoadEarlier}
              disabled={loadingEarlier}
              className="text-sm font-medium text-primary hover:underline disabled:text-text-muted"
              aria-label={t('seller.messages.threadLoadEarlier')}
            >
              {loadingEarlier ? '…' : t('seller.messages.threadLoadEarlier')}
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
            <button
              onClick={() => setShowTemplates(false)}
              className="text-text-muted hover:text-text"
              aria-label={t('common.close')}
            >
              {'\u{2715}'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {SELLER_QUICK_REPLIES.map(q => (
              <button
                key={q.id}
                onClick={() => handleSend(q.body)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-primary bg-primary-50 hover:bg-primary-50/70 transition-colors"
                aria-label={q.label}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            {SELLER_REPLY_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleSend(tpl.body)}
                className="text-left py-2 border-b border-border-light last:border-0 hover:bg-background transition-colors"
                aria-label={tpl.label}
              >
                <p className="text-sm font-semibold text-text">{tpl.label}</p>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{tpl.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}

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
