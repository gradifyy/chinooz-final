import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  Dimensions,
  Pressable,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Star,
  CheckCircle2,
  Flag,
  MessageSquare,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native'
import { colors, spacing, radii } from '@chinooz/theme'
import type { SellerReview } from '@chinooz/types'
import SafeImage from './SafeImage'
import BottomSheet from './BottomSheet'
import Skeleton from './Skeleton'
import { useReducedMotion } from './hooks/useReducedMotion'

const AVATAR_SIZE = 40
const THUMB_SIZE = 32
const PHOTO_SIZE = 64

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso)
  const day = 24 * 60 * 60 * 1000
  if (diff < 0) return 'just now'
  if (diff < day) {
    const hrs = Math.floor(diff / (60 * 60 * 1000))
    if (hrs < 1) return 'just now'
    return `${hrs}h ago`
  }
  const days = Math.floor(diff / day)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export interface ReviewCardProps {
  review: SellerReview
  onRespond?: () => void
  onFlag?: () => void
  onContactBuyer?: () => void
  responding?: boolean
  testID?: string
}

export default function ReviewCard({
  review,
  onRespond,
  onFlag,
  onContactBuyer,
  responding = false,
  testID,
}: ReviewCardProps) {
  const { t } = useTranslation()
  const [kebabOpen, setKebabOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)

  const lowRating = review.rating <= 2
  const hasResponse = !!review.response
  const photos = review.photos ?? []
  const photoViewerVisible = photoIndex !== null

  const openPhoto = useCallback((index: number) => setPhotoIndex(index), [])
  const closePhoto = useCallback(() => setPhotoIndex(null), [])
  const nextPhoto = useCallback(() => {
    setPhotoIndex(i => (i === null ? null : Math.min(i + 1, photos.length - 1)))
  }, [photos.length])
  const prevPhoto = useCallback(() => {
    setPhotoIndex(i => (i === null ? null : Math.max(i - 1, 0)))
  }, [])

  const cardAria = t('reviewCard.cardAria', {
    name: review.userName,
    product: review.productName,
    rating: review.rating,
  })
  const starAria = t('reviewCard.starRatingAria', { rating: review.rating })

  const cardStyle = lowRating
    ? [styles.card, styles.cardLowRating]
    : styles.card

  return (
    <>
      <View
        testID={testID}
        accessibilityRole="summary"
        accessibilityLabel={cardAria}
        style={cardStyle}
      >
        {/* Header: avatar + name + verified + stars + date */}
        <View style={styles.header}>
          <View style={styles.avatar} accessibilityLabel={review.userName}>
            <Text style={styles.avatarText}>{review.userName.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={styles.headerBody}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{review.userName}</Text>
              {review.verifiedPurchase && (
                <View
                  style={styles.verifiedBadge}
                  accessibilityLabel={t('reviewCard.verifiedPurchaseAria')}
                >
                  <CheckCircle2 size={12} color={colors.success} />
                  <Text style={styles.verifiedText}>{t('reviewCard.verifiedPurchase')}</Text>
                </View>
              )}
            </View>
            <View style={styles.starsRow} accessibilityLabel={starAria}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  color={i < review.rating ? colors.gold : colors.border}
                  fill={i < review.rating ? colors.gold : 'none'}
                />
              ))}
              <Text style={styles.date}>{timeAgo(review.createdAt)}</Text>
            </View>
          </View>

          {/* Status pill */}
          <StatusPill review={review} />
        </View>

        {/* Low-rating emphasis (not color-only: text + icon) */}
        {lowRating && (
          <View style={styles.lowRatingBanner}>
            <AlertTriangle size={13} color={colors.warning} />
            <Text style={styles.lowRatingText}>{t('reviewCard.lowRating')}</Text>
          </View>
        )}

        {/* Product context */}
        <View style={styles.productRow}>
          <SafeImage
            source={review.productImage}
            style={styles.productThumb}
            accessibilityLabel={review.productName}
          />
          <Text style={styles.productName} numberOfLines={1}>{review.productName}</Text>
        </View>

        {/* Review text */}
        {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
        <Text style={styles.reviewBody}>{review.body}</Text>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.photosRow}>
            {photos.map((src, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => openPhoto(i)}
                activeOpacity={0.85}
                accessibilityRole="imagebutton"
                accessibilityLabel={t('reviewCard.photoAlt', { index: i + 1, name: review.userName })}
              >
                <SafeImage
                  source={src}
                  style={styles.photo}
                  accessibilityLabel={t('reviewCard.photoAlt', { index: i + 1, name: review.userName })}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Existing seller response */}
        {hasResponse && review.response && (
          <View style={styles.responseBlock}>
            <Text style={styles.responseLabel}>{t('reviewCard.sellerResponse')}</Text>
            <Text style={styles.responseText}>{review.response.text}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {!hasResponse && onRespond && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('reviewCard.respondAria', { name: review.userName })}
              onPress={onRespond}
              style={styles.respondBtn}
              activeOpacity={0.85}
              disabled={responding}
            >
              <MessageSquare size={15} color={colors.white} />
              <Text style={styles.respondBtnText}>
                {responding ? t('reviewCard.responding') : t('reviewCard.respond')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Flag quick-action (subtle) */}
          {onFlag && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('reviewCard.flagAria', { name: review.userName })}
              onPress={onFlag}
              style={[styles.flagBtn, review.flagged && styles.flagBtnActive]}
              activeOpacity={0.85}
            >
              <Flag size={15} color={review.flagged ? colors.error : colors.textMuted} />
              <Text style={[styles.flagBtnText, review.flagged && styles.flagBtnTextActive]}>
                {review.flagged ? t('reviewCard.unflag') : t('reviewCard.flag')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Kebab → contact buyer + more */}
          {onContactBuyer && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('reviewCard.moreActionsAria', { name: review.userName })}
              onPress={() => setKebabOpen(true)}
              style={styles.kebabBtn}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreHorizontal size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {review.helpful > 0 && (
            <Text style={styles.helpfulText}>
              {t('reviewCard.helpful', { count: review.helpful })}
            </Text>
          )}
        </View>
      </View>

      {/* Kebab sheet */}
      <BottomSheet
        visible={kebabOpen}
        onClose={() => setKebabOpen(false)}
        title={t('reviewCard.moreActions')}
      >
        {onContactBuyer && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('reviewCard.contactBuyerAria', { name: review.userName })}
            onPress={() => {
              setKebabOpen(false)
              onContactBuyer()
            }}
            style={styles.sheetRow}
          >
            <MessageSquare size={20} color={colors.primary} />
            <Text style={styles.sheetRowLabel}>{t('reviewCard.contactBuyer')}</Text>
          </TouchableOpacity>
        )}
        {onFlag && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('reviewCard.flagAria', { name: review.userName })}
            onPress={() => {
              setKebabOpen(false)
              onFlag()
            }}
            style={styles.sheetRow}
          >
            <Flag size={20} color={review.flagged ? colors.error : colors.textMuted} />
            <Text style={styles.sheetRowLabel}>
              {review.flagged ? t('reviewCard.unflag') : t('reviewCard.reportReview')}
            </Text>
          </TouchableOpacity>
        )}
      </BottomSheet>

      {/* Photo viewer */}
      <PhotoViewer
        visible={photoViewerVisible}
        photos={photos}
        index={photoIndex ?? 0}
        onClose={closePhoto}
        onNext={nextPhoto}
        onPrev={prevPhoto}
        ariaLabel={t('reviewCard.photoViewerAria', {
          index: (photoIndex ?? 0) + 1,
          total: photos.length,
        })}
        closeAria={t('reviewCard.photoViewerClose')}
        nextAria={t('reviewCard.photoViewerNext')}
        prevAria={t('reviewCard.photoViewerPrev')}
      />
    </>
  )
}

