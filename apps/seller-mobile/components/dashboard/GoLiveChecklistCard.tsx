import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle } from 'lucide-react-native'
import { colors } from '../../lib/theme'
import type { GoLiveTask } from './helpers'
import { styles } from './styles'

export function GoLiveChecklistCard({
  tasks,
  done,
  total,
  onContinue,
}: {
  tasks: GoLiveTask[]
  done: number
  total: number
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <View style={styles.card}>
      <Text style={styles.goLiveTitle}>{t('seller.dashboard.goLiveTitle')}</Text>
      <Text style={styles.goLiveSubtitle}>{t('seller.dashboard.goLiveSubtitle')}</Text>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.goLiveProgress}>{t('seller.dashboard.goLiveProgress', { done, total })}</Text>
      <View style={styles.checklistRows}>
        {tasks.map(task => (
          <View key={task.id} style={styles.checklistRow}>
            {task.done ? (
              <CheckCircle2 size={20} color={colors.success} />
            ) : (
              <Circle size={20} color={colors.textTertiary} />
            )}
            <Text style={[styles.checklistLabel, task.done && styles.checklistLabelDone]}>{task.label}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.goLiveContinueBtn} onPress={onContinue} accessibilityRole="button">
        <Text style={styles.goLiveContinueText}>{t('seller.dashboard.goLiveContinue')}</Text>
      </TouchableOpacity>
    </View>
  )
}
