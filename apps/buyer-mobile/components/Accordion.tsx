import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { colors, spacing, radii } from '@chinooz/theme'

interface AccordionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [contentHeight, setContentHeight] = useState(0)
  const height = useSharedValue(defaultOpen ? 1 : 0)
  const rotation = useSharedValue(defaultOpen ? 1 : 0)

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev
      height.value = withTiming(next ? 1 : 0, {
        duration: 250,
        easing: Easing.bezier(0.2, 0, 0, 1),
      })
      rotation.value = withTiming(next ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      })
      return next
    })
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    height: contentHeight * height.value,
    opacity: height.value,
    overflow: 'hidden',
  }))

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }))

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContentHeight(e.nativeEvent.layout.height)
  }, [])

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}>
      <TouchableOpacity
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing[3.5],
          paddingHorizontal: spacing[4],
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{title}</Text>
        <Animated.Text style={[{ fontSize: 14, color: colors.textMuted }, chevronStyle]}>
          ›
        </Animated.Text>
      </TouchableOpacity>
      <Animated.View style={contentStyle}>
        <View onLayout={handleLayout} style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>
          {children}
        </View>
      </Animated.View>
    </View>
  )
}
