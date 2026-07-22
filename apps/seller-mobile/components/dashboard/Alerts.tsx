import React, { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, Animated } from 'react-native'
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  PackageX,
  RotateCcw,
  ShieldAlert,
  Star,
  Wallet,
  X,
} from 'lucide-react-native'
import { colors } from '../../lib/theme'
import type { SellerAlert, SellerAlertSeverity } from '@chinooz/mock-data'
import { useA11y } from '../A11yProvider'
import { styles } from './styles'

/** Triage order — most urgent first. Keeps the dashboard action-oriented. */
const SEVERITY_ORDER: Record<SellerAlertSeverity, number> = { error: 0, warning: 1, info: 2, success: 3 }
/** Cap the dashboard surface to the most urgent items; the rest live behind "See all". */
const MAX_VISIBLE_ALERTS = 4

const ALERT_SEVERITY_STYLE = {
  error: { color: colors.error, bg: colors.errorLight },
  warning: { color: colors.warning, bg: colors.warningLight },
  info: { color: colors.info, bg: colors.infoLight },
  success: { color: colors.success, bg: colors.successLight },
} as const

const ALERT_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'new-orders': Box,
  'low-stock': AlertTriangle,
  'out-of-stock': PackageX,
  'returns': RotateCcw,
  'messages': MessageCircle,
  'reviews': Star,
  'payout': Wallet,
  'kyc': ShieldAlert,
}

const ALERT_TITLE_KEY: Record<string, string> = {
  'new-orders': 'seller.dashboard.alertNewOrders',
  'low-stock': 'seller.dashboard.alertLowStock',
  'out-of-stock': 'seller.dashboard.alertOutOfStock',
  'returns': 'seller.dashboard.alertReturns',
  'messages': 'seller.dashboard.alertMessages',
  'reviews': 'seller.dashboard.alertReviews',
  'payout': 'seller.dashboard.alertPayout',
  'kyc': 'seller.dashboard.alertKyc',
}

/** Action-oriented subtitle per alert — turns a count list into a to-do list. */
const ALERT_SUB_KEY: Record<string, string> = {
  'new-orders': 'seller.dashboard.alertSubNewOrders',
  'low-stock': 'seller.dashboard.alertSubLowStock',
  'out-of-stock': 'seller.dashboard.alertSubOutOfStock',
  'returns': 'seller.dashboard.alertSubReturns',
  'messages': 'seller.dashboard.alertSubMessages',
  'reviews': 'seller.dashboard.alertSubReviews',
  'payout': 'seller.dashboard.alertSubPayout',
  'kyc': 'seller.dashboard.alertSubKyc',
}

export function Alerts({
  alerts,
  onRoute,
  t,
}: {
  alerts: SellerAlert[]
  onRoute: (route: string) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const { reducedMotion } = useA11y()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [slidingOut, setSlidingOut] = useState<string | null>(null)

  const visible = alerts
    .filter(a => !dismissed.has(a.id))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, MAX_VISIBLE_ALERTS)
  const allCaughtUp = visible.length === 0

  const dismiss = useCallback(
    (id: string) => {
      if (reducedMotion) {
        setDismissed(prev => new Set(prev).add(id))
        return
      }
      setSlidingOut(id)
      setTimeout(() => {
        setDismissed(prev => new Set(prev).add(id))
        setSlidingOut(null)
      }, 250)
    },
    [reducedMotion],
  )

  if (allCaughtUp) {
    return (
      <View style={styles.alertsCard}>
        <View style={styles.allCaughtUp}>
          <Animated.View style={styles.allCaughtUpIcon}>
            <CheckCircle2 size={40} color={colors.success} />
          </Animated.View>
          <Text style={styles.allCaughtUpTitle}>{t('seller.dashboard.alertAllCaughtUp')}</Text>
          <Text style={styles.allCaughtUpSub}>{t('seller.dashboard.alertAllCaughtUpSub')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.alertsCard}>
      {visible.map((a, idx) => {
        const sev = ALERT_SEVERITY_STYLE[a.severity]
        const Icon = ALERT_ICON_MAP[a.icon] ?? AlertTriangle
        const title = t(ALERT_TITLE_KEY[a.icon] ?? a.title)
        const subKey = ALERT_SUB_KEY[a.icon]
        const subtitle = subKey ? t(subKey) : undefined
        const isSlidingOut = slidingOut === a.id
        const ariaLabel = t('seller.dashboard.alertAria', { title, count: a.count })

        return (
          <Animated.View
            key={a.id}
            style={[
              styles.alertRow,
              idx > 0 && styles.alertRowBorder,
              isSlidingOut && { opacity: 0, transform: [{ translateX: reducedMotion ? 0 : 300 }] },
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={ariaLabel}
              onPress={() => onRoute(a.route)}
              style={styles.alertNav}
              activeOpacity={0.6}
            >
              <View style={[styles.alertIconTile, { backgroundColor: sev.bg }]}>
                <Icon size={22} color={sev.color} />
              </View>
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle} numberOfLines={1}>
                  {title}
                </Text>
                {!!subtitle && (
                  <Text style={styles.alertSub} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
              <Text style={[styles.alertCount, { color: sev.color }]}>{a.count}</Text>
              {!a.dismissible && <ChevronRight size={18} color={colors.textTertiary} />}
            </TouchableOpacity>
            {a.dismissible && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('seller.dashboard.alertDismiss')}
                onPress={() => dismiss(a.id)}
                hitSlop={8}
                style={styles.alertDismissBtn}
              >
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )
      })}
    </View>
  )
}
