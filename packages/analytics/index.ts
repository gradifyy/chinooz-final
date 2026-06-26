type EventName = string
type EventProperties = Record<string, string | number | boolean>

const analytics = {
  track: (event: EventName, properties?: EventProperties) => {
    if (__DEV__) {
      console.log('[Analytics]', event, properties ?? '')
    }
  },
  screen: (screenName: string, properties?: EventProperties) => {
    if (__DEV__) {
      console.log('[Analytics Screen]', screenName, properties ?? '')
    }
  },
  identify: (userId: string, traits?: Record<string, string>) => {
    if (__DEV__) {
      console.log('[Analytics Identify]', userId, traits ?? '')
    }
  },
}

export default analytics
