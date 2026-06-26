import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import type { Review } from '@chinooz/types'

type SortMode = 'recent' | 'highest' | 'photos'

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < Math.round(rating) ? colors.gold : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
}

interface ReviewsSectionProps {
  reviews: Review[] | undefined
  isLoading?: boolean
  onWriteReview?: () => void
  showWriteButton?: boolean
}

export default function ReviewsSection({
  reviews,
  isLoading,
  onWriteReview,
  showWriteButton = true,
}: ReviewsSectionProps) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortMode>('recent')
  const [expanded, setExpanded] = useState(false)

  const distribution = useMemo(() => {
    if (!reviews?.length) return Array(5).fill(0)
    const dist = Array(5).fill(0)
    reviews.forEach(r => { dist[Math.min(4, Math.max(0, Math.round(r.rating) - 1))]++ })
    return dist
  }, [reviews])

  const avgRating = useMemo(() => {
    if (!reviews?.length) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews])

  const sorted = useMemo(() => {
    if (!reviews) return []
    const copy = [...reviews]
    if (sort === 'recent') copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (sort === 'highest') copy.sort((a, b) => b.rating - a.rating)
    if (sort === 'photos') copy.sort((a, b) => (b.photos?.length || 0) - (a.photos?.length || 0))
    return expanded ? copy : copy.slice(0, 3)
  }, [reviews, sort, expanded])

  if (isLoading) {
    return (
      <View style={{ gap: spacing[3], padding: spacing[4] }}>
        <View style={{ width: 120, height: 20, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '100%', height: 60, borderRadius: 8, backgroundColor: colors.border }} />
      </View>
    )
  }

  if (!reviews?.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[2] }}>
        <Text style={{ fontSize: 32 }}>💬</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('product.noReviews')}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('product.noReviewsSubtitle')}</Text>
        {showWriteButton && onWriteReview && (
          <TouchableOpacity onPress={onWriteReview} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.lg, marginTop: spacing[2] }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>{t('product.writeReview')}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={{ gap: spacing[4] }}>
      {/* Summary */}
      <Animated.View entering={FadeIn.duration(250)} style={{ flexDirection: 'row', gap: spacing[4], padding: spacing[4] }}>
        <View style={{ alignItems: 'center', gap: spacing[1] }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: colors.text }}>{avgRating.toFixed(1)}</Text>
          <StarRating rating={avgRating} size={16} />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{reviews.length} {t('product.reviews').toLowerCase()}</Text>
        </View>

        {/* Distribution bars */}
        <View style={{ flex: 1, gap: spacing[1] }}>
          {[5, 4, 3, 2, 1].map((star, i) => {
            const count = distribution[star - 1]
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <Animated.View
                key={star}
                entering={FadeInDown.delay(i * 100).duration(250)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
              >
                <Text style={{ fontSize: 12, color: colors.textMuted, width: 12 }}>{star}</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.gold, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, width: 20 }}>{count}</Text>
              </Animated.View>
            )
          })}
        </View>
      </Animated.View>

      {/* Write review button */}
      {showWriteButton && onWriteReview && (
        <TouchableOpacity
          onPress={onWriteReview}
          style={{ backgroundColor: colors.primary50, paddingVertical: 12, borderRadius: radii.lg, marginHorizontal: spacing[4] }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center' }}>
            {t('product.writeReview')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Sort tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], paddingHorizontal: spacing[4] }}>
        {([
          { key: 'recent', label: t('product.mostRecent') },
          { key: 'highest', label: t('product.highestRated') },
          { key: 'photos', label: t('product.withPhotos') },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setSort(tab.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: radii.full,
              backgroundColor: sort === tab.key ? colors.primary : colors.background,
              borderWidth: 1,
              borderColor: sort === tab.key ? colors.primary : colors.border,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: sort === tab.key ? colors.white : colors.text }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Review list */}
      {sorted.map((review, i) => (
        <Animated.View
          key={review.id}
          entering={FadeInDown.delay(i * 50).duration(250)}
          style={{ gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{getInitials(review.userName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{review.userName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <StarRating rating={review.rating} size={10} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatDate(review.createdAt)}</Text>
              </View>
            </View>
          </View>
          {review.title && <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{review.title}</Text>}
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>{review.body}</Text>
          {review.photos && review.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
              {review.photos.map((photo, pi) => (
                <View key={pi} style={{ width: 64, height: 64, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.border }}>
                  <Image source={{ uri: photo }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>👍 {t('product.helpful')} ({review.helpful})</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* See all */}
      {!expanded && reviews.length > 3 && (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          style={{ paddingVertical: spacing[3], alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
            {t('product.seeAllReviews')} ({reviews.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
