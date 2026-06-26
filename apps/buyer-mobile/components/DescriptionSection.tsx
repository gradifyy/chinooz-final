import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { colors, spacing } from '@chinooz/theme'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

interface DescriptionSectionProps {
  description: string
  maxLines?: number
}

export default function DescriptionSection({ description, maxLines = 3 }: DescriptionSectionProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [isLong, setIsLong] = useState(false)
  const readMoreScale = useSharedValue(1)

  const handleTextLayout = useCallback((e: any) => {
    setIsLong(e.nativeEvent.lines.length > maxLines)
  }, [maxLines])

  const handleToggle = useCallback(() => {
    readMoreScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
    )
    setExpanded(prev => !prev)
  }, [])

  const readMoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: readMoreScale.value }],
  }))

  return (
    <View style={{ gap: spacing[2] }}>
      <View>
        <Text
          style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}
          numberOfLines={expanded ? undefined : maxLines}
          onTextLayout={handleTextLayout}
        >
          {description}
        </Text>
        {!expanded && isLong && (
          <View style={{ position: 'relative' }}>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 32,
                backgroundColor: 'transparent',
              }}
              pointerEvents="none"
            />
          </View>
        )}
      </View>
      {isLong && (
        <AnimatedTouchable
          onPress={handleToggle}
          style={[{ alignSelf: 'flex-start' }, readMoreStyle]}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
            {expanded ? t('product.readLess') : t('product.readMore')}
          </Text>
        </AnimatedTouchable>
      )}
    </View>
  )
}
