import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { Star, ShieldCheck, ShieldAlert, Clock, MapPin } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import type {
  RiderProfileHub,
  RiderTier,
  RiderVerificationStatus,
} from '@chinooz/mock-data'

interface ProfileHeaderProps {
  profile: RiderProfileHub
  tierLabel: string
  verificationLabel: string
  memberSinceLabel: string
  zoneLabel: string
  headerAria: string
  ratingAria: string
  tierAria: string
  verificationAria: string
}

const TIER_COLORS: Record<RiderTier, { bg: string; fg: string; ring: string }> = {
  bronze: { bg: '#FBE9D0', fg: '#9A5A1E', ring: '#E0A93B' },
  silver: { bg: '#EDEEF1', fg: '#5B6470', ring: '#9CA3AF' },
  gold: { bg: '#FBF1D6', fg: '#8A6510', ring: '#E0A93B' },
  platinum: { bg: '#E8ECF4', fg: '#3D4A7A', ring: '#6E7CB0' },
}

const VERIFICATION: Record<
  RiderVerificationStatus,
  { fg: string; bg: string; icon: 'check' | 'alert' }
> = {
  verified: { fg: colors.success, bg: colors.successLight, icon: 'check' },
  pending: { fg: colors.warning, bg: colors.warningLight, icon: 'alert' },
  rejected: { fg: colors.error, bg: colors.errorLight, icon: 'alert' },
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function formatMemberSince(iso: string, locale: 'en' | 'ne' = 'en'): string {
  // Render as "Mar 2024" without relying on Intl plumbing that may differ
  // across devices. Keep it simple and deterministic.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const monthsNe = [
    'जन', 'फेब', 'मार्च', 'अप्र', 'मे', 'जुन',
    'जुल', 'अग', 'सेप', 'अक्ट', 'नोभ', 'डिस',
  ]
  const m = locale === 'ne' ? monthsNe : months
  return `${m[d.getMonth()]} ${d.getFullYear()}`
}

export default function ProfileHeader({
  profile,
  tierLabel,
  verificationLabel,
  memberSinceLabel,
  zoneLabel,
  headerAria,
  ratingAria,
  tierAria,
  verificationAria,
}: ProfileHeaderProps) {
  const tierColor = TIER_COLORS[profile.tier]
  const verif = VERIFICATION[profile.verification]
  const VerifIcon = verif.icon === 'check' ? ShieldCheck : ShieldAlert

  return (
    <View
      style={styles.card}
      accessibilityRole="header"
      accessibilityLabel={headerAria}
    >
      <View style={styles.topRow}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials(profile.name)}</Text>
            </View>
          )}
          <View
            style={[styles.tierRing, { borderColor: tierColor.ring }]}
            pointerEvents="none"
          />
        </View>

        {/* Name + zone + rating + tier */}
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={2}>
            {profile.name}
          </Text>
          <View style={styles.zoneRow}>
            <MapPin size={12} color={colors.textMuted} />
            <Text style={styles.zoneText} numberOfLines={1}>
              {zoneLabel}: {profile.zone}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            {/* Rating — feels earned */}
            <View
              style={styles.ratingPill}
              accessibilityRole="text"
              accessibilityLabel={ratingAria}
            >
              <Star size={13} color={colors.gold} fill={colors.gold} />
              <Text style={styles.ratingValue}>
                {profile.rating.toFixed(1)}
              </Text>
              <Text style={styles.ratingCount}>
                ({profile.ratingCount.toLocaleString('en-IN')})
              </Text>
            </View>

            {/* Tier badge — premium */}
            <View
              style={[
                styles.tierBadge,
                { backgroundColor: tierColor.bg, borderColor: tierColor.ring },
              ]}
              accessibilityRole="text"
              accessibilityLabel={tierAria}
            >
              <View style={[styles.tierDot, { backgroundColor: tierColor.fg }]} />
              <Text style={[styles.tierText, { color: tierColor.fg }]}>
                {tierLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Meta row: member-since + verification pill */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem} accessibilityRole="text">
          <Clock size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {memberSinceLabel.replace('{{date}}', formatMemberSince(profile.memberSince))}
          </Text>
        </View>

        <View
          style={[styles.verificationPill, { backgroundColor: verif.bg }]}
          accessibilityRole="text"
          accessibilityLabel={verificationAria}
        >
          <VerifIcon size={13} color={verif.fg} />
          <Text style={[styles.verificationText, { color: verif.fg }]}>
            {verificationLabel}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[4],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.background,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
  },
  avatarInitials: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  tierRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radii.full,
    borderWidth: 2.5,
  },
  identity: {
    flex: 1,
    gap: spacing[1.5],
  },
  name: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    lineHeight: 22,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  zoneText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: '#FFF8E6',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  ratingCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
