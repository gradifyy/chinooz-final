'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Screen, Container, SegmentedControl, EmptyState, Skeleton, Avatar } from '@chinooz/ui-web'
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
import type { InboxTab } from '@chinooz/types'
import type { Notification, NotificationType, Conversation, Message, MessageStatus } from '@chinooz/types'

const TAB_KEYS: InboxTab[] = ['notifications', 'messages', 'assistant']

export default function InboxPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeTab, setActiveTab, setNotifUnread, setMsgUnread } = useInboxStore()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const initialized = useRef(false)
  const [isOffline, setIsOffline] = useState(false)

  const tabParam = searchParams.get('tab') as InboxTab | null
  const threadParam = searchParams.get('thread') ?? undefined

  const { data: notifications, isLoading: loadingNotifs, isError: errorNotifs, refetch: refetchNotifs } = useNotifications()
  const { data: conversations, isLoading: loadingConvos, isError: errorConvos, refetch: refetchConvos } = useConversations()

  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    const off = () => setIsOffline(true)
    const on = () => setIsOffline(false)
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
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
    if (tabParam && TAB_KEYS.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

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
      const params = new URLSearchParams()
      params.set('tab', key)
      router.push(`/inbox?${params.toString()}`, { scroll: false })
    },
    [setActiveTab, router],
  )

  return (
    <Screen>
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-text mb-4">{t('inbox.title')}</h1>
        <div className="flex justify-center mb-6">
          <SegmentedControl
            segments={segments}
            activeKey={activeTab}
            onChange={handleTabChange}
            testID="inbox-segment-control"
          />
        </div>
        <div className="max-w-[800px] mx-auto">
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
              threadId={threadParam}
            />
          )}
          {activeTab === 'assistant' && (
            <AssistantView />
          )}
        </div>
      </Container>
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
  const [dismissing, setDismissing] = useState<Set<string>>(new Set())
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
    setDismissing(prev => new Set(prev).add(id))
    setTimeout(() => {
      setLocalNotifs(prev => prev.filter(n => n.id !== id))
      setDismissing(prev => { const s = new Set(prev); s.delete(id); return s })
      deleteNotif.mutate(id)
    }, 250)
  }, [deleteNotif])

  if (!isLoggedIn) {
    return <SignInPrompt t={t} onSignIn={onSignIn} />
  }

  if (isError && !isLoading) {
    return <ErrorState t={t} onRetry={onRetry} />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('inbox.loadingNotifications')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton width={32} height={32} circle />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="70%" height={14} />
              <Skeleton width="90%" height={12} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (localNotifs.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-5xl">{'\u{2728}'}</span>}
        title={t('inbox.caughtUp')}
        subtitle={t('inbox.caughtUpSubtitle')}
        action={{ label: t('inbox.browseProducts'), onPress: () => router.push('/') }}
      />
    )
  }

  const hasUnread = localNotifs.some(n => !n.read)

  return (
    <div>
      <div className="flex items-center justify-between px-1 py-2 mb-1">
        {hasUnread ? (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            aria-label={t('inbox.markAllRead')}
          >
            {t('inbox.markAllRead')}
          </button>
        ) : <div />}
        <button
          onClick={() => router.push('/profile')}
          className="text-lg text-text-muted hover:text-text transition-colors"
          aria-label={t('inbox.settings')}
        >
          {'\u2699'}
        </button>
      </div>
      {groups.map(group => (
        <div key={group.title}>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide px-1 pt-3 pb-1.5 bg-background sticky top-16 z-10">
            {group.title}
          </h3>
          {group.items.map(notif => {
            const isDismissing = dismissing.has(notif.id)
            return (
              <div
                key={notif.id}
                className={`relative group transition-all duration-250 ${isDismissing ? 'opacity-0 -translate-x-full max-h-0 overflow-hidden' : 'max-h-40'}`}
                style={{ transitionProperty: 'opacity, transform, max-height' }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-error rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDismiss(notif.id)}
                    className="text-white text-sm"
                    aria-label={t('inbox.delete')}
                  >
                    {'\u{1F5D1}'}
                  </button>
                </div>
                <button
                  onClick={() => handleTap(notif)}
                  className={`relative flex items-start gap-3 w-full p-3 text-left transition-colors border-b border-border-light hover:bg-background ${!notif.read ? 'bg-white' : 'bg-white/50'}`}
                  role="button"
                  aria-label={`${notif.title}. ${notif.body}. ${formatTime(notif.createdAt, t)}`}
                  aria-selected={!notif.read}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-4 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ backgroundColor: notifTypeBg(notif.type), color: notifTypeColor(notif.type) }}
                  >
                    {notifTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-text">{notif.title}</p>
                    <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{notif.body}</p>
                  </div>
                  <span className="text-xs text-text-muted shrink-0 mt-0.5">{formatTime(notif.createdAt, t)}</span>
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
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
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('inbox.loadingMessages')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton width={48} height={48} circle />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="50%" height={14} />
              <Skeleton width="80%" height={12} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-5xl">{'\u{1F4AC}'}</span>}
        title={t('inbox.noMessages')}
        subtitle={t('inbox.noMessagesNudge')}
        action={{ label: t('inbox.browseProducts'), onPress: () => router.push('/') }}
      />
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 h-10 bg-background rounded-md px-3 mb-2">
        <span className="text-sm text-text-tertiary">{'\u{1F50D}'}</span>
        <input
          className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-tertiary"
          placeholder={t('inbox.searchConversations')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label={t('inbox.searchConversations')}
        />
      </div>
      {sorted.map(item => {
        const isUnread = item.unreadCount > 0
        return (
          <button
            key={item.id}
            onClick={() => setSelectedConvo(item.id)}
            className={`flex items-center gap-3 w-full p-3 text-left border-b border-border-light hover:bg-background active:scale-[0.98] transition-all duration-100 ${isUnread ? 'bg-white' : 'bg-transparent'}`}
            role="button"
            aria-label={`${item.participantName}. ${item.lastMessage}. ${formatTime(item.lastMessageAt, t)}${isUnread ? `. ${item.unreadCount} unread` : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <span className="text-base font-semibold text-primary">
                {item.participantName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-base truncate ${isUnread ? 'font-semibold text-text' : 'font-normal text-text'}`}>
                  {item.participantName}
                </p>
                <span className="text-xs text-text-muted ml-2 shrink-0">
                  {formatTime(item.lastMessageAt, t)}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-0.5 truncate">{item.lastMessage}</p>
            </div>
            {isUnread && (
              <span
                className="inline-flex items-center justify-center bg-primary text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 shrink-0"
                aria-label={`${item.unreadCount} unread`}
              >
                {item.unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (serverMessages) setLocalMessages(serverMessages)
  }, [serverMessages])

  useEffect(() => {
    markReadMutation.mutate(conversationId)
  }, [conversationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [localMessages.length, typing])

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
    }, delay)
  }, [input, conversationId, convo])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleLoadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => {
      setLoadEarlier(false)
      setLoadingEarlier(false)
    }, 1200)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label={t('inbox.loadingThread')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton width="60%" height={36} borderRadius={18} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      {isOffline && <InboxOfflineBanner t={t} />}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-background">
          <span className="text-lg">{'\u{2190}'}</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">
            {(convo?.participantName ?? 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-text truncate">{convo?.participantName ?? conversationId}</p>
          <button
            onClick={() => router.push('/profile')}
            className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            aria-label={t('inbox.store')}
          >
            {t('inbox.store')} {'\u{203A}'}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" aria-live="polite">
        {loadEarlier && (
          <div className="flex justify-center mb-2">
            {loadingEarlier ? (
              <div className="flex flex-col gap-2 w-full">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <Skeleton width="50%" height={32} borderRadius={16} />
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={handleLoadEarlier}
                className="text-sm text-text-muted hover:text-primary underline transition-colors"
              >
                {t('inbox.loadEarlier')}
              </button>
            )}
          </div>
        )}

        {grouped.map(item => {
          if ('type' in item && item.type === 'separator') {
            return (
              <div key={item.id} className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{item.label}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )
          }
          const msg = item as Message
          const isMine = msg.senderId === 'user-1'
          const time = new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
          if (isMine && msg.status === 'sending') {
            return (
              <div key={msg.id} className="flex flex-col items-end">
                <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-primary text-white text-base leading-6 font-normal">
                  {msg.body}
                </div>
                <div className="flex items-center gap-1 mt-0.5 px-1 flex-row-reverse animate-pulse">
                  <span className="text-xs text-text-muted">{'\u{23F3}'} {t('inbox.pending')}</span>
                </div>
              </div>
            )
          }
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {msg.productId && (
                <button
                  onClick={() => router.push(`/product/${msg.productId}`)}
                  className="flex items-center gap-3 bg-white border border-border rounded-lg p-3 mb-1 max-w-[75%] text-left hover:bg-background transition-colors"
                  role="button"
                  aria-label={`${msg.productName}. NPR ${msg.productPrice?.toLocaleString()}`}
                >
                  <div className="w-12 h-12 rounded-md bg-border-light flex items-center justify-center shrink-0 text-xl">
                    {'\u{1F4E6}'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{msg.productName}</p>
                    <p className="text-xs font-semibold text-primary mt-0.5">NPR {msg.productPrice?.toLocaleString()}</p>
                  </div>
                </button>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-base leading-6 font-normal animate-[bubble-in_200ms_ease] ${
                  isMine
                    ? 'bg-primary text-white rounded-bl-sm'
                    : 'bg-white border border-border text-text rounded-br-sm'
                }`}
              >
                {msg.body}
              </div>
              <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-text-muted font-normal">{time}</span>
                {isMine && msg.status && (
                  <span className={`text-sm ${msg.status === 'read' ? 'text-primary' : 'text-text-muted'}`}>
                    {msg.status === 'read' ? '\u{2713}\u{2713}' : '\u{2713}'}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 bg-white border border-border rounded-2xl rounded-br-sm px-4 py-3">
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_infinite]" />
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_0.15s_infinite]" />
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_0.3s_infinite]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 p-3 border-t border-border">
        <button
          className="w-10 h-11 flex items-center justify-center text-text-muted hover:text-text transition-colors"
          aria-label={t('inbox.attachImage')}
        >
          <span className="text-lg">{'\u{1F4CE}'}</span>
        </button>
        <textarea
          className="flex-1 min-h-[44px] max-h-[120px] bg-white border border-border rounded-2xl px-4 py-2.5 text-base text-text font-normal resize-none outline-none placeholder:text-text-tertiary"
          placeholder={t('inbox.typeMessage')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label={t('inbox.typeMessage')}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={`w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 transition-all duration-100 ${input.trim() ? 'hover:bg-primary-dark active:scale-95' : 'opacity-50 cursor-not-allowed'}`}
          aria-label={t('inbox.send')}
        >
          <span className="text-base">{'\u{27A4}'}</span>
        </button>
      </div>
    </div>
  )
}

function SignInPrompt({ t, onSignIn }: { t: (k: string) => string; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <span className="text-5xl">{'\u{1F512}'}</span>
      <p className="text-base font-semibold text-text text-center px-6">{t('inbox.signInPrompt')}</p>
      <button
        onClick={onSignIn}
        className="px-6 py-3 rounded-md border-[1.5px] border-primary text-sm font-semibold text-primary hover:bg-primary-50 transition-colors"
        role="button"
        aria-label={t('inbox.signIn')}
      >
        {t('inbox.signIn')}
      </button>
    </div>
  )
}

function ErrorState({ t, onRetry }: { t: (k: string) => string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-5xl">{'\u{26A0}'}</span>
      <p className="text-base font-semibold text-text mt-2">{t('inbox.errorTitle')}</p>
      <p className="text-sm text-text-muted text-center px-6">{t('inbox.errorSubtitle')}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-md border-[1.5px] border-primary text-sm font-semibold text-primary hover:bg-primary-50 transition-colors mt-2"
        role="button"
        aria-label={t('inbox.retry')}
      >
        {t('inbox.retry')}
      </button>
    </div>
  )
}

function InboxOfflineBanner({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2 bg-warning-light border-b border-warning px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-warning" />
      <span className="text-sm font-semibold text-[#92400E]">{t('inbox.offlineBanner')}</span>
    </div>
  )
}

function groupMessagesByDay(messages: Message[], t: (k: string, o?: any) => string) {
  const result: (Message | { id: string; type: 'separator'; label: string })[] = []
  let lastDay = ''
  for (const msg of messages) {
    const day = dayLabel(msg.createdAt, t)
    if (day !== lastDay) {
      result.push({ id: `sep-${day}`, type: 'separator', label: day })
      lastDay = day
    }
    result.push(msg)
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

function AssistantView() {
  const { t } = useTranslation()
  const router = useRouter()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    try {
      const stored = localStorage.getItem('chinooz-assistant')
      if (stored) setMessages(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (loaded.current && messages.length > 0) {
      try { localStorage.setItem('chinooz-assistant', JSON.stringify(messages)) } catch {}
    }
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, thinking])

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
  }, [input, thinking])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = useCallback(() => {
    setMessages([])
    setShowClearDialog(false)
    localStorage.removeItem('chinooz-assistant')
  }, [])

  const showIntro = messages.length === 0

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-warning-light flex items-center justify-center shrink-0 text-lg">
          {'\u{1F916}'}
        </div>
        <p className="text-base font-semibold text-text">{t('inbox.assistant')}</p>
        <div className="flex-1" />
        <button
          onClick={() => setShowClearDialog(true)}
          className="text-lg text-text-muted hover:text-text transition-colors"
          aria-label={t('inbox.clearConversation')}
        >
          {'\u{1F5D1}'}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" aria-live="polite">
        {showIntro && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-warning-light flex items-center justify-center text-2xl">
              {'\u{1F916}'}
            </div>
            <p className="text-base font-semibold text-text text-center px-6">
              {t('inbox.assistantGreeting')}
            </p>
            <div className="flex flex-wrap justify-center gap-2 px-4 mt-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={p.key}
                  onClick={() => handleSend(p.label)}
                  className="px-4 py-2 rounded-full bg-white border border-border text-sm font-medium text-text-secondary hover:bg-background active:scale-[0.97] transition-all duration-150"
                  style={{ animationDelay: `${i * 50}ms` }}
                  role="button"
                  aria-label={t(`inbox.suggested${p.key.charAt(0).toUpperCase() + p.key.slice(1)}`)}
                >
                  {t(`inbox.suggested${p.key.charAt(0).toUpperCase() + p.key.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isMine = msg.from === 'user'
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl text-base leading-6 font-normal animate-[bubble-in_300ms_ease] ${
                  isMine
                    ? 'bg-primary text-white rounded-bl-sm max-w-[75%]'
                    : 'bg-white border border-border text-text rounded-br-sm max-w-[85%]'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {msg.products && msg.products.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto max-w-full pb-1">
                  {msg.products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/product/${p.slug}`)}
                      className="flex-shrink-0 w-[140px] bg-white border border-border rounded-lg p-2.5 flex flex-col gap-1 text-left hover:bg-background transition-colors"
                      role="button"
                      aria-label={`${p.name}. NPR ${p.price.toLocaleString()}`}
                    >
                      <div className="w-full h-20 rounded-md bg-border-light flex items-center justify-center text-2xl">
                        {'\u{1F4E6}'}
                      </div>
                      <p className="text-xs font-semibold text-text line-clamp-2">{p.name}</p>
                      <p className="text-xs font-semibold text-primary">NPR {p.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}

              {msg.quickLinks && msg.quickLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.quickLinks.map((link, i) => (
                    <button
                      key={i}
                      onClick={() => router.push(link.route)}
                      className="px-3 py-1.5 rounded-full bg-primary-50 text-xs font-semibold text-primary hover:bg-primary-100 transition-colors"
                      role="button"
                      aria-label={link.label}
                    >
                      {link.label} {'\u{203A}'}
                    </button>
                  ))}
                </div>
              )}

              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (action.type === 'view_product' && action.productId) router.push(`/product/${action.productId}`)
                        else if (action.type === 'open_deals') router.push('/deals')
                        else if (action.type === 'open_orders') router.push('/orders')
                        else if (action.type === 'open_categories') router.push('/categories')
                      }}
                      className="px-4 py-2 rounded-md border border-primary text-sm font-semibold text-primary hover:bg-primary-50 active:scale-95 transition-all"
                      role="button"
                      aria-label={action.label}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {thinking && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 bg-white border border-border rounded-2xl rounded-br-sm px-4 py-3">
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_infinite]" />
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_0.15s_infinite]" />
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_0.3s_infinite]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 p-3 border-t border-border">
        <textarea
          className="flex-1 min-h-[44px] max-h-[120px] bg-white border border-border rounded-2xl px-4 py-2.5 text-base text-text font-normal resize-none outline-none placeholder:text-text-tertiary"
          placeholder={t('inbox.typeMessage')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label={t('inbox.typeMessage')}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || thinking}
          className={`w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 transition-all duration-100 ${input.trim() ? 'hover:bg-primary-dark active:scale-95' : 'opacity-50 cursor-not-allowed'}`}
          aria-label={t('inbox.send')}
        >
          <span className="text-base">{'\u{27A4}'}</span>
        </button>
      </div>

      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl p-6 mx-8 max-w-sm w-full gap-3 flex flex-col">
            <h3 className="text-base font-semibold text-text">{t('inbox.clearConversation')}</h3>
            <p className="text-sm text-text-muted">{t('inbox.clearConfirm')}</p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setShowClearDialog(false)}
                className="px-4 py-2 rounded-md text-sm font-semibold text-text-muted hover:bg-background transition-colors"
              >
                {t('inbox.cancel')}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-md bg-error text-white text-sm font-semibold hover:bg-error/90 transition-colors"
              >
                {t('inbox.clear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    case 'order': return '#DBEAFE'
    case 'promo': return '#FEF3C7'
    case 'price_drop': return '#DCFCE7'
    case 'system': return '#F0F0F0'
    case 'message': return '#DBEAFE'
    default: return '#F0F0F0'
  }
}

function notifTypeColor(type: NotificationType): string {
  switch (type) {
    case 'order': return '#2563EB'
    case 'promo': return '#E0A93B'
    case 'price_drop': return '#16A34A'
    case 'system': return '#6B7280'
    case 'message': return '#2563EB'
    default: return '#6B7280'
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
