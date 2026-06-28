import React from 'react'
import { Bike } from 'lucide-react-native'
import { colors } from '@chinooz/theme'
import { useTranslation } from 'react-i18next'
import ComingSoonScreen from '../../components/ComingSoonScreen'

export default function VehicleScreen() {
  const { t } = useTranslation()
  return (
    <ComingSoonScreen
      title={t('rider.profile.rowVehicleDocs')}
      icon={<Bike size={28} color={colors.textSecondary} />}
    />
  )
}
