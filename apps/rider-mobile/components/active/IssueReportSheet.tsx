import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  AccessibilityInfo,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  AlertTriangle,
  X,
  Check,
  Pause,
  XCircle,
  LifeBuoy,
  PackageX,
  MapPinOff,
  PhoneOff,
  Banknote,
  Car,
  CircleAlert,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery, DeliveryStatus } from '@chinooz/types'

interface IssueReportSheetProps {
  visible: boolean
  delivery: ActiveDelivery
  onClose: () => void
  onPause: (reason: string) => void
  onCancel: (reason: string) => void
  onEscalate: (reason: string) => void
}

type IssueReasonType =
  | 'cant_collect'
  | 'cant_find'
  | 'unreachable'
  | 'cod_dispute'
  | 'accident'
  | 'other'

type IssueAction = 'pause' | 'cancel' | 'escalate'

/** Which issue reasons are relevant for a given delivery status. */
function reasonsForStatus(status: DeliveryStatus): IssueReasonType[] {
  switch (status) {
    case 'heading_to_pickup':
    case 'at_pickup':
      return ['cant_collect', 'accident', 'other']
    case 'picked_up':
    case 'in_transit':
      return ['cant_find', 'unreachable', 'accident', 'other']
    case 'at_dropoff':
      return ['unreachable', 'cod_dispute', 'cant_find', 'accident', 'other']
    default:
      return ['other']
  }
}

const REASON_ICONS: Record<IssueReasonType, React.ReactNode> = {
  cant_collect: <PackageX size={18} color={colors.warning} />,
  cant_find: <MapPinOff size={18} color={colors.warning} />,
  unreachable: <PhoneOff size={18} color={colors.warning} />,
  cod_dispute: <Banknote size={18} color={colors.warning} />,
  accident: <Car size={18} color={colors.error} />,
  other: <CircleAlert size={18} color={colors.textMuted} />,
}

/**
 * RX4 — Issue report sheet: structured reasons per delivery stage with
 * pause / cancel / escalate actions.
 *
 * Shows relevant issue reasons based on the current delivery status (can't
 * collect at pickup, can't find address in transit, COD dispute at drop-off,
 * etc.), an optional details field, and three clear actions:
 * - Pause: stops the simulator, notifies dispatch, rider can resume
 * - Cancel: cancels the delivery
 * - Escalate: notifies support, keeps state intact
 *
 * Fast under stress: large touch targets, clear labels, one-tap actions.
 */
