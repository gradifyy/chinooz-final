import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors as lightColors, spacing, radii, fontSz } from '@chinooz/theme'
import { BottomSheet, PressScale } from '@chinooz/ui'
import { useAppTheme } from './ThemeProvider'

export interface SortOption {
  key: string
  labelKey: string
}

interface SortSheetProps {
  visible: boolean
  onClose: () => void
  options: SortOption[]
  activeKey: string
  onSelect: (key: string) => void
}

export default function SortSheet({
  visible,
  onClose,
  options,
  activeKey,
  onSelect,
}: SortSheetProps) {
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('categories.sortBy')}>
      <View style={styles.body}>
        {options.map(opt => {
          const isActive = opt.key === activeKey
          return (
            <PressScale
              key={opt.key}
              onPress={() => {
                onSelect(opt.key)
                onClose()
              }}
              haptic="selection"
              style={[styles.row, isActive ? styles.rowActive : null]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={t(opt.labelKey)}
            >
              <View style={[styles.radio, isActive ? styles.radioActive : null]}>
                {isActive ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.rowText, isActive ? styles.rowTextActive : null]}>
                {t(opt.labelKey)}
              </Text>
            </PressScale>
          )
        })}
      </View>
    </BottomSheet>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[1],
      paddingBottom: spacing[2],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      borderRadius: radii.lg,
      gap: spacing[3],
    },
    rowActive: {
      backgroundColor: c.primary50,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: {
      borderColor: c.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: radii.sm,
      backgroundColor: c.primary,
    },
    rowText: {
      fontSize: fontSz('md')[0],
      color: c.text,
    },
    rowTextActive: {
      color: c.primary,
      fontWeight: '600',
    },
  })
