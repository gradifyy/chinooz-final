import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { useCategories } from '@chinooz/hooks'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Category } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const GAP = 12

function getColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w >= 1024) return 6
  if (w >= 768) return 4
  return 2
}

function getColumnWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

export default function CategoriesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: categories, isLoading } = useCategories()

  const topCategories = useMemo(() => {
    if (!categories) return []
    return categories.filter(c => c.parentId === null)
  }, [categories])

  const columns = getColumns()
  const tileWidth = getColumnWidth(columns)

  const handlePress = (cat: Category) => {
    if (cat.children && cat.children.length > 0) {
      router.push({ pathname: '/search', params: { category: cat.id } })
    } else {
      router.push({ pathname: '/search', params: { category: cat.id } })
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: EDGE_PADDING, paddingTop: spacing[4], paddingBottom: spacing[2] }}>
          <View style={{ height: 44, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }} />
        </View>
        <View style={{ paddingHorizontal: EDGE_PADDING, gap: GAP, flexDirection: 'row', flexWrap: 'wrap', paddingTop: spacing[4] }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: tileWidth, gap: 8 }}>
              <View style={{ height: tileWidth, borderRadius: radii.lg, backgroundColor: colors.border }} />
              <View style={{ width: '70%', height: 14, borderRadius: 7, backgroundColor: colors.border }} />
              <View style={{ width: '50%', height: 10, borderRadius: 5, backgroundColor: colors.border }} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: EDGE_PADDING, paddingTop: spacing[4], paddingBottom: spacing[2] }}>
        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={{
            height: 44,
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[3],
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>🔍 {t('common.searchPlaceholder')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: EDGE_PADDING,
          paddingTop: spacing[4],
          paddingBottom: insets.bottom + spacing[6],
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing[4] }}>
          {t('categories.title')}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {topCategories.map((cat, i) => (
            <Animated.View
              key={cat.id}
              entering={FadeInRight.duration(250).delay(Math.min(i, 9) * 50).springify().damping(18)}
              style={{ width: tileWidth }}
            >
              <TouchableOpacity
                onPress={() => handlePress(cat)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  padding: spacing[4],
                  alignItems: 'center',
                  gap: spacing[2],
                  shadowColor: colors.black,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 1,
                }}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primary50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                  {cat.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                  {cat.productCount} items
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
