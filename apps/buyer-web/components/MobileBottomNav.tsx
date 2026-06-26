'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

const tabItems = [
  { href: '/', labelKey: 'nav.home', icon: '🏠' },
  { href: '/categories', labelKey: 'nav.categories', icon: '📂' },
  { href: '/deals', labelKey: 'nav.deals', icon: '🔥', isCenter: true },
  { href: '/inbox', labelKey: 'nav.inbox', icon: '💬' },
  { href: '/profile', labelKey: 'nav.profile', icon: '👤' },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-navbar bg-white border-t border-border">
      <div className="flex items-end justify-around h-[68px] pb-2">
        {tabItems.map(tab => {
          const isActive = pathname === tab.href

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center -mt-5"
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    isActive ? 'bg-primary' : 'bg-primary-50'
                  }`}
                >
                  <span className="text-2xl">{tab.icon}</span>
                </div>
                <span
                  className={`text-[9px] font-bold mt-0.5 ${
                    isActive ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  {t(tab.labelKey)}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px]"
            >
              <span className={`text-xl ${isActive ? '' : 'opacity-50'}`}>{tab.icon}</span>
              <span
                className={`text-[10px] font-medium mt-0.5 ${
                  isActive ? 'text-primary font-bold' : 'text-text-muted'
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
