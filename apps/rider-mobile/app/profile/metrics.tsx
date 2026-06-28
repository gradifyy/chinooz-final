import React from 'react'
import MetricsDetailScreen from '../../components/MetricsDetailScreen'

/**
 * RP2 — Metrics detail + trends route.
 * Reachable from the Performance scorecard tiles (tap-through) and the
 * "Metrics detail" entry point. Pushed from Profile, NOT a bottom tab.
 */
export default function MetricsRoute() {
  return <MetricsDetailScreen />
}
