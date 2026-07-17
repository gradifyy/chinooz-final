import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { spacing, radii, fontSz, duration } from '@chinooz/theme'
import { useAppTheme } from './ThemeProvider'
import Icon from './Icon'
import SafeImage from '@chinooz/ui/SafeImage'
import { useVoteHelpful, useHelpfulVotes } from '@chinooz/hooks'
import { getInitials } from '@chinooz/utils'
import type { Review } from '@chinooz/types'

type SortMode = 'recent' | 'highest' | 'photos'

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const { colors } = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          color={i < Math.round(rating) ? colors.gold : colors.border}
        />
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
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortMode>('recent')
  const [expanded, setExpanded] = useState(false)

  const productId = reviews?.[0]?.productId ?? ''
  const voteHelpful = useVoteHelpful(productId)
  const { data: votedIds } = useHelpfulVotes()
  const votedSet = useMemo(() => new Set(votedIds ?? []), [votedIds])

  const handleVote = useCallback(
    (reviewId: string) => {
      voteHelpful.mutate({ reviewId, voted: votedSet.has(reviewId) })
    },
    [voteHelpful, votedSet],
  )

  const distribution = useMemo(() => {
    if (!reviews?.length) return Array(5).fill(0)
    const dist = Array(5).fill(0)
    reviews.forEach(r => {
      dist[Math.min(4, Math.max(0, Math.round(r.rating) - 1))]++
    })
    return dist
  }, [reviews])

  const avgRating = useMemo(() => {
    if (!reviews?.length) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews])

  const photoCount = useMemo(
    () => (reviews ?? []).filter(r => (r.photos?.length || 0) + (r.videos?.length || 0) > 0).length,
    [reviews],
  )

  const filtered = useMemo(() => {
    if (!reviews) return []
    const copy = [...reviews]
    if (sort === 'highest') {
      copy.sort(
        (a, b) =>
          b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      return copy
    }
    if (sort === 'photos') {
      return copy
        .filter(r => (r.photos?.length || 0) + (r.videos?.length || 0) > 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return copy
  }, [reviews, sort])

  const visible = useMemo(() => (expanded ? filtered : filtered.slice(0, 3)), [filtered, expanded])

  const handleSort = useCallback((next: SortMode) => {
    setSort(next)
    setExpanded(false)
    Haptics.selectionAsync().catch(() => {})
  }, [])

  if (isLoading) {
    return (
      <View style={{ gap: spacing[3], padding: spacing[4] }}>
        <View
          style={{ width: 120, height: 20, borderRadius: radii.sm, backgroundColor: colors.border }}
        />
        <View
          style={{
            width: '100%',
            height: 60,
            borderRadius: radii.md,
            backgroundColor: colors.border,
          }}
        />
      </View>
    )
  }

  if (!reviews?.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[2] }}>
        <Icon name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
        <Text style={{ fontSize: fontSz('base')[0], fontWeight: '600', color: colors.text }}>
          {t('product.noReviews')}
        </Text>
        <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted }}>
          {t('product.noReviewsSubtitle')}
        </Text>
        {showWriteButton && onWriteReview && (
          <TouchableOpacity
            onPress={onWriteReview}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: radii.lg,
              marginTop: spacing[2],
            }}
          >
            <Text style={{ fontSize: fontSz('base')[0], fontWeight: '600', color: colors.white }}>
              {t('product.writeReview')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={{ gap: spacing[4] }}>
      {/* Summary */}
      <Animated.View
        entering={FadeIn.duration(duration.normal)}
        style={{ flexDirection: 'row', gap: spacing[4], padding: spacing[4] }}
      >
        <View style={{ alignItems: 'center', gap: spacing[1] }}>
          <Text
            style={{ fontSize: fontSz('display-sm')[0], fontWeight: '700', color: colors.text }}
          >
            {avgRating.toFixed(1)}
          </Text>
          <StarRating rating={avgRating} size={16} />
          <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted }}>
            {reviews.length} {t('product.reviews').toLowerCase()}
          </Text>
        </View>

        {/* Distribution bars */}
        <View style={{ flex: 1, gap: spacing[1] }}>
          {[5, 4, 3, 2, 1].map((star, i) => {
            const count = distribution[star - 1]
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <Animated.View
                key={star}
                entering={FadeInDown.delay(i * 100).duration(duration.normal)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
              >
                <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted, width: 12 }}>
                  {star}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 6,
                    backgroundColor: colors.border,
                    borderRadius: radii.sm,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: colors.gold,
                      borderRadius: radii.sm,
                    }}
                  />
                </View>
                <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted, width: 20 }}>
                  {count}
                </Text>
              </Animated.View>
            )
          })}
        </View>
      </Animated.View>

      {/* Write review button */}
      {showWriteButton && onWriteReview && (
        <TouchableOpacity
          onPress={onWriteReview}
          style={{
            backgroundColor: colors.primary50,
            paddingVertical: 12,
            borderRadius: radii.lg,
            marginHorizontal: spacing[4],
          }}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: fontSz('base')[0],
              fontWeight: '600',
              color: colors.primary,
              textAlign: 'center',
            }}
          >
            {t('product.writeReview')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Sort tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[2], paddingHorizontal: spacing[4] }}
      >
        {(
          [
            { key: 'recent', label: t('product.mostRecent') },
            { key: 'highest', label: t('product.highestRated') },
            {
              key: 'photos',
              label:
                photoCount > 0
                  ? `${t('product.withPhotos')} (${photoCount})`
                  : t('product.withPhotos'),
            },
          ] as const
        ).map(tab => {
          const active = sort === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleSort(tab.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: radii.full,
                backgroundColor: active ? colors.primary : colors.background,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={{
                  fontSize: fontSz('sm')[0],
                  fontWeight: '600',
                  color: active ? colors.white : colors.text,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Empty state when filtering by photos yields nothing */}
      {sort === 'photos' && filtered.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: spacing[6], gap: spacing[1] }}>
          <Icon name="camera-outline" size={24} color={colors.textMuted} />
          <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted }}>
            {t('product.noPhotoReviews')}
          </Text>
        </View>
      )}

      {/* Review list */}
      {visible.map((review, i) => (
        <Animated.View
          key={review.id}
          entering={FadeInDown.delay(i * 50).duration(duration.normal)}
          style={{
            gap: spacing[2],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.xl,
                backgroundColor: colors.primary50,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '600', color: colors.primary }}>
                {getInitials(review.userName)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[1],
                  flexWrap: 'wrap',
                }}
              >
                <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '600', color: colors.text }}>
                  {review.userName}
                </Text>
                {review.verifiedPurchase && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      backgroundColor: colors.successLight,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: radii.full,
                    }}
                    accessibilityLabel={t('reviewCard.verifiedPurchaseAria')}
                  >
                    <Icon name="checkmark" size={10} color={colors.success} />
                    <Text
                      style={{
                        fontSize: fontSz('xs')[0],
                        fontWeight: '600',
                        color: colors.success,
                      }}
                    >
                      {t('reviewCard.verifiedPurchase')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <StarRating rating={review.rating} size={10} />
                <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted }}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          {review.title && (
            <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '600', color: colors.text }}>
              {review.title}
            </Text>
          )}
          <Text style={{ fontSize: fontSz('sm')[0], color: colors.textSecondary, lineHeight: 18 }}>
            {review.body}
          </Text>
          {(review.photos?.length || 0) + (review.videos?.length || 0) > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[2] }}
            >
              {review.videos?.map((video, vi) => (
                <View
                  key={`v-${vi}`}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radii.md,
                    overflow: 'hidden',
                    backgroundColor: colors.black,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="play" size={18} color={colors.white} />
                </View>
              ))}
              {review.photos?.map((photo, pi) => (
                <View
                  key={`p-${pi}`}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radii.md,
                    overflow: 'hidden',
                    backgroundColor: colors.border,
                  }}
                >
                  <SafeImage source={photo} style={{ width: 64, height: 64 }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            onPress={() => handleVote(review.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[1],
              marginTop: spacing[1],
              minHeight: 32,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: votedSet.has(review.id) }}
            activeOpacity={0.7}
          >
            <Icon
              name="thumbs-up-outline"
              size={12}
              color={votedSet.has(review.id) ? colors.primary : colors.textMuted}
            />
            <Text
              style={{
                fontSize: fontSz('sm')[0],
                fontWeight: votedSet.has(review.id) ? '700' : '400',
                color: votedSet.has(review.id) ? colors.primary : colors.textMuted,
              }}
            >
              {t('product.helpful')} ({review.helpful})
            </Text>
          </TouchableOpacity>
          {review.sellerResponse && (
            <View
              style={{
                marginTop: spacing[2],
                marginLeft: spacing[2],
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderLight,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary50,
                backgroundColor: colors.background,
                padding: spacing[3],
              }}
            >
              <Text
                style={{
                  fontSize: fontSz('sm')[0],
                  fontWeight: '600',
                  color: colors.primary,
                  marginBottom: 2,
                }}
              >
                {t('reviewCard.sellerResponse')}
              </Text>
              <Text
                style={{ fontSize: fontSz('sm')[0], color: colors.textSecondary, lineHeight: 18 }}
              >
                {review.sellerResponse.text}
              </Text>
            </View>
          )}
        </Animated.View>
      ))}

      {/* See all */}
      {!expanded && filtered.length > 3 && (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          style={{ paddingVertical: spacing[3], alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '600', color: colors.primary }}>
            {t('product.seeAllReviews')} ({filtered.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
