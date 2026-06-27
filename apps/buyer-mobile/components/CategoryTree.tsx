import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import Animated, {
  FadeIn,
  FadeInRight,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { useCategories } from '@chinooz/hooks'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import type { Category } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const GAP = 12

function getColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w >= 768) return 3
  return 2
}

function getColumnWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

interface BreadcrumbItem {
  id: string
  name: string
}

export default function CategoryTree() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data: categories, isLoading } = useCategories()

  const [currentId, setCurrentId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])

  const currentCategory = useMemo(() => {
    if (!categories || !currentId) return null
    return categories.find(c => c.id === currentId)
  }, [categories, currentId])

  const currentChildren = useMemo(() => {
    if (!categories) return []
    if (!currentId) return categories.filter(c => c.parentId === null)
    const cat = categories.find(c => c.id === currentId)
    return cat?.children || []
  }, [categories, currentId])

  const handleDrillIn = useCallback((cat: Category) => {
    if (cat.children && cat.children.length > 0) {
      setBreadcrumb(prev => [...prev, { id: cat.id, name: cat.name }])
      setCurrentId(cat.id)
    } else {
      router.push({ pathname: '/search', params: { category: cat.id } })
    }
  }, [router])

  const handleBreadcrumbTap = useCallback((item: BreadcrumbItem, index: number) => {
    setBreadcrumb(prev => prev.slice(0, index))
    setCurrentId(index === 0 ? null : item.id)
  }, [])

  const handleBack = useCallback(() => {
    if (breadcrumb.length > 0) {
      const prev = breadcrumb[breadcrumb.length - 2]
      setBreadcrumb(breadcrumb.slice(0, -1))
      setCurrentId(prev?.id || null)
    }
  }, [breadcrumb])

  const handleViewAll = useCallback(() => {
    const catId = currentId || (breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null)
    if (catId) {
      router.push({ pathname: '/search', params: { category: catId } })
    }
  }, [currentId, breadcrumb, router])

  const columns = getColumns()
  const tileWidth = getColumnWidth(columns)

  if (isLoading) {
    return (
      <View style={{ gap: spacing[4] }}>
        <View style={{ flexDirection: 'row', gap: GAP, flexWrap: 'wrap' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: tileWidth, gap: 8 }}>
              <View style={{ height: tileWidth, borderRadius: radii.lg, backgroundColor: colors.border }} />
              <View style={{ width: '70%', height: 14, borderRadius: 7, backgroundColor: colors.border }} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ gap: spacing[3] }}>
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[1], paddingHorizontal: spacing[1] }}
          accessibilityLabel={t('categories.breadcrumbPath')}
        >
          <TouchableOpacity
            onPress={() => { setBreadcrumb([]); setCurrentId(null) }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>
              {t('categories.allCategories')}
            </Text>
          </TouchableOpacity>
          {breadcrumb.map((item, i) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>›</Text>
              <TouchableOpacity
                onPress={() => handleBreadcrumbTap(item, i)}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={{ fontSize: 12, color: colors.textMuted }}>›</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>
            {currentCategory?.name || ''}
          </Text>
        </ScrollView>
      )}

      {/* Subcategories grid */}
      <Animated.View
        key={currentId || 'root'}
        entering={reduced ? FadeIn.duration(0) : FadeIn.duration(200)}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}
      >
        {currentChildren.map((cat, i) => (
          <Animated.View
            key={cat.id}
            entering={reduced ? FadeIn.duration(0) : FadeInRight.duration(250).delay(Math.min(i, 9) * 50).springify().damping(18)}
            style={{ width: tileWidth }}
          >
            <TouchableOpacity
              onPress={() => handleDrillIn(cat)}
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
              {cat.children && cat.children.length > 0 && (
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>
                  {cat.children.length} subcategories ›
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* View all button */}
      {(currentId || breadcrumb.length > 0) && (
        <TouchableOpacity
          onPress={handleViewAll}
          style={{
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: radii.md,
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
            alignItems: 'center',
            marginTop: spacing[2],
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
            {t('categories.viewAll', { category: currentCategory?.name || t('categories.allCategories') })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
