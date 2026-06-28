'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Megaphone,
  MessageSquare,
  Star,
  Wallet,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react'
import { useSellerSessionStore, useSellerMessagesStore } from '@chinooz/state'
import { useA11y } from './A11yProvider'

interface NavItem {
  href: string
  labelKey: string
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>
  badge?: number
}

interface NavSection {
  headerKey?: string
  items: NavItem[]
}

export function SellerShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { reducedMotion } = useA11y()
  const store = useSellerSessionStore(s => s.store)
  const seller = useSellerSessionStore(s => s.seller)
  const messageStore = useSellerMessagesStore()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const unreadMessages = messageStore.unreadCount
  const unreadReviews = 1
  const newOrders = 2
  const notifCount = 3

  const storeName = store?.name ?? seller.name ?? t('seller.nav.storeName')
  const initial = storeName.charAt(0).toUpperCase()

  const mainNav: NavItem[] = [
    { href: '/dashboard', labelKey: 'seller.nav.dashboard', Icon: LayoutDashboard },
    { href: '/products', labelKey: 'seller.nav.products', Icon: Package },
    { href: '/orders', labelKey: 'seller.nav.orders', Icon: ClipboardList, badge: newOrders },
  ]

  const secondarySections: NavSection[] = [
    {
      headerKey: 'seller.nav.sectionManage',
      items: [
        { href: '/promotions', labelKey: 'seller.nav.promotions', Icon: Megaphone },
        { href: '/finance', labelKey: 'seller.nav.finance', Icon: Wallet },
        { href: '/analytics', labelKey: 'seller.nav.analytics', Icon: BarChart3 },
      ],
    },
    {
      headerKey: 'seller.nav.sectionCommunicate',
      items: [
        { href: '/messages', labelKey: 'seller.nav.messages', Icon: MessageSquare, badge: unreadMessages },
        { href: '/reviews', labelKey: 'seller.nav.reviews', Icon: Star, badge: unreadReviews },
      ],
    },
    {
      items: [
        { href: '/settings', labelKey: 'seller.nav.settings', Icon: Settings },
      ],
    },
  ]

  const mobileNav: NavItem[] = [
    { href: '/dashboard', labelKey: 'seller.nav.dashboard', Icon: LayoutDashboard },
    { href: '/products', labelKey: 'seller.nav.products', Icon: Package },
    { href: '/orders', labelKey: 'seller.nav.orders', Icon: ClipboardList, badge: newOrders },
  ]

  const mobileMore: NavItem[] = [
    { href: '/promotions', labelKey: 'seller.nav.promotions', Icon: Megaphone },
    { href: '/messages', labelKey: 'seller.nav.messages', Icon: MessageSquare, badge: unreadMessages },
    { href: '/reviews', labelKey: 'seller.nav.reviews', Icon: Star, badge: unreadReviews },
    { href: '/finance', labelKey: 'seller.nav.finance', Icon: Wallet },
    { href: '/analytics', labelKey: 'seller.nav.analytics', Icon: BarChart3 },
    { href: '/settings', labelKey: 'seller.nav.settings', Icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarWidth = collapsed ? 72 : 240

  // Don't render shell on public routes
  const publicRoutes = ['/onboarding', '/login', '/signup', '/']
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside
          className="fixed inset-y-0 left-0 z-30 bg-surface border-r border-border-light flex flex-col transition-all duration-200"
          style={{ width: sidebarWidth }}
          aria-label={t('seller.title')}
        >
          {/* Logo / store header */}
          <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border-light shrink-0">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary shrink-0"
              aria-hidden="true"
            >
              <span className="text-white text-sm font-bold">{initial}</span>
            </span>
            {!collapsed && (
              <span className="text-sm font-semibold text-text truncate">{storeName}</span>
            )}
          </div>

          {/* Add product button */}
          <div className="px-3 pt-3 pb-2">
            <Link
              href="/products"
              className="flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
              style={{ width: collapsed ? 40 : '100%' }}
              aria-label={t('seller.nav.addAria')}
            >
              <Plus size={18} strokeWidth={2.5} />
              {!collapsed && <span>{t('seller.nav.add')}</span>}
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              {mainNav.map(item => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  t={t}
                  reduced={reducedMotion}
                />
              ))}
            </div>

            {secondarySections.map((section, si) => (
              <div key={si} className="flex flex-col gap-0.5">
                {section.headerKey && !collapsed && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted px-3 py-1.5">
                    {t(section.headerKey)}
                  </span>
                )}
                {section.items.map(item => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    t={t}
                    reduced={reducedMotion}
                  />
                ))}
              </div>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? t('seller.nav.expand') : t('seller.nav.collapse')}
            className="h-10 flex items-center justify-center border-t border-border-light text-text-muted hover:text-text hover:bg-background transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </aside>
      )}

      {/* Main content area */}
      <div
        className="flex flex-col min-h-screen flex-1"
        style={{ marginLeft: !isMobile ? sidebarWidth : 0 }}
      >
        {/* Top bar */}
        <header
          className="h-14 bg-surface border-b border-border-light flex items-center justify-between px-4 sticky top-0 z-20 shrink-0"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center gap-2.5">
            {isMobile && (
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary shrink-0"
                aria-hidden="true"
              >
                <span className="text-white text-sm font-bold">{initial}</span>
              </span>
            )}
            <span className="text-base font-semibold text-text truncate">{storeName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label={t('seller.nav.searchAria')}
              className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-background transition-colors"
            >
              <Search size={20} className="text-text" />
            </button>
            <button
              aria-label={t('seller.nav.notificationsAria', { count: notifCount })}
              className="relative h-10 w-10 flex items-center justify-center rounded-md hover:bg-background transition-colors"
            >
              <Bell size={20} className="text-text" />
              {notifCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-semibold flex items-center justify-center"
                  aria-label={t('seller.nav.notificationsAria', { count: notifCount })}
                >
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border-light flex items-center justify-around px-2 pt-1.5"
            style={{ height: 56 + 8, paddingBottom: 8, boxShadow: '0 -2px 4px 0 rgba(0,0,0,0.06)' }}
            aria-label={t('seller.title')}
          >
            {mobileNav.map(item => (
              <MobileTab
                key={item.href}
                item={item}
                active={isActive(item.href)}
                t={t}
                reduced={reducedMotion}
              />
            ))}

            {/* Center Add */}
            <Link
              href="/products"
              aria-label={t('seller.nav.addAria')}
              className="flex items-center justify-center rounded-full bg-primary shrink-0 hover:bg-primary-dark transition-colors"
              style={{
                width: 56,
                height: 56,
                marginTop: -16,
                boxShadow: '0 2px 4px 0 rgba(0,0,0,0.08)',
              }}
            >
              <Plus size={28} className="text-white" strokeWidth={2.5} />
            </Link>

            {/* More */}
            <MobileMoreTab
              items={mobileMore}
              t={t}
              reduced={reducedMotion}
              aggregateBadge={unreadMessages + unreadReviews}
            />
          </nav>
        )}
      </div>
    </div>
  )
}

