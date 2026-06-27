'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'

export default function ContactPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const cards = [
    { key: 'chat', icon: '💬', titleKey: 'contact.chatTitle', descKey: 'contact.chatDesc', btnKey: 'contact.chatButton', btnStyle: 'primary' as const, href: '/inbox?tab=assistant' },
    { key: 'email', icon: '✉️', titleKey: 'contact.emailTitle', descKey: 'contact.emailDesc', btnKey: 'contact.emailButton', btnStyle: 'outline' as const, href: 'mailto:support@chinooz.com' },
    { key: 'phone', icon: '📞', titleKey: 'contact.phoneTitle', descKey: 'contact.phoneDesc', btnKey: 'contact.phoneButton', btnStyle: 'outline' as const, href: 'tel:+97714XXXXXX' },
  ]

  return (
    <Screen>
      <Container className="py-6 max-w-[600px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('contact.title')}</h1>
        </div>

        <div className="space-y-3">
          {cards.map(card => (
            <div key={card.key} className="bg-surface rounded-2xl p-4 shadow-sm">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-base font-semibold text-text mt-2">{t(card.titleKey)}</h3>
              <p className="text-sm text-text-muted mt-1">{t(card.descKey)}</p>
              {card.href.startsWith('/') ? (
                <button onClick={() => router.push(card.href)} className={`mt-3 h-11 rounded-lg w-full font-semibold text-sm transition-colors ${card.btnStyle === 'primary' ? 'bg-primary text-white hover:bg-primary-dark' : 'border-[1.5px] border-primary text-primary hover:bg-primary-50'}`} aria-label={t(card.btnKey)}>
                  {t(card.btnKey)}
                </button>
              ) : (
                <a href={card.href} className={`mt-3 h-11 rounded-lg w-full font-semibold text-sm transition-colors flex items-center justify-center ${card.btnStyle === 'primary' ? 'bg-primary text-white hover:bg-primary-dark' : 'border-[1.5px] border-primary text-primary hover:bg-primary-50'}`} aria-label={t(card.btnKey)}>
                  {t(card.btnKey)}
                </a>
              )}
            </div>
          ))}
        </div>
      </Container>
    </Screen>
  )
}
