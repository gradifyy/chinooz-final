import { useEffect, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { useAppTheme } from '../../components/ThemeProvider'
import { colors as lightColors, spacing, radii, fontSize, fontFamily, fontSz } from '@chinooz/theme'

export const MS_DAY = 86400000

export function formatTime(iso: string, t?: (k: string, o?: Record<string, unknown>) => string): string {
  const now = Date.now()
  const diff = now - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t ? t('inbox.timeNow') : 'now'
  if (mins < 60) return t ? t('inbox.timeMinutesAgo', { count: mins }) : `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t ? t('inbox.timeHoursAgo', { count: hrs }) : `${hrs}h`
  const days = Math.floor(hrs / 24)
  return t ? t('inbox.timeDaysAgo', { count: days }) : `${days}d`
}

export function SignInPrompt({ t, onSignIn }: { t: (k: string) => string; onSignIn: () => void }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.signInWrap}>
      <Text style={{ fontSize: fontSz('display')[0] }}>{'\u{1F512}'}</Text>
      <Text style={styles.signInTitle}>{t('inbox.signInPrompt')}</Text>
      <TouchableOpacity style={styles.signInBtn} onPress={onSignIn} accessibilityRole="button" accessibilityLabel={t('inbox.signIn')}>
        <Text style={styles.signInBtnText}>{t('inbox.signIn')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function ErrorState({ t, onRetry }: { t: (k: string) => string; onRetry: () => void }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.errorWrap}>
      <Text style={{ fontSize: fontSz('display')[0] }}>{'\u{26A0}'}</Text>
      <Text style={styles.errorTitle}>{t('inbox.errorTitle')}</Text>
      <Text style={styles.errorSubtitle}>{t('inbox.errorSubtitle')}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('inbox.retry')}>
        <Text style={styles.retryBtnText}>{t('inbox.retry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function InboxOfflineBanner({ t }: { t: (k: string) => string }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const opacity = useSharedValue(0)
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 })
  }, [opacity])
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View style={[styles.offlineBanner, animStyle]}>
      <View style={styles.offlineDot} />
      <Text style={styles.offlineText}>{t('inbox.offlineBanner')}</Text>
    </Animated.View>
  )
}

export const makeStyles = (c: typeof lightColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: c.text,
  },
  content: {
    flex: 1,
  },
  skeletonWrap: {
    padding: spacing[4],
    gap: spacing[4],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllBtn: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  gearIcon: {
    fontSize: fontSz('xl')[0],
    color: c.textMuted,
  },
  groupHeader: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1.5],
    backgroundColor: c.background,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  deleteIcon: {
    fontSize: fontSz('xl')[0],
  },
  notifItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  notifUnread: {
    backgroundColor: c.inboxTint,
  },
  unreadDot: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: c.primary,
    zIndex: 1,
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
  },
  notifTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
  },
  notifBody: {
    fontSize: fontSize.base[0],
    color: c.textMuted,
    marginTop: 2,
    lineHeight: fontSize.base[1],
  },
  notifTime: {
    fontSize: fontSize.sm[0],
    color: c.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: spacing[0.5],
    flexShrink: 0,
  },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  convoUnread: {
    backgroundColor: c.inboxTint,
  },
  convoAvatarWrap: {
    position: 'relative',
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii['3xl'],
    backgroundColor: c.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoVerify: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 17,
    height: 17,
    borderRadius: radii.full,
    backgroundColor: c.primary,
    borderWidth: 2,
    borderColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoAvatarText: {
    fontSize: fontSz('md')[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.white,
  },
  convoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoName: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '400',
    color: c.text,
    flex: 1,
  },
  convoNameUnread: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  convoTime: {
    fontSize: fontSize.sm[0],
    color: c.textMuted,
    marginLeft: spacing[2],
  },
  convoPreview: {
    fontSize: fontSize.base[0],
    color: c.textMuted,
    marginTop: 2,
  },
  convoPreviewUnread: {
    color: c.textSecondary,
    fontWeight: '600',
  },
  convoCtx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  convoCtxText: {
    fontSize: fontSz('2xs')[0],
    fontWeight: '700',
    color: c.textSecondary,
    maxWidth: 180,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    height: 40,
    backgroundColor: c.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  searchIcon: {
    fontSize: fontSz('base')[0],
    color: c.textTertiary,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base[0],
    color: c.text,
    padding: 0,
  },
  unreadBadge: {
    backgroundColor: c.primary,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1.5],
  },
  unreadBadgeText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.white,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.xl,
    backgroundColor: c.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarText: {
    fontSize: fontSz('sm')[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  threadName: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
  },
  storeLink: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '500',
    color: c.primary,
    marginTop: 1,
  },
  loadEarlierBtn: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  loadEarlierText: {
    fontSize: fontSize.sm[0],
    color: c.textMuted,
    textDecorationLine: 'underline',
    textDecorationColor: c.primary,
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginVertical: spacing[3],
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
  },
  dayText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: c.primary,
    borderBottomLeftRadius: radii.sm,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderBottomRightRadius: radii.sm,
  },
  bubbleText: {
    fontSize: fontSize.md[0],
    color: c.text,
    lineHeight: fontSize.md[1],
    fontWeight: '400',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[0.5],
    paddingHorizontal: spacing[1],
  },
  bubbleTime: {
    fontSize: fontSize.sm[0],
    color: c.textMuted,
    fontWeight: '400',
  },
  tick: {
    fontSize: fontSz('base')[0],
    color: c.textMuted,
    fontWeight: '400',
  },
  tickRead: {
    color: c.primary,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[1],
    maxWidth: '75%',
    alignSelf: 'flex-start',
  },
  productCardImg: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
  },
  productCardPrice: {
    fontSize: fontSize.sm[0],
    color: c.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    marginTop: 2,
  },
  typingWrap: {
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  typingBubble: {
    flexDirection: 'row',
    gap: spacing[1.5],
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: c.textTertiary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.white,
  },
  attachBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: c.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.md[0],
    color: c.text,
    fontWeight: '400',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.xl,
    backgroundColor: c.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introWrap: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[3],
  },
  introAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii['3xl'],
    backgroundColor: c.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introGreeting: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    fontWeight: '500',
    color: c.textSecondary,
  },
  assistantBubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    maxWidth: '85%',
  },
  carouselCard: {
    width: 140,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    padding: spacing[2.5],
    gap: spacing[1],
  },
  carouselImg: {
    width: '100%',
    height: 80,
    borderRadius: radii.md,
    backgroundColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselName: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
  },
  carouselPrice: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  quickLinksWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  quickLinkChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: c.primary50,
  },
  quickLinkText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  actionBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dialogBox: {
    backgroundColor: c.white,
    borderRadius: radii.xl,
    padding: spacing[6],
    marginHorizontal: spacing[8],
    gap: spacing[3],
  },
  dialogTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
  },
  dialogBody: {
    fontSize: fontSize.base[0],
    color: c.textMuted,
    lineHeight: fontSize.base[1],
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  dialogBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
  },
  dialogBtnCancel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.textMuted,
  },
  dialogBtnDanger: {
    backgroundColor: c.error,
  },
  dialogBtnDangerText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.white,
  },
  signInWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[3],
  },
  signInTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  signInBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: c.primary,
    marginTop: spacing[2],
  },
  signInBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.text,
    marginTop: spacing[2],
  },
  errorSubtitle: {
    fontSize: fontSize.base[0],
    color: c.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: c.primary,
    marginTop: spacing[2],
  },
  retryBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.primary,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: c.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: c.warning,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: c.warning,
  },
  offlineText: {
    fontSize: fontSz('sm')[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: c.warningText,
  },
  pendingText: {
    fontSize: fontSize.sm[0],
    color: c.textMuted,
    fontWeight: '400',
  },
})
