import { StyleSheet } from 'react-native'
import { colors, spacing, radii, fontFamily, sellerFont } from '../../lib/theme'

// Chart geometry (viewBox units; the <Svg> scales to 100% container width).
export const CHART_W = 340
export const CHART_H = 188
export const C_PAD_L = 10
export const C_PAD_R = 10
export const C_PAD_T = 18
export const C_PAD_B = 30

// Analytics-hero chart geometry — more whitespace, no axis labels, room for
// the endpoint halo above the curve. viewBox scales to 100% container width.
export const HERO_CHART_W = 340
export const HERO_CHART_H = 176
export const HC_PAD_L = 8
export const HC_PAD_R = 8
export const HC_PAD_T = 26
export const HC_PAD_B = 10

const SANS = fontFamily.sans[0]
const SANS_SEMI = fontFamily.sansSemiBold[0]

// Refined corner language — tighter than the old xl(24) for a calmer, more
// premium read; the hero metric keeps a slightly rounder corner.
const CARD_RADIUS = 20
const CHIP_RADIUS = 14

/** Quiet, emerald-tinted elevation for standard surfaces (hairline + soft lift). */
const cardShadow = {
  shadowColor: '#1A1917',
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
}

/** Crisp-but-soft lift for the segmented-control thumb (white on a tinted track). */
const thumbShadow = {
  shadowColor: '#1A1917',
  shadowOpacity: 0.1,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
}

/** Deep brand glow reserved for the hero revenue metric. */
const heroShadow = {
  shadowColor: '#100F12',
  shadowOpacity: 0.26,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: 18 },
  elevation: 10,
}