function NavLink({
  item,
  active,
  collapsed,
  t,
  reduced,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  t: (k: string, o?: any) => string
  reduced: boolean
}) {
  const Icon = item.Icon
  const color = active ? '#8A1B57' : '#6B7280'

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={t(item.labelKey)}
      className={`relative flex items-center gap-2.5 h-11 rounded-md px-3 transition-colors ${
        active ? 'bg-[rgba(138,27,87,0.1)] text-primary' : 'text-text-muted hover:bg-background hover:text-text'
      }`}
      style={{
        transitionDuration: reduced ? '0ms' : '150ms',
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-primary"
          aria-hidden="true"
        />
      )}
      <Icon
        size={20}
        color={color}
        strokeWidth={active ? 2.5 : 2}
        fill={active ? color : 'none'}
      />
      {!collapsed && (
        <span className={`text-sm ${active ? 'font-semibold text-primary' : 'font-medium text-text-muted'}`}>
          {t(item.labelKey)}
        </span>
      )}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-error text-white text-[11px] font-semibold flex items-center justify-center">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
      {collapsed && item.badge != null && item.badge > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-semibold flex items-center justify-center">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  )
}

function MobileTab({
  item,
  active,
  t,
  reduced,
}: {
  item: NavItem
  active: boolean
  t: (k: string, o?: any) => string
  reduced: boolean
}) {
  const Icon = item.Icon
  const color = active ? '#8A1B57' : '#6B7280'

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={t(item.labelKey)}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px] min-h-[44px] transition-colors"
      style={{ transitionDuration: reduced ? '0ms' : '150ms' }}
    >
      <div className="relative">
        <Icon
          size={24}
          color={color}
          strokeWidth={active ? 2.5 : 2}
          fill={active ? color : 'none'}
        />
        {item.badge != null && item.badge > 0 && (
          <span
            className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-semibold flex items-center justify-center"
            aria-label={t('seller.nav.newOrders', { count: item.badge })}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <span
        className={`text-[11px] ${active ? 'font-semibold text-primary' : 'font-medium text-text-muted'}`}
      >
        {t(item.labelKey)}
      </span>
    </Link>
  )
}

function MobileMoreTab({
  items,
  t,
  reduced,
  aggregateBadge,
}: {
  items: NavItem[]
  t: (k: string, o?: any) => string
  reduced: boolean
  aggregateBadge: number
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const isActive = items.some(i => pathname.startsWith(i.href))

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('seller.nav.more')}
        aria-current={isActive ? 'page' : undefined}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px] min-h-[44px]"
      >
        <div className="relative">
          <Settings
            size={24}
            color={isActive ? '#8A1B57' : '#6B7280'}
            strokeWidth={isActive ? 2.5 : 2}
            fill={isActive ? '#8A1B57' : 'none'}
          />
          {aggregateBadge > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-semibold flex items-center justify-center">
              {aggregateBadge > 99 ? '99+' : aggregateBadge}
            </span>
          )}
        </div>
        <span className={`text-[11px] ${isActive ? 'font-semibold text-primary' : 'font-medium text-text-muted'}`}>
          {t('seller.nav.more')}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          <div
            className="absolute bottom-[72px] right-2 w-64 bg-surface rounded-lg border border-border-light overflow-hidden"
            style={{ boxShadow: '0 4px 8px 0 rgba(0,0,0,0.10)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col">
              {items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 h-12 px-4 hover:bg-background transition-colors"
                >
                  <item.Icon size={20} className="text-text-muted" />
                  <span className="flex-1 text-sm text-text">{t(item.labelKey)}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1 rounded-full bg-error text-white text-[11px] font-semibold flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
