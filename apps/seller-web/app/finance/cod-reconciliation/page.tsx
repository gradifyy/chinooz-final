import CodReconciliationScreen from '@/components/CodReconciliationScreen'
import RequirePermission from '@/components/RequirePermission'

export const metadata = {
  title: 'COD Reconciliation — Chinooz Seller',
  robots: { index: false, follow: false },
}

export default function CodReconciliationPage() {
  return (
    <RequirePermission permission="finance">
      <CodReconciliationScreen />
    </RequirePermission>
  )
}
