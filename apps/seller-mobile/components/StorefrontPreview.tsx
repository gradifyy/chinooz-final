import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { Store } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'

interface Props {
  storeName: string
  categoryName: string
  logoUrl: string
  bannerUrl: string
  noLogoLabel: string
  noBannerLabel: string
  noNameLabel: string
  noCategoryLabel: string
  previewTitle: string
}

export default function StorefrontPreview({
  storeName,
  categoryName,
  logoUrl,
  bannerUrl,
  noLogoLabel,
  noBannerLabel,
  noNameLabel,
  noCategoryLabel,
  previewTitle,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{previewTitle}</Text>
      <View style={styles.card}>
        <View style={styles.bannerArea}>
          {bannerUrl ? (
            <Image source={{ uri: bannerUrl }} style={styles.banner} resizeMode="cover" />
          ) : (
            <View style={[styles.banner, styles.bannerEmpty]}>
              <Text style={styles.emptyText}>{noBannerLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="cover" />
              ) : (
                <View style={[styles.logo, styles.logoEmpty]}>
                  <Store size={20} color={colors.textTertiary} strokeWidth={2} />
                </View>
              )}
            </View>
            <View style={styles.nameArea}>
              <Text style={styles.name} numberOfLines={1}>
                {storeName || noNameLabel}
              </Text>
              <Text style={styles.category} numberOfLines={1}>
                {categoryName || noCategoryLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  bannerArea: {
    width: '100%',
  },
  banner: {
    width: '100%',
    height: 100,
    backgroundColor: colors.borderLight,
  },
  bannerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: -24,
  },
  logoWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  logo: {
    width: 48,
    height: 48,
    backgroundColor: colors.borderLight,
    borderRadius: radii.lg,
  },
  logoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameArea: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  category: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
})
