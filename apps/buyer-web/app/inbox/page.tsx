'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Screen, Container, SegmentedControl, EmptyState, Skeleton, Avatar } from '@chinooz/ui-web'
import { useNotifications, useConversations, useMessages } from '@chinooz/hooks'
import { useInboxStore } from '@chinooz/state'
import type { InboxTab } from '@chinooz/types'
import type { Notification, Conversation, Message } from '@chinooz/types'

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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton width={40} height={40} circle />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="70%" height={14} />
              <Skeleton width="90%" height={12} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-5xl">{'\u{1F514}'}</span>}
        title={t('emptyState.noNotifications')}
        subtitle={t('emptyState.noNotificationsSubtitle')}
      />
    )
  }

  return (
    <div className="flex flex-col">
      {notifications.map(item => (
        <button
          key={item.id}
          className={`flex items-start gap-3 p-3 border-b border-border-light text-left hover:bg-background transition-colors ${
            !item.read ? 'bg-primary/5' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-border-light flex items-center justify-center shrink-0 text-xl">
            {notifEmoji(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">{item.title}</p>
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{item.body}</p>
            <p className="text-[10px] text-text-tertiary mt-1">{formatTime(item.createdAt)}</p>
          </div>
          {!item.read && (
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
          )}
        </button>
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
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton width={44} height={44} circle />
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
      {conversations.map(item => (
        <button
          key={item.id}
          onClick={() => setSelectedConvo(item.id)}
          className="flex items-center gap-3 p-3 border-b border-border-light text-left hover:bg-background transition-colors"
        >
          <Avatar name={item.participantName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text truncate">{item.participantName}</p>
              <span className="text-[10px] text-text-tertiary ml-2 shrink-0">
                {formatTime(item.lastMessageAt)}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 truncate">{item.lastMessage}</p>
          </div>
          {item.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center bg-primary text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 shrink-0">
              {item.unreadCount}
            </span>
          )}
        </button>
      ))}
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