/** Soft, borderless elevation for the analytics hero card — a calm lift with no hairline. */
const analyticsHeroShadow = {
  shadowColor: '#1A1917',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 6,
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
    gap: spacing[2],
  },

  // ── Header / greeting ────────────────────────────────────────────────
  header: { gap: spacing[6], marginBottom: spacing[2], paddingTop: spacing[2] },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  headerText: { flex: 1, gap: 3 },
  // Eyebrow date sits ABOVE the greeting for an editorial hierarchy.
  dateLine: { fontSize: 12.5, color: colors.textTertiary, fontFamily: SANS_SEMI, letterSpacing: 0.3 },
  greeting: { fontSize: 24, lineHeight: 29, color: colors.text, fontFamily: sellerFont.display, letterSpacing: -0.6 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusText: { fontSize: 12, fontFamily: SANS_SEMI, letterSpacing: 0.1 },

  // ── Date range — premium iOS-style segmented control ─────────────────
  // Recessed tinted track + an elevated white thumb with a brand-green active
  // label. Thinner and far quieter than a row of filled buttons.
  rangeTrack: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radii.full,
    padding: 3,
    alignSelf: 'stretch',
  },
  rangeSegment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: radii.full },
  rangeSegmentActive: { backgroundColor: colors.surface, ...thumbShadow },
  rangeLabel: { fontSize: 13, color: colors.textMuted, fontFamily: SANS_SEMI, letterSpacing: 0.1 },
  rangeLabelActive: { color: colors.primary },

  // ── Sections ─────────────────────────────────────────────────────────
  sections: { gap: spacing[8], marginTop: spacing[5] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[0.5],
  },
  sectionTitle: { fontSize: 15, color: colors.text, fontFamily: sellerFont.displayBold, letterSpacing: -0.2 },
  seeAllLink: { fontSize: 13, color: colors.primary, fontFamily: SANS_SEMI },

  // ── Generic card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    ...cardShadow,
  },

  // ── Go-live full checklist ───────────────────────────────────────────
  goLiveTitle: { fontSize: 16, color: colors.text, fontFamily: sellerFont.displayBold, marginBottom: 4 },
  goLiveSubtitle: { fontSize: 13, color: colors.textMuted, fontFamily: SANS, lineHeight: 19, marginBottom: spacing[4] },
  progressBarTrack: { height: 8, backgroundColor: colors.primary50, borderRadius: radii.full, overflow: 'hidden', marginBottom: spacing[2] },
  progressBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: radii.full },
  goLiveProgress: { fontSize: 12, color: colors.textMuted, fontFamily: SANS_SEMI, marginBottom: spacing[4] },
  checklistRows: { gap: spacing[3] },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] },
  checklistLabel: { fontSize: 14, color: colors.text, fontFamily: SANS_SEMI },
  checklistLabelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  goLiveContinueBtn: { backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: spacing[3.5], alignItems: 'center', marginTop: spacing[5] },
  goLiveContinueText: { color: colors.white, fontFamily: sellerFont.displayBold, fontSize: 15 },

  // ── Store setup card (premium, replaces the old slim banner) ─────────
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    ...cardShadow,
  },
  setupBody: { flex: 1 },
  setupTitle: { fontSize: 16, color: colors.text, fontFamily: sellerFont.displaySemi, letterSpacing: -0.2 },
  setupCompleted: { fontSize: 13, color: colors.textMuted, fontFamily: SANS_SEMI, marginTop: 3 },
  setupTrack: { height: 6, backgroundColor: colors.primary50, borderRadius: radii.full, overflow: 'hidden', marginTop: spacing[3] },
  setupFill: { height: 6, backgroundColor: colors.primary, borderRadius: radii.full },
  setupMeta: { fontSize: 12, color: colors.textTertiary, fontFamily: SANS_SEMI, letterSpacing: 0.1, marginTop: spacing[2] },

  // ── KPI grid — clean modular stat cards (borderless, shadow-lifted) ───
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  kpiCard: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[2],
    ...cardShadow,
  },
  kpiLabel: { fontSize: 12.5, color: colors.textMuted, fontFamily: SANS_SEMI, letterSpacing: 0.2 },
  kpiValue: { fontSize: 24, color: colors.text, fontFamily: sellerFont.displayBold, fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  kpiPeriod: { fontSize: 11, color: colors.textTertiary, fontFamily: SANS },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], flexWrap: 'wrap' },
  kpiDelta: { fontSize: 12, fontFamily: SANS_SEMI, fontVariant: ['tabular-nums'] },
  kpiVsPrev: { fontSize: 11, color: colors.textTertiary, fontFamily: SANS },
  kpiDeltaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full },
  kpiDeltaPillText: { fontSize: 12, fontFamily: SANS_SEMI, fontVariant: ['tabular-nums'] },
  // Subtle line-sparkline lane on grid cards.
  kpiSparkChart: { height: 26, marginVertical: spacing[0.5] },

  // ── Featured KPI (revenue) — gradient performance hero ───────────────
  // Eyebrow label → large amount → growth + comparison → clean area chart.
  kpiFeaturedCard: {
    borderRadius: 20,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    overflow: 'hidden',
    marginBottom: spacing[3],
    ...heroShadow,
  },
  kpiFeaturedLabel: { fontSize: 12, color: 'rgba(255,255,255,0.82)', fontFamily: SANS_SEMI, letterSpacing: 0.8, textTransform: 'uppercase' },
  kpiFeaturedValue: { fontSize: 42, lineHeight: 48, color: colors.white, fontFamily: sellerFont.display, fontVariant: ['tabular-nums'], letterSpacing: -1.4, marginTop: spacing[2] },
  kpiFeaturedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2.5] },
  kpiFeaturedDeltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full, backgroundColor: 'rgba(255,255,255,0.2)' },
  kpiFeaturedDeltaText: { fontSize: 12.5, color: colors.white, fontFamily: SANS_SEMI, fontVariant: ['tabular-nums'] },
  kpiFeaturedPeriod: { fontSize: 12.5, color: 'rgba(255,255,255,0.74)', fontFamily: SANS },
  kpiFeaturedChart: { height: 68, marginTop: spacing[5], marginHorizontal: -spacing[1] },

  // ── Sparkline (legacy bar variant) ───────────────────────────────────
  sparklineContainer: { marginVertical: 2 },
  sparklineTrack: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, width: '100%' },

  // ── KPI skeletons ────────────────────────────────────────────────────
  skeletonLabel: { width: 70, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonValue: { width: 110, height: 26, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 6 },
  skeletonSpark: { width: '100%', height: 26, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 6 },
  skeletonPeriod: { width: 60, height: 11, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 6 },
  skeletonDelta: { width: 80, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: 4 },

  // ── Sales chart ──────────────────────────────────────────────────────
  chartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4], flexWrap: 'wrap', gap: spacing[2] },
  chartTitle: { fontSize: 15, color: colors.text, fontFamily: sellerFont.displayBold, letterSpacing: -0.2 },
  chartToggleGroup: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderLight, padding: 3 },
  chartTogglePill: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full },
  chartTogglePillActive: { backgroundColor: colors.primary },
  chartToggleText: { fontSize: 12, color: colors.textMuted, fontFamily: SANS_SEMI },
  chartToggleTextActive: { color: colors.white },
  chartEmpty: {
    height: CHART_H,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  chartEmptyText: { fontSize: 14, color: colors.text, fontFamily: sellerFont.displaySemi },
  chartEmptySub: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1], textAlign: 'center', fontFamily: SANS },
  chartTouchLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: CHART_H },
  chartTouchPoint: { position: 'absolute', width: 32, height: 32, marginLeft: -16, marginTop: -16 },
  chartTooltip: { marginTop: spacing[2], backgroundColor: colors.text, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2], alignSelf: 'flex-start' },
  chartTooltipValue: { fontSize: 13, color: colors.white, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'] },
  chartTooltipDate: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: SANS, marginTop: 1 },
  chartTableFallback: { marginTop: spacing[4], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderLight },
  chartTableTitle: { fontSize: 11, color: colors.textTertiary, fontFamily: SANS_SEMI, marginBottom: spacing[1], letterSpacing: 0.5 },
  chartTableRow: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'], marginTop: 1, fontFamily: SANS },
  // Screen-reader-only: keeps the chart's tabular data in the a11y tree without visual clutter.
  chartA11yHidden: { position: 'absolute', width: 1, height: 1, left: -9999, overflow: 'hidden', opacity: 0 },

  // ── Offline banner ───────────────────────────────────────────────────
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.warningLight, borderRadius: radii.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], marginBottom: spacing[3] },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  offlineText: { fontSize: 13, color: colors.warningText, fontFamily: SANS_SEMI },

  // ── Section / state skeletons ────────────────────────────────────────
  skeletonSectionTitle: { width: 120, height: 16, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginBottom: spacing[3] },
  skeletonKpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  skeletonKpiCard: { width: '48%', flexGrow: 1, borderRadius: CARD_RADIUS, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[2] },
  skeletonBlock: { width: 80, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonBlockWide: { width: 120, height: 28, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonBlockNarrow: { width: 60, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonChartCard: { height: 220, borderRadius: CARD_RADIUS, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.shimmer },
  skeletonAlertRow: { height: 58, paddingHorizontal: spacing[4], backgroundColor: colors.shimmer, borderRadius: CARD_RADIUS, marginTop: spacing[2] },
  skeletonQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  skeletonQuickTile: { width: '31%', flexGrow: 1, height: 92, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.shimmer },
  skeletonActivityRow: { height: 58, paddingHorizontal: spacing[3], backgroundColor: colors.shimmer, borderRadius: CARD_RADIUS, marginTop: spacing[2] },
  skeletonRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },

  // ── First-run empty ──────────────────────────────────────────────────
  firstRunCard: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    ...cardShadow,
  },
  firstRunIllustration: { marginBottom: spacing[2] },
  firstRunCircle: { width: 80, height: 80, borderRadius: radii.full, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  firstRunTitle: { fontSize: 20, color: colors.text, fontFamily: sellerFont.displayBold, textAlign: 'center' },
  firstRunSubtitle: { fontSize: 14, color: colors.textMuted, fontFamily: SANS, textAlign: 'center', lineHeight: 20 },
  firstRunCta: { backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: spacing[3.5], paddingHorizontal: spacing[6], marginTop: spacing[2] },
  firstRunCtaText: { color: colors.white, fontFamily: sellerFont.displayBold, fontSize: 15 },
  firstRunZeroKpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4], width: '100%' },
  firstRunZeroKpi: { width: '31%', flexGrow: 1, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[3], alignItems: 'center', gap: 2 },
  firstRunZeroValue: { fontSize: 16, color: colors.textTertiary, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'] },
  firstRunZeroDelta: { fontSize: 12, color: colors.textTertiary, fontFamily: SANS_SEMI },

  // ── Error state ──────────────────────────────────────────────────────
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    ...cardShadow,
  },
  errorIcon: { marginBottom: spacing[1] },
  errorTitle: { fontSize: 18, color: colors.text, fontFamily: sellerFont.displaySemi, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, fontFamily: SANS, textAlign: 'center' },
  errorRetryBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.full, paddingVertical: spacing[2.5], paddingHorizontal: spacing[5], marginTop: spacing[2] },
  errorRetryText: { color: colors.primary, fontFamily: sellerFont.displayBold, fontSize: 14 },

  // ── Alerts / Needs attention — scannable action list ─────────────────
  alertsCard: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', ...cardShadow },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
  alertRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  alertNav: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingLeft: spacing[4], paddingRight: spacing[3], paddingVertical: spacing[3.5] },
  alertIconTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertBody: { flex: 1, gap: 2, minWidth: 0 },
  alertTitle: { fontSize: 14.5, color: colors.text, fontFamily: SANS_SEMI, lineHeight: 19 },
  alertSub: { fontSize: 12.5, color: colors.textMuted, fontFamily: SANS, lineHeight: 16 },
  alertCount: { fontSize: 16, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'], flexShrink: 0 },
  alertDismissBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
  allCaughtUp: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[8], gap: spacing[2] },
  allCaughtUpIcon: { marginBottom: spacing[1] },
  allCaughtUpTitle: { fontSize: 16, color: colors.text, fontFamily: sellerFont.displaySemi },
  allCaughtUpSub: { fontSize: 12, color: colors.textMuted, fontFamily: SANS, textAlign: 'center' },

  // ── Quick actions (compact 3-up grid, rounded-square chips) ──────────
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2.5] },
  quickActionTileWrap: { flexGrow: 0 },
  quickActionBtn: { alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, paddingVertical: spacing[4], paddingHorizontal: spacing[2], ...cardShadow },
  quickActionIcon: { width: 44, height: 44, borderRadius: CHIP_RADIUS, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 12, color: colors.text, fontFamily: SANS_SEMI, textAlign: 'center' },

  // ── Recent activity ──────────────────────────────────────────────────
  activityRowWrap: { minHeight: 60, paddingHorizontal: spacing[4] },
  activityRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  activityRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2.5] },
  activityIcon: { width: 38, height: 38, borderRadius: CHIP_RADIUS, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityBody: { flex: 1, gap: 1, minWidth: 0 },
  activityTitle: { fontSize: 15, color: colors.text, fontFamily: SANS_SEMI, lineHeight: 21 },
  activitySubtitle: { fontSize: 12.5, color: colors.textMuted, fontFamily: SANS },
  activityStatusPill: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5], borderRadius: radii.full, flexShrink: 0 },
  activityStatusText: { fontSize: 12, fontFamily: SANS_SEMI },
  activityAmount: { fontSize: 12, color: colors.text, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'], flexShrink: 0 },
  activityFilterBar: { flexDirection: 'row', gap: spacing[1.5], padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  activityFilterPill: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full, backgroundColor: colors.background },
  activityFilterPillActive: { backgroundColor: colors.primary },
  activityFilterText: { fontSize: 12, color: colors.textMuted, fontFamily: SANS_SEMI },
  activityFilterTextActive: { color: colors.white },
  activityEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[6], gap: spacing[2] },
  activityEmptyTitle: { fontSize: 16, color: colors.text, fontFamily: sellerFont.displaySemi },
  activityEmptySub: { fontSize: 12, color: colors.textMuted, fontFamily: SANS, textAlign: 'center' },
  activitySkeletonIcon: { width: 38, height: 38, borderRadius: CHIP_RADIUS, backgroundColor: colors.shimmer },
  activitySkeletonTitle: { width: 140, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  activitySkeletonSub: { width: 100, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  activitySkeletonBadge: { width: 50, height: 20, borderRadius: radii.full, backgroundColor: colors.shimmer },

  emptyText: { fontSize: 14, color: colors.textMuted, fontFamily: SANS, textAlign: 'center', paddingVertical: spacing[3] },

  // ── Custom range sheet ───────────────────────────────────────────────
  sheetOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay, justifyContent: 'flex-end', zIndex: 40 },
  sheetCard: { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], padding: spacing[5], gap: spacing[3] },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, color: colors.text, fontFamily: sellerFont.displaySemi },
  sheetFields: { flexDirection: 'row', gap: spacing[3] },
  sheetField: { flex: 1, gap: 4 },
  sheetFieldLabel: { fontSize: 12, color: colors.textMuted, fontFamily: SANS_SEMI },
  dateInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  dateInputText: { fontSize: 14, color: colors.text, fontFamily: SANS },
  sheetApplyBtn: { backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: spacing[3.5], alignItems: 'center' },
  sheetApplyText: { color: colors.white, fontFamily: sellerFont.displayBold, fontSize: 15 },

  // ── Analytics hero — premium revenue card ────────────────────────────
  // One calm, borderless surface. Typography carries the hierarchy; the chart
  // is the visual anchor. 8pt rhythm throughout.
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing[6],
    ...analyticsHeroShadow,
  },
  heroEyebrow: { fontSize: 12, color: colors.textMuted, fontFamily: SANS_SEMI, letterSpacing: 0.8, textTransform: 'uppercase' },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing[1], gap: spacing[1] },
  heroPrefix: { fontSize: 22, color: colors.textTertiary, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'] },
  heroValue: { fontSize: 40, lineHeight: 44, color: colors.text, fontFamily: sellerFont.display, fontVariant: ['tabular-nums'], letterSpacing: -1.2 },
  heroTrendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[2.5], flexWrap: 'wrap' },
  heroTrendDelta: { fontSize: 15, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'] },
  heroTrendCaret: { fontSize: 13, fontFamily: SANS_SEMI },
  heroTrendCaption: { fontSize: 12.5, color: colors.textTertiary, fontFamily: SANS },
  heroChartWrap: { marginTop: spacing[5], marginHorizontal: -spacing[1] },
  heroRangeWrap: { marginTop: spacing[5] },
  heroMetrics: { flexDirection: 'row', marginTop: spacing[5], paddingTop: spacing[5], borderTopWidth: 1, borderTopColor: colors.borderLight },
  heroMetric: { flex: 1, gap: 4 },
  heroMetricDivided: { borderLeftWidth: 1, borderLeftColor: colors.borderLight, paddingLeft: spacing[3] },
  heroMetricLabel: { fontSize: 11, color: colors.textTertiary, fontFamily: SANS_SEMI, letterSpacing: 0.3 },
  heroMetricValue: { fontSize: 16, color: colors.text, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'] },
  heroChartTouchLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: HERO_CHART_H },
  heroChartTouchPoint: { position: 'absolute', width: 36, height: 48, marginLeft: -18, marginTop: -24 },
  heroTooltip: { marginTop: spacing[2], flexDirection: 'row', alignItems: 'center', gap: spacing[2], alignSelf: 'center', backgroundColor: colors.text, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[1.5] },
  heroTooltipValue: { fontSize: 13, color: colors.white, fontFamily: sellerFont.displaySemi, fontVariant: ['tabular-nums'] },
  heroTooltipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  heroTooltipDate: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: SANS },
  heroEmpty: { height: HERO_CHART_H, alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingHorizontal: spacing[4] },
  heroEmptyText: { fontSize: 14, color: colors.text, fontFamily: sellerFont.displaySemi, textAlign: 'center' },
  heroEmptySub: { fontSize: 12, color: colors.textMuted, fontFamily: SANS, textAlign: 'center' },
  heroA11yHidden: { position: 'absolute', width: 1, height: 1, left: -9999, overflow: 'hidden', opacity: 0 },

  // ── Analytics hero skeleton ──────────────────────────────────────────
  heroSkLabel: { width: 64, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  heroSkValue: { width: 180, height: 34, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: spacing[2] },
  heroSkTrend: { width: 150, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer, marginTop: spacing[2.5] },
  heroSkChart: { height: HERO_CHART_H, borderRadius: radii.lg, backgroundColor: colors.shimmer, marginTop: spacing[5] },
  heroSkRange: { height: 34, borderRadius: radii.full, backgroundColor: colors.shimmer, marginTop: spacing[5] },
  heroSkMetrics: { flexDirection: 'row', marginTop: spacing[5], paddingTop: spacing[5], borderTopWidth: 1, borderTopColor: colors.borderLight },
  heroSkMetric: { flex: 1, gap: 6 },
  heroSkMetricDivided: { borderLeftWidth: 1, borderLeftColor: colors.borderLight, paddingLeft: spacing[3] },
  heroSkMetricLabel: { width: 48, height: 10, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  heroSkMetricValue: { width: 56, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
})
