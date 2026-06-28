import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Check, ChevronRight, Package, Tag, User } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

interface ChecklistItem {
  key: string
  labelKey: string
  descKey: string
  done: boolean
  route: string
  icon: React.ComponentType<any>
}

interface Props {
  items: ChecklistItem[]
  onItemPress: (route: string) => void
}

export default function GoLiveChecklist({ items, onItemPress }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const doneCount = items.filter(i => i.done).length
  const total = items.length
  const progress = total > 0 ? doneCount / total : 0

  const barWidth = useSharedValue(reduced ? progress : 0)

  React.useEffect(() => {
    barWidth.value = reduced ? progress : withTiming(progress, { duration: 400, easing: Easing.bezier(...easing.easeOut) })
  }, [progress, reduced])

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }))

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{t('seller.setup.checklistTitle')}</Text>
        <Text style={styles.subtitle}>{t('seller.setup.checklistSubtitle')}</Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, barStyle]} />
        </View>
        <Text
          style={styles.progressLabel}
          accessibilityRole="text"
          accessibilityLabel={t('seller.setup.checklistProgress', { done: doneCount, total })}
        >
          {t('seller.setup.checklistProgress', { done: doneCount, total })}
        </Text>
      </View>

      <View style={styles.items}>
        {items.map((item, i) => (
          <ChecklistRow
            key={item.key}
            item={item}
            index={i}
            reduced={reduced}
            onPress={() => onItemPress(item.route)}
            t={t}
          />
        ))}
      </View>
    </View>
  )
}

function ChecklistRow({ item, index, reduced, onPress, t }: {
  item: ChecklistItem; index: number; reduced: boolean; onPress: () => void; t: any
}) {
  const Icon = item.icon
  const checkScale = useSharedValue(item.done ? 1 : 0)

  React.useEffect(() => {
    if (item.done && !reduced) {
      checkScale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      )
    } else {
      checkScale.value = reduced ? (item.done ? 1 : 0) : withSpring(item.done ? 1 : 0, { damping: 15, stiffness: 300 })
    }
  }, [item.done, reduced])

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }))

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.done }}
      accessibilityLabel={t(item.labelKey)}
      style={[styles.itemCard, item.done && styles.itemCardDone]}
    >
      <Animated.View style={[styles.checkbox, item.done && styles.checkboxDone, checkStyle]}>
        {item.done && <Check size={14} color={colors.white} strokeWidth={3} />}
      </Animated.View>
      <View style={styles.itemIconWrap}>
        <Icon size={18} color={item.done ? colors.primary : colors.textMuted} strokeWidth={2} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemLabel, item.done && styles.itemLabelDone]}>{t(item.labelKey)}</Text>
        <Text style={styles.itemDesc}>{t(item.descKey)}</Text>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  header: { gap: 2 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  subtitle: { fontSize: 14, color: colors.textMuted },
  progressWrap: { gap: spacing[1.5] },
  progressBar: { height: 6, backgroundColor: colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  items: { gap: spacing[2.5] },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    backgroundColor: colors.surface, paddingHorizontal: spacing[3.5], paddingVertical: spacing[3],
  },
  itemCardDone: { borderColor: colors.primary50, backgroundColor: colors.primary50 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { fontSize: 16, fontWeight: '400', color: colors.text },
  itemLabelDone: { color: colors.primary, fontWeight: '600' },
  itemDesc: { fontSize: 13, color: colors.textMuted },
})
