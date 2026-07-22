import { colors } from '../../lib/theme'
import type { SellerAlert, SellerDateRangeKey } from '@chinooz/mock-data'

/** Loose t-function shape — matches react-i18next's `t` without pulling in its types. */
type Translate = (key: string, options?: Record<string, unknown>) => string

export type GoLiveTask = { id: string; label: string; done: boolean }

export const RANGE_KEYS: SellerDateRangeKey[] = ['today', '7d', '30d', '90d', 'year']

export function dateLabel(key: SellerDateRangeKey, t: (k: string) => string): string {
  switch (key) {
    case 'today':
      return t('seller.dashboard.rangeToday')
    case '7d':
      return t('seller.dashboard.range7d')
    case '30d':
      return t('seller.dashboard.range30d')
    case '90d':
      return t('seller.dashboard.range90d')
    case 'year':
      return t('seller.dashboard.rangeYear')
    case 'custom':
      return t('seller.dashboard.rangeCustom')
  }
}

export function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function statusInfo(goLive: string): { key: 'live' | 'review' | 'paused'; color: string; bg: string } {
  if (goLive === 'live') return { key: 'live', color: colors.success, bg: colors.successLight }
  if (goLive === 'review') return { key: 'review', color: colors.warning, bg: colors.warningLight }
  return { key: 'paused', color: colors.textMuted, bg: colors.borderLight }
}

/** Translated time-of-day greeting like "Good morning, Ayush". Uses local hour. */
export function timeOfDayGreeting(name: string, t: Translate, now: Date = new Date()): string {
  const h = now.getHours()
  const key =
    h < 12
      ? 'seller.dashboard.greetingMorning'
      : h < 17
        ? 'seller.dashboard.greetingAfternoon'
        : h < 21
          ? 'seller.dashboard.greetingEvening'
          : 'seller.dashboard.greetingNight'
  return t(key, { name })
}

/** First word of a name, trimmed. Falls back to the original string. */
export function firstName(full?: string): string {
  if (!full) return ''
  const trimmed = full.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0]
}

export type BannerHeadline = {
  text: string
  route?: string
  tone: 'urgent' | 'positive' | 'neutral'
}

/**
 * Derive the single most useful headline for the welcome banner from today's
 * alerts. Priority: blocking issues → opportunities → "all caught up".
 */
export function deriveBannerHeadline(
  alerts: SellerAlert[],
  t: Translate,
): BannerHeadline | undefined {
  const byId = (id: string) => alerts.find(a => a.id === id && a.count > 0)

  const newOrders = byId('new-orders')
  if (newOrders) {
    return {
      text: t('seller.dashboard.headlineNewOrders', { count: newOrders.count }),
      route: newOrders.route,
      tone: 'urgent',
    }
  }

  const outOfStock = byId('out-of-stock')
  if (outOfStock) {
    return {
      text: t('seller.dashboard.headlineOutOfStock', { count: outOfStock.count }),
      route: outOfStock.route,
      tone: 'urgent',
    }
  }

  const returns = byId('pending-returns')
  if (returns) {
    return {
      text: t('seller.dashboard.headlineReturns', { count: returns.count }),
      route: returns.route,
      tone: 'urgent',
    }
  }

  const payout = byId('payout-ready')
  if (payout) {
    return {
      text: t('seller.dashboard.headlinePayoutReady'),
      route: payout.route,
      tone: 'positive',
    }
  }

  const messages = byId('unanswered-messages')
  if (messages) {
    return {
      text: t('seller.dashboard.headlineMessages', { count: messages.count }),
      route: messages.route,
      tone: 'neutral',
    }
  }

  const lowStock = byId('low-stock')
  if (lowStock) {
    return {
      text: t('seller.dashboard.headlineLowStock', { count: lowStock.count }),
      route: lowStock.route,
      tone: 'neutral',
    }
  }

  return {
    text: t('seller.dashboard.headlineAllCaughtUp'),
    tone: 'positive',
  }
}
