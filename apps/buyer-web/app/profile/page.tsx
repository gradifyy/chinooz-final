'use client'

import { Container, Screen, Stack, Divider } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@chinooz/state'

const menuItems = [
  { key: 'profile.myOrders', icon: '📦', href: '/orders' },
  { key: 'profile.wishlist', icon: '❤️', href: null },
  { key: 'profile.addresses', icon: '📍', href: null },
  { key: 'profile.settings', icon: '⚙️', href: null },
  { key: 'profile.help', icon: '❓', href: null },
]

export default function ProfilePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ne' : 'en')
  }

  return (
    <Screen>
      <Container className="py-6 max-w-lg">
        <Stack gap={5}>
          <div>
            <h1 className="text-2xl font-bold text-text">{t('profile.title')}</h1>
            <p className="text-sm text-text-muted mt-1">{t('profile.subtitle')}</p>
          </div>

          <hr className="border-border" />

          <button
            onClick={toggleLocale}
            className="flex items-center justify-between w-full py-4 px-1 hover:bg-background rounded-lg transition-colors"
          >
            <span className="text-base font-medium text-text">{t('profile.language')}</span>
            <span className="bg-primary-50 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
              {locale === 'en' ? t('profile.nepali') : t('profile.english')}
            </span>
          </button>

          <hr className="border-border" />

          {menuItems.map(item => (
            <button
              key={item.key}
              onClick={() => item.href && router.push(item.href)}
              className="flex items-center gap-3 w-full py-3.5 px-1 hover:bg-background rounded-lg transition-colors text-left"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-base text-text">{t(item.key)}</span>
            </button>
          ))}
        </Stack>
      </Container>
    </Screen>
  )
}
