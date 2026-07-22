import { Container, Screen } from '@chinooz/ui-web'
import Link from 'next/link'
import { getT } from '@/lib/i18n/server'

export default async function NotFound() {
  const { t } = await getT()

  return (
    <Screen>
      <Container className="py-20 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <p className="text-sm text-text-muted mb-6">
          {t('common.pageNotFound')}
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          {t('common.goHome')}
        </Link>
      </Container>
    </Screen>
  )
}
