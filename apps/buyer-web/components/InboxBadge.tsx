'use client'

import { useUnreadNotificationCount, useUnreadMessageCount } from '@chinooz/hooks'

export function InboxBadge() {
  const { data: notifCount } = useUnreadNotificationCount()
  const { data: msgCount } = useUnreadMessageCount()
  const total = (notifCount ?? 0) + (msgCount ?? 0)

  if (total === 0) return null

  return (
    <span
      className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
      aria-label={`${total} unread`}
    >
      {total > 99 ? '99+' : total}
    </span>
  )
}
