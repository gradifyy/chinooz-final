import { Container, Screen } from '@chinooz/ui-web'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <Screen>
      <Container className="py-20 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <p className="text-sm text-text-muted mb-6">
          {t('seller.notFoundTitle')}
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          {t('seller.notFoundCta')}
        </Link>
      </Container>
    </Screen>
  )
}
