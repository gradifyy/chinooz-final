'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { EmptyState, Skeleton } from '@chinooz/ui-web'
import { colors } from '@chinooz/theme'
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@chinooz/hooks'
import type { Notification, NotificationType } from '@chinooz/types'
import { SignInPrompt, ErrorState, formatTime, MS_DAY } from './InboxShared'

export function NotificationsView({
  notifications,
  isLoading,
  isError,
  isLoggedIn,
  isOffline: _isOffline,
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
  const [, setCascadePhase] = useState(false)

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
                  className={`relative flex items-start gap-3 w-full p-3 text-left transition-colors border-b border-border-light hover:bg-background ${!notif.read ? 'bg-surface' : 'bg-surface/50'}`}
                  aria-label={`${notif.title}. ${notif.body}. ${formatTime(notif.createdAt, t)}`}
                  aria-pressed={!notif.read}
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
    case 'order': return 'var(--color-info-light)'
    case 'promo': return 'var(--color-warning-light)'
    case 'price_drop': return 'var(--color-success-light)'
    case 'system': return 'var(--color-border-light)'
    case 'message': return 'var(--color-info-light)'
    default: return 'var(--color-border-light)'
  }
}

function notifTypeColor(type: NotificationType): string {
  switch (type) {
    case 'order': return colors.info
    case 'promo': return colors.gold
    case 'price_drop': return colors.success
    case 'system': return 'var(--color-text-muted)'
    case 'message': return colors.info
    default: return 'var(--color-text-muted)'
  }
}
