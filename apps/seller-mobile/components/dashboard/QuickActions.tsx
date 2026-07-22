import React, { useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, useWindowDimensions } from 'react-native'
import { Box, Layers, Plus, Settings, Tag, Wallet } from 'lucide-react-native'
import { colors, spacing } from '../../lib/theme'
import type { SellerQuickAction } from '@chinooz/mock-data'
import { useA11y } from '../A11yProvider'
import { styles } from './styles'

const ACTION_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  plus: Plus,
  box: Box,
  layers: Layers,
  wallet: Wallet,
  tag: Tag,
  settings: Settings,
}

const ACTION_LABEL_KEY: Record<string, string> = {
  'add-product': 'seller.dashboard.actionAddProduct',
  'orders': 'seller.dashboard.actionViewOrders',
  'promotions': 'seller.dashboard.actionCreatePromotion',
  'inventory': 'seller.dashboard.actionUpdateInventory',
  'payouts': 'seller.dashboard.actionViewPayouts',
  'settings': 'seller.dashboard.actionStoreSettings',
}

function QuickActionTile({
  icon: Icon,
  label,
  width,
  reducedMotion,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  width: number
  reducedMotion: boolean
  onPress: () => void
}) {
  const scale = useRef(new Animated.Value(1)).current
  const handlePressIn = () => {
    if (!reducedMotion) Animated.timing(scale, { toValue: 0.96, duration: 100, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    if (!reducedMotion) Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start()
  }
  return (
    <Animated.View style={[styles.quickActionTileWrap, { width, transform: reducedMotion ? [] : [{ scale }] }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.quickActionBtn}
      >
        <View style={styles.quickActionIcon}>
          <Icon size={22} color={colors.primary} />
        </View>
        <Text style={styles.quickActionLabel} numberOfLines={2}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

export function QuickActions({
  actions,
  onPress,
  t,
}: {
  actions: SellerQuickAction[]
  onPress: (id: string) => void
  t: (k: string) => string
}) {
  const { reducedMotion } = useA11y()
  const { width } = useWindowDimensions()
  const columns = width >= 768 ? 6 : 3
  const gap = spacing[2.5]
  const tileWidth = (width - spacing[5] * 2 - gap * (columns - 1)) / columns

  return (
    <View style={styles.quickActionsGrid}>
      {actions.map(a => {
        const Icon = ACTION_ICON[a.icon] ?? Plus
        const label = t(ACTION_LABEL_KEY[a.id] ?? a.label)
        return (
          <QuickActionTile
            key={a.id}
            icon={Icon}
            label={label}
            width={tileWidth}
            reducedMotion={reducedMotion}
            onPress={() => onPress(a.id)}
          />
        )
      })}
    </View>
  )
}
