'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { EmptyState, Skeleton } from '@chinooz/ui-web'
import { useMessages, useSendMessage, useMarkConversationRead } from '@chinooz/hooks'
import type { Conversation, Message } from '@chinooz/types'
import { SignInPrompt, ErrorState, InboxOfflineBanner, formatTime, MS_DAY } from './InboxShared'
import { mockReply } from './AssistantView'

export function MessagesView({
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
            className={`flex items-center gap-3 w-full p-3 text-left border-b border-border-light hover:bg-background active:scale-[0.98] transition-all duration-100 ${isUnread ? 'bg-surface' : 'bg-transparent'}`}
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
  }, [conversationId, markReadMutation])

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
      } catch (err) { console.error('Failed to queue offline message', err) }
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
  }, [input, conversationId, convo, isOffline, sendMessageMutation])

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
                  className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3 mb-1 max-w-[75%] text-left hover:bg-background transition-colors"
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
                    : 'bg-surface border border-border text-text rounded-br-sm'
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
            <div className="flex gap-1.5 bg-surface border border-border rounded-2xl rounded-br-sm px-4 py-3">
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
          className="flex-1 min-h-[44px] max-h-[120px] bg-surface border border-border rounded-2xl px-4 py-2.5 text-base text-text font-normal resize-none outline-none placeholder:text-text-tertiary"
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

function groupMessagesByDay(messages: Message[], t: (k: string, o?: Record<string, unknown>) => string) {
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

function dayLabel(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < MS_DAY && d.getDate() === now.getDate()) return t('inbox.today')
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return t('inbox.yesterday')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
