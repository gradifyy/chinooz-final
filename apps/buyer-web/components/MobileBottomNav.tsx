'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/categories', label: 'Categories', icon: '📂' },
  { href: '/deals', label: 'Deals', icon: '🔥', isCenter: true },
  { href: '/inbox', label: 'Inbox', icon: '💬' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-navbar bg-white border-t border-border">
      <div className="flex items-end justify-around h-[68px] pb-2">
        {tabs.map(tab => {
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
                  {tab.label}
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
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
