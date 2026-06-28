export type AnalyticsEvent = {
  name: string
  properties?: Record<string, unknown>
}

export type AnalyticsScreen = {
  name: string
  properties?: Record<string, unknown>
}

type NoopFn = (...args: any[]) => void

const noop: NoopFn = () => {}

export const analytics = {
  screen: noop,
  track: noop,
  identify: noop,
  reset: noop,
}

export function initAnalytics(_opts?: Record<string, unknown>): typeof analytics {
  return analytics
}

export default analytics
