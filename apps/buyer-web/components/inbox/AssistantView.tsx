'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { assistantService, type AssistantMessage, SUGGESTED_PROMPTS } from '@chinooz/mock-data'

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

export function AssistantView() {
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
    } catch (err) { console.error('Failed to load assistant messages', err) }
  }, [])

  useEffect(() => {
    if (loaded.current && messages.length > 0) {
      try { localStorage.setItem('chinooz-assistant', JSON.stringify(messages)) } catch (err) { console.error('Failed to persist assistant messages', err) }
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
                  className="px-4 py-2 rounded-full bg-surface border border-border text-sm font-medium text-text-secondary hover:bg-background active:scale-[0.97] transition-all duration-150"
                  style={{ animationDelay: `${i * 50}ms` }}
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
                    : 'bg-surface border border-border text-text rounded-br-sm max-w-[85%]'
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
                      className="flex-shrink-0 w-[140px] bg-surface border border-border rounded-lg p-2.5 flex flex-col gap-1 text-left hover:bg-background transition-colors"
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
            <div className="flex gap-1.5 bg-surface border border-border rounded-2xl rounded-br-sm px-4 py-3">
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_infinite]" />
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_0.15s_infinite]" />
              <span className="w-2 h-2 rounded-full bg-text-tertiary animate-[dot-bounce_0.4s_ease_0.3s_infinite]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 p-3 border-t border-border">
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
          <div className="bg-surface rounded-xl p-6 mx-8 max-w-sm w-full gap-3 flex flex-col">
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
