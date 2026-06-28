import React from 'react'
import { Shield } from 'lucide-react-native'
import { colors } from '@chinooz/theme'
import { useTranslation } from 'react-i18next'
import ComingSoonScreen from '../../components/ComingSoonScreen'

export default function SecurityScreen() {
  const { t } = useTranslation()
  return (
    <ComingSoonScreen
      title={t('rider.profile.rowAccountSecurity')}
      icon={<Shield size={28} color={colors.textSecondary} />}
    />
  )
}
