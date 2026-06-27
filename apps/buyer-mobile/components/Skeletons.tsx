import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import Skeleton from '@chinooz/ui/Skeleton'

export function ProfileHubSkeleton() {
  return (
    <View style={s.container}>
      <View style={s.headerCard}>
        <Skeleton width={72} height={72} circle />
        <Skeleton width={140} height={22} borderRadius={radii.md} />
        <Skeleton width={100} height={14} borderRadius={radii.sm} />
        <Skeleton width={80} height={14} borderRadius={radii.sm} />
      </View>

      <View style={s.chipsRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={s.chipSkeleton}>
            <Skeleton width={24} height={24} borderRadius={radii.md} />
            <Skeleton width={20} height={16} borderRadius={radii.sm} />
            <Skeleton width={40} height={12} borderRadius={radii.sm} />
          </View>
        ))}
      </View>

      {[0, 1, 2].map(section => (
        <View key={section} style={s.section}>
          <Skeleton width={60} height={12} borderRadius={radii.sm} />
          <View style={s.sectionCard}>
            {[0, 1, 2].map(row => (
              <React.Fragment key={row}>
                {row > 0 && <View style={s.divider} />}
                <View style={s.menuRow}>
                  <Skeleton width={32} height={32} borderRadius={radii.md} />
                  <Skeleton width={120} height={16} borderRadius={radii.sm} />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

export function AddressCardSkeleton() {
  return (
    <View style={s.addressCard}>
      <View style={s.addressHeader}>
        <Skeleton width={50} height={20} borderRadius={radii.full} />
        <Skeleton width={40} height={20} borderRadius={radii.sm} />
      </View>
      <Skeleton width={120} height={16} borderRadius={radii.sm} />
      <Skeleton width={100} height={12} borderRadius={radii.sm} />
      <Skeleton width="100%" height={14} borderRadius={radii.sm} />
      <Skeleton width="80%" height={14} borderRadius={radii.sm} />
    </View>
  )
}

export function PaymentMethodSkeleton() {
  return (
    <View style={s.paymentCard}>
      <View style={s.paymentRow}>
        <Skeleton width={40} height={40} borderRadius={radii.md} />
        <View style={s.paymentInfo}>
          <Skeleton width={100} height={16} borderRadius={radii.sm} />
          <Skeleton width={140} height={12} borderRadius={radii.sm} />
        </View>
        <Skeleton width={60} height={20} borderRadius={radii.full} />
      </View>
    </View>
  )
}

export function OrderCardSkeleton() {
  return (
    <View style={s.orderCard}>
      <View style={s.orderHeader}>
        <Skeleton width={80} height={14} borderRadius={radii.sm} />
        <Skeleton width={60} height={20} borderRadius={radii.full} />
      </View>
      <View style={s.orderBody}>
        <Skeleton width={40} height={40} borderRadius={radii.md} />
        <View style={s.orderInfo}>
          <Skeleton width="70%" height={14} borderRadius={radii.sm} />
          <Skeleton width="40%" height={12} borderRadius={radii.sm} />
        </View>
      </View>
      <View style={s.orderFooter}>
        <Skeleton width={60} height={13} borderRadius={radii.sm} />
        <Skeleton width={80} height={15} borderRadius={radii.sm} />
      </View>
    </View>
  )
}

export function OrderDetailSkeleton() {
  return (
    <View style={s.detailContainer}>
      {/* Header card skeleton */}
      <View style={s.detailHeaderCard}>
        <View style={s.detailHeaderRow}>
          <Skeleton width={120} height={22} borderRadius={radii.md} />
          <Skeleton width={70} height={22} borderRadius={radii.full} />
        </View>
        <Skeleton width={160} height={14} borderRadius={radii.sm} />
        <Skeleton width={130} height={14} borderRadius={radii.sm} />
      </View>

      {/* Timeline skeleton - 5 step rows */}
      <View style={s.detailSection}>
        <Skeleton width={100} height={18} borderRadius={radii.sm} />
        <View style={s.timelineSkeleton}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={s.timelineRow}>
              <Skeleton width={32} height={32} circle />
              <View style={s.timelineInfo}>
                <Skeleton width={80 + (i % 3) * 20} height={14} borderRadius={radii.sm} />
                <Skeleton width={100} height={12} borderRadius={radii.sm} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Items skeleton */}
      <View style={s.detailSection}>
        <Skeleton width={90} height={18} borderRadius={radii.sm} />
        <View style={s.detailCard}>
          {[0, 1].map(i => (
            <View key={i} style={s.itemRow}>
              <Skeleton width={56} height={56} borderRadius={radii.md} />
              <View style={s.itemInfo}>
                <Skeleton width="70%" height={16} borderRadius={radii.sm} />
                <Skeleton width="40%" height={12} borderRadius={radii.sm} />
                <Skeleton width="30%" height={12} borderRadius={radii.sm} />
              </View>
              <Skeleton width={60} height={14} borderRadius={radii.sm} />
            </View>
          ))}
        </View>
      </View>

      {/* Price breakdown skeleton */}
      <View style={s.detailSection}>
        <Skeleton width={120} height={18} borderRadius={radii.sm} />
        <View style={s.detailCard}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={s.priceRow}>
              <Skeleton width={80 + (i % 2) * 30} height={14} borderRadius={radii.sm} />
              <Skeleton width={60} height={14} borderRadius={radii.sm} />
            </View>
          ))}
          <View style={s.priceDivider} />
          <View style={s.priceRow}>
            <Skeleton width={70} height={16} borderRadius={radii.sm} />
            <Skeleton width={80} height={16} borderRadius={radii.sm} />
          </View>
        </View>
      </View>
    </View>
  )
}

export function WishlistGridSkeleton() {
  return (
    <View style={s.wishlistGrid}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={s.wishlistCard}>
          <Skeleton width="100%" height={160} borderRadius={0} />
          <View style={s.wishlistBody}>
            <Skeleton width="90%" height={13} borderRadius={radii.sm} />
            <Skeleton width="50%" height={15} borderRadius={radii.sm} />
            <Skeleton width="100%" height={36} borderRadius={radii.md} />
          </View>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: spacing[4], gap: spacing[4] },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  chipSkeleton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[3],
    alignItems: 'center',
    gap: spacing[1],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  section: { gap: spacing[2] },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing[4] + 32 + spacing[3] },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[1.5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  paymentInfo: { flex: 1, gap: spacing[0.5] },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderBody: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  orderInfo: { flex: 1, gap: spacing[0.5] },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight },
  wishlistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], paddingHorizontal: spacing[4] },
  wishlistCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  wishlistBody: { padding: spacing[3], gap: spacing[1] },
  detailContainer: { padding: spacing[4], gap: spacing[5] },
  detailHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailSection: { gap: spacing[3] },
  timelineSkeleton: { gap: spacing[3] },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  timelineInfo: { flex: 1, gap: spacing[1] },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  itemInfo: { flex: 1, gap: spacing[1] },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  priceDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing[1] },
})
