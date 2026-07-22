'use client'

const MS_DAY = 86400000

export { MS_DAY }

export function SignInPrompt({ t, onSignIn }: { t: (k: string) => string; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <span className="text-5xl">{'\u{1F512}'}</span>
      <p className="text-base font-semibold text-text text-center px-6">{t('inbox.signInPrompt')}</p>
      <button
        onClick={onSignIn}
        className="px-6 py-3 rounded-md border-medium border-primary text-sm font-semibold text-primary hover:bg-primary-50 transition-colors"
        aria-label={t('inbox.signIn')}
      >
        {t('inbox.signIn')}
      </button>
    </div>
  )
}

export function ErrorState({ t, onRetry }: { t: (k: string) => string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-5xl">{'\u{26A0}'}</span>
      <p className="text-base font-semibold text-text mt-2">{t('inbox.errorTitle')}</p>
      <p className="text-sm text-text-muted text-center px-6">{t('inbox.errorSubtitle')}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-md border-medium border-primary text-sm font-semibold text-primary hover:bg-primary-50 transition-colors mt-2"
        aria-label={t('inbox.retry')}
      >
        {t('inbox.retry')}
      </button>
    </div>
  )
}

export function InboxOfflineBanner({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2 bg-warning-light border-b border-warning px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-warning" />
      <span className="text-sm font-semibold text-warning-text">{t('inbox.offlineBanner')}</span>
    </div>
  )
}

export function formatTime(iso: string, t?: (k: string, o?: Record<string, unknown>) => string): string {
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