export default function IssueReportSheet({
  visible,
  delivery,
  onClose,
  onPause,
  onCancel,
  onEscalate,
}: IssueReportSheetProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const [reason, setReason] = useState<IssueReasonType | null>(null)
  const [detail, setDetail] = useState('')

  const handleClose = useCallback(() => {
    setReason(null)
    setDetail('')
    onClose()
  }, [onClose])

  const buildReasonString = useCallback(
    (r: IssueReasonType, d: string): string => {
      const labels: Record<IssueReasonType, string> = {
        cant_collect: t('rider.active.issueReasonCantCollect'),
        cant_find: t('rider.active.issueReasonCantFind'),
        unreachable: t('rider.active.issueReasonUnreachable'),
        cod_dispute: t('rider.active.issueReasonCodDispute'),
        accident: t('rider.active.issueReasonAccident'),
        other: t('rider.active.issueReasonOther'),
      }
      return d ? `${labels[r]}: ${d}` : labels[r]
    },
    [t],
  )

  const handleAction = useCallback(
    (action: IssueAction) => {
      if (!reason) return
      const reasonStr = buildReasonString(reason, detail)
      try {
        if (!reducedMotion) {
          Haptics.notificationAsync(
            action === 'cancel'
              ? Haptics.NotificationFeedbackType.Error
              : Haptics.NotificationFeedbackType.Warning,
          )
        }
      } catch {}

      analytics.track({
        event: 'rider_active_issue_action',
        screen: 'rider-active-delivery',
        action,
        reason: reason,
        detail,
      })

      const announcements: Record<IssueAction, string> = {
        pause: t('rider.active.issuePaused'),
        cancel: t('rider.active.issueCancelled'),
        escalate: t('rider.active.issueEscalated'),
      }
      try { AccessibilityInfo.announceForAccessibility(announcements[action]) } catch {}

      handleClose()

      if (action === 'pause') onPause(reasonStr)
      else if (action === 'cancel') onCancel(reasonStr)
      else onEscalate(reasonStr)
    },
    [reason, detail, reducedMotion, t, handleClose, onPause, onCancel, onEscalate, buildReasonString],
  )

  const availableReasons = reasonsForStatus(delivery.status)

  const reasonLabels: Record<IssueReasonType, { label: string; desc: string }> = {
    cant_collect: {
      label: t('rider.active.issueReasonCantCollect'),
      desc: t('rider.active.issueReasonCantCollectDesc'),
    },
    cant_find: {
      label: t('rider.active.issueReasonCantFind'),
      desc: t('rider.active.issueReasonCantFindDesc'),
    },
    unreachable: {
      label: t('rider.active.issueReasonUnreachable'),
      desc: t('rider.active.issueReasonUnreachableDesc'),
    },
    cod_dispute: {
      label: t('rider.active.issueReasonCodDispute'),
      desc: t('rider.active.issueReasonCodDisputeDesc'),
    },
    accident: {
      label: t('rider.active.issueReasonAccident'),
      desc: t('rider.active.issueReasonAccidentDesc'),
    },
    other: {
      label: t('rider.active.issueReasonOther'),
      desc: t('rider.active.issueReasonOtherDesc'),
    },
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={styles.sheet}
          onPress={() => {}}
          accessibilityRole="alert"
          accessibilityLabel={t('rider.active.issueAria')}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AlertTriangle size={22} color={colors.warning} />
              <Text style={styles.title}>{t('rider.active.issueSheetTitle')}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.issueClose')}
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>{t('rider.active.issueSheetSubtitle')}</Text>

          {/* Reason selection */}
          <View style={styles.reasonsWrap}>
            {availableReasons.map((key) => {
              const selected = reason === key
              const { label, desc } = reasonLabels[key]
              return (
                <TouchableOpacity
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  onPress={() => {
                    setReason(key)
                    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                  }}
                  style={[styles.reasonBtn, selected && styles.reasonBtnSelected]}
                  activeOpacity={0.85}
                  testID={`issue-reason-${key}`}
                >
                  <View style={styles.reasonIconWrap}>
                    {REASON_ICONS[key]}
                  </View>
                  <View style={styles.reasonTextWrap}>
                    <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                      {label}
                    </Text>
                    <Text style={styles.reasonDesc}>{desc}</Text>
                  </View>
                  {selected && <Check size={18} color={colors.primary} strokeWidth={3} />}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Optional details */}
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabel={t('rider.active.issuePlaceholder')}
              value={detail}
              onChangeText={setDetail}
              placeholder={t('rider.active.issuePlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
              testID="issue-detail"
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.issueActionPause')}
              accessibilityHint={t('rider.active.issueActionPauseHint')}
              accessibilityState={{ disabled: !reason }}
              onPress={() => handleAction('pause')}
              style={[styles.actionBtn, styles.actionPause, !reason && styles.actionDisabled, { minHeight: minTouchTarget }]}
              activeOpacity={0.85}
              disabled={!reason}
              testID="issue-action-pause"
            >
              <Pause size={18} color={colors.white} />
              <Text style={styles.actionText}>{t('rider.active.issueActionPause')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.issueActionEscalate')}
              accessibilityHint={t('rider.active.issueActionEscalateHint')}
              accessibilityState={{ disabled: !reason }}
              onPress={() => handleAction('escalate')}
              style={[styles.actionBtn, styles.actionEscalate, !reason && styles.actionDisabled, { minHeight: minTouchTarget }]}
              activeOpacity={0.85}
              disabled={!reason}
              testID="issue-action-escalate"
            >
              <LifeBuoy size={18} color={colors.white} />
              <Text style={styles.actionText}>{t('rider.active.issueActionEscalate')}</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel delivery — separate, clearly destructive */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.issueActionCancel')}
            accessibilityHint={t('rider.active.issueActionCancelHint')}
            accessibilityState={{ disabled: !reason }}
            onPress={() => handleAction('cancel')}
            style={[styles.cancelBtn, !reason && styles.cancelDisabled]}
            disabled={!reason}
            testID="issue-action-cancel"
          >
            <XCircle size={16} color={reason ? colors.error : colors.textMuted} />
            <Text style={[styles.cancelText, !reason && styles.cancelTextDisabled]}>
              {t('rider.active.issueActionCancel')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  // Reasons
  reasonsWrap: {
    gap: spacing[2],
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  reasonBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  reasonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonTextWrap: {
    flex: 1,
    gap: 1,
  },
  reasonLabel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  reasonLabelSelected: {
    color: colors.primary,
  },
  reasonDesc: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  // Input
  inputWrap: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  input: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
    minHeight: 50,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  // Actions
  actionsWrap: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
  },
  actionPause: {
    backgroundColor: colors.gold,
  },
  actionEscalate: {
    backgroundColor: colors.primary,
  },
  actionDisabled: {
    backgroundColor: colors.borderLight,
  },
  actionText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  // Cancel
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  cancelDisabled: {},
  cancelText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.error,
  },
  cancelTextDisabled: {
    color: colors.textMuted,
  },
})