function StatusPill({ review }: { review: SellerReview }) {
  const { t } = useTranslation()
  if (review.flagged) {
    return (
      <View style={[styles.statusPill, { backgroundColor: colors.errorLight }]}>
        <Flag size={10} color={colors.error} />
        <Text style={[styles.statusPillText, { color: colors.error }]}>{t('reviewCard.flagged')}</Text>
      </View>
    )
  }
  if (review.response) {
    return (
      <View style={[styles.statusPill, { backgroundColor: colors.successLight }]}>
        <CheckCircle2 size={10} color={colors.success} />
        <Text style={[styles.statusPillText, { color: colors.success }]}>{t('reviewCard.responded')}</Text>
      </View>
    )
  }
  return (
    <View style={[styles.statusPill, { backgroundColor: colors.warningLight }]}>
      <AlertTriangle size={10} color="#92400E" />
      <Text style={[styles.statusPillText, { color: '#92400E' }]}>{t('reviewCard.needsResponse')}</Text>
    </View>
  )
}

function PhotoViewer({
  visible,
  photos,
  index,
  onClose,
  onNext,
  onPrev,
  ariaLabel,
  closeAria,
  nextAria,
  prevAria,
}: {
  visible: boolean
  photos: string[]
  index: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  ariaLabel: string
  closeAria: string
  nextAria: string
  prevAria: string
}) {
  const reduced = useReducedMotion()
  if (!visible || photos.length === 0) return null
  const hasMultiple = photos.length > 1
  const screen = Dimensions.get('window')

  return (
    <RNModal
      transparent
      visible={visible}
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={onClose}
      accessibilityLabel={ariaLabel}
    >
      <Pressable style={photoViewerStyles.overlay} onPress={onClose}>
        <View style={photoViewerStyles.closeBar}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={closeAria}
            hitSlop={8}
          >
            <X size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} onPress={(e) => e.stopPropagation()}>
          <SafeImage
            source={photos[index]}
            style={{ width: screen.width * 0.9, height: screen.height * 0.6 }}
            accessibilityLabel={ariaLabel}
          />

          {hasMultiple && (
            <>
              <TouchableOpacity
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel={prevAria}
                style={[photoViewerStyles.navBtn, photoViewerStyles.navPrev]}
                disabled={index === 0}
              >
                <ChevronLeft size={28} color={index === 0 ? colors.textTertiary : colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel={nextAria}
                style={[photoViewerStyles.navBtn, photoViewerStyles.navNext]}
                disabled={index === photos.length - 1}
              >
                <ChevronRight size={28} color={index === photos.length - 1 ? colors.textTertiary : colors.white} />
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  )
}

// --- Skeleton ---

export function ReviewCardSkeleton({ testID }: { testID?: string }) {
  return (
    <View
      testID={testID}
      accessibilityState={{ busy: true }}
      accessibilityLabel="Loading review"
      style={styles.card}
    >
      <View style={styles.header}>
        <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} circle />
        <View style={{ flex: 1, gap: spacing[1.5] }}>
          <Skeleton width={140} height={14} />
          <Skeleton width={90} height={12} />
        </View>
        <Skeleton width={60} height={16} borderRadius={radii.full} />
      </View>
      <View style={styles.productRow}>
        <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={radii.sm} />
        <Skeleton width={160} height={14} />
      </View>
      <Skeleton width="100%" height={16} />
      <Skeleton width="85%" height={16} />
      <Skeleton width="60%" height={16} />
      <View style={styles.photosRow}>
        <Skeleton width={PHOTO_SIZE} height={PHOTO_SIZE} borderRadius={radii.md} />
        <Skeleton width={PHOTO_SIZE} height={PHOTO_SIZE} borderRadius={radii.md} />
      </View>
      <View style={styles.actionsRow}>
        <Skeleton width={100} height={32} borderRadius={radii.full} />
        <Skeleton width={60} height={32} borderRadius={radii.full} />
      </View>
    </View>
  )
}

// --- Styles ---

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLowRating: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerBody: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 1,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  date: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginLeft: spacing[1.5],
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  lowRatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
  },
  lowRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  productThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.borderLight,
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  reviewBody: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
  },

  photosRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
  },

  responseBlock: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary50,
    padding: spacing[3],
    marginLeft: spacing[2],
    gap: 4,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  responseText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
    marginTop: 2,
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    height: 34,
  },
  respondBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    height: 34,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagBtnActive: {
    backgroundColor: colors.errorLight,
    borderColor: colors.errorLight,
  },
  flagBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  flagBtnTextActive: {
    color: colors.error,
  },
  kebabBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  helpfulText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
    marginLeft: 'auto',
  },

  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetRowLabel: {
    fontSize: 15,
    color: colors.text,
  },
})

const photoViewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  closeBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPrev: { left: spacing[2] },
  navNext: { right: spacing[2] },
})
