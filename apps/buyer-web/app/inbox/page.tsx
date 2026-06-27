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
} from '@chinooz/hooks'
import { useInboxStore } from '@chinooz/state'
import type { InboxTab } from '@chinooz/types'
import type { Notification, NotificationType, Conversation, Message } from '@chinooz/types'

const TAB_KEYS: InboxTab[] = ['notifications', 'messages', 'assistant']

export default function InboxPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeTab, setActiveTab } = useInboxStore()
  const initialized = useRef(false)

  const tabParam = searchParams.get('tab') as InboxTab | null
  const threadParam = searchParams.get('thread') ?? undefined

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
            />
          )}
          {activeTab === 'messages' && (
            <MessagesView
              conversations={conversations ?? []}
              isLoading={loadingConvos}
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
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
        icon={<span className="text-5xl">{'\u{1F514}'}</span>}
        title={t('emptyState.noNotifications')}
        subtitle={t('emptyState.noNotificationsSubtitle')}
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
                  aria-label={`${notif.title}. ${notif.body}. ${formatTime(notif.createdAt)}`}
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
                  <span className="text-xs text-text-muted shrink-0 mt-0.5">{formatTime(notif.createdAt)}</span>
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
      <div className="flex flex-col gap-4">
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
        title={t('emptyState.noMessages')}
        subtitle={t('emptyState.noMessagesSubtitle')}
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
            aria-label={`${item.participantName}. ${item.lastMessage}. ${formatTime(item.lastMessageAt)}${isUnread ? `. ${item.unreadCount} unread` : ''}`}
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
                  {formatTime(item.lastMessageAt)}
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
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton width="60%" height={36} borderRadius={18} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-background">
          <span className="text-lg">{'\u{2190}'}</span>
        </button>
        <p className="text-base font-semibold text-text">{convo?.participantName ?? conversationId}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {(messages ?? []).map(item => {
          const isMine = item.senderId === 'user-1'
          return (
            <div
              key={item.id}
              className={`max-w-[75%] px-4 py-2.5 rounded-xl ${
                isMine
                  ? 'self-end bg-primary text-white rounded-br-sm'
                  : 'self-start bg-border rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-5">{item.body}</p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <input
          className="flex-1 h-10 bg-background rounded-full px-4 text-sm text-text outline-none"
          placeholder={t('inbox.chatPlaceholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
      </div>
    </div>
  )
}

function AssistantView() {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map(item => (
          <div
            key={item.id}
            className={`max-w-[75%] px-4 py-2.5 rounded-xl ${
              item.from === 'user'
                ? 'self-end bg-primary text-white rounded-br-sm'
                : 'self-start bg-border rounded-bl-sm'
            }`}
          >
            <p className="text-sm leading-5">{item.text}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <input
          className="flex-1 h-10 bg-background rounded-full px-4 text-sm text-text outline-none"
          placeholder={t('inbox.chatPlaceholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary-dark transition-colors"
        >
          <span className="text-lg">{'\u{27A4}'}</span>
        </button>
      </div>
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
