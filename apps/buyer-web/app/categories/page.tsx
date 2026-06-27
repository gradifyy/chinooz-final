'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import CategoryTree from '@/components/CategoryTree'
import OfflineBanner from '@/components/OfflineBanner'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <Screen>
      <OfflineBanner />
      <Container className="py-6">
        {/* Search bar */}
        <button
          onClick={() => router.push('/search')}
          className="w-full h-11 bg-surface rounded-xl border border-border flex items-center px-3 text-sm text-text-muted hover:border-primary/30 transition-colors mb-6"
        >
          🔍 {t('common.searchPlaceholder')}
        </button>

        <h1 className="text-2xl font-bold text-text mb-4">{t('categories.title')}</h1>

        <CategoryTree />
      </Container>
    </Screen>
  )
}
