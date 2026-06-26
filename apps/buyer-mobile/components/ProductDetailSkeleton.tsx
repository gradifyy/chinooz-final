import React from 'react'
import { View, Dimensions } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { colors, spacing, radii } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_HEIGHT = SCREEN_WIDTH

function Shimmer({ w, h, r = 6 }: { w: number | `${number}%`; h: number; r?: number }) {
  return <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: colors.border }} />
}

export default function ProductDetailSkeleton() {
  const reduced = useReducedMotion()

  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 250)} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Gallery skeleton */}
      <Shimmer w={SCREEN_WIDTH} h={IMAGE_HEIGHT} r={0} />

      {/* Info skeleton */}
      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <Shimmer w="85%" h={28} r={6} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Shimmer w={80} h={16} r={8} />
          <Shimmer w={40} h={14} r={4} />
          <Shimmer w={70} h={22} r={11} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
          <Shimmer w={100} h={24} r={6} />
          <Shimmer w={70} h={16} r={4} />
          <Shimmer w={50} h={22} r={11} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2], paddingHorizontal: spacing[3], backgroundColor: colors.background, borderRadius: radii.lg }}>
          <Shimmer w={36} h={36} r={18} />
          <View style={{ flex: 1, gap: 4 }}>
            <Shimmer w="50%" h={14} />
            <Shimmer w="70%" h={12} />
          </View>
        </View>
      </View>

      {/* Variants skeleton */}
      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[2] }}>
        <Shimmer w={100} h={14} />
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Shimmer w={80} h={44} r={radii.md} />
          <Shimmer w={80} h={44} r={radii.md} />
          <Shimmer w={80} h={44} r={radii.md} />
        </View>
      </View>

      {/* Description skeleton */}
      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[2] }}>
        <Shimmer w="40%" h={16} />
        <Shimmer w="100%" h={14} />
        <Shimmer w="100%" h={14} />
        <Shimmer w="60%" h={14} />
      </View>

      {/* Reviews skeleton */}
      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[3] }}>
        <Shimmer w="50%" h={18} />
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spacing[2], paddingVertical: spacing[2] }}>
            <Shimmer w={32} h={32} r={16} />
            <View style={{ flex: 1, gap: 4 }}>
              <Shimmer w="40%" h={13} />
              <Shimmer w="100%" h={12} />
              <Shimmer w="80%" h={12} />
            </View>
          </View>
        ))}
      </View>

      {/* Related skeleton */}
      <View style={{ paddingVertical: spacing[4], gap: spacing[3] }}>
        <Shimmer w="45%" h={18} />
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: spacing[4] }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={{ width: 160, gap: 6 }}>
              <Shimmer w={160} h={160} r={radii.lg} />
              <Shimmer w="80%" h={12} />
              <Shimmer w="50%" h={14} />
            </View>
          ))}
        </View>
      </View>

      {/* Sticky bar placeholder */}
      <View style={{ padding: spacing[4], gap: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Shimmer w={80} h={14} />
          <Shimmer w={100} h={36} r={radii.lg} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Shimmer w="48%" h={48} r={radii.lg} />
          <Shimmer w="48%" h={48} r={radii.lg} />
        </View>
      </View>
    </Animated.View>
  )
}
