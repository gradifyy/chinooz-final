import React, { createContext, useContext, useEffect, useState } from 'react'
import { AccessibilityInfo, PixelRatio } from 'react-native'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { meetsWCAG_AA } from '@chinooz/utils'

/**
 * Rider a11y + outdoor baseline.
 *
 * The rider app is used one-handed, in sunlight, on the move. This provider
 * establishes the shared accessibility contract every screen reads through
 * `useA11y()`:
 *
 *  - `minTouchTarget`: 48dp. WCAG 2.5.5 / Material minimum for one-handed use.
 *  - `fontScaleEnabled`: respects the OS Dynamic Type setting so text scales
 *    up for riders in bright sunlight. Screens must never hard-cap font sizes.
 *  - `reducedMotion`: from the shared @chinooz/ui hook (reuse, not fork).
 *  - `isBoldTextEnabled`: iOS bold-text preference, used to bump font weight.
 *  - `highContrast`: OS high-contrast / invert preference — screens use the
 *    shared high-contrast palette tokens from @chinooz/theme for legibility.
 *  - `meetsContrast`: shared WCAG_AA checker from @chinooz/utils (reuse).
 *  - `a11yLabel`/`a11yHint`: helpers so labels/hints stay consistent across
 *    the one-handed, screen-reader-driven UI.
 */

interface A11yContextValue {
  /** Minimum tap target in physical dp (48dp — one-handed, on-the-move). */
  minTouchTarget: number
  /** True when the OS Reduce Motion preference is on. */
  reducedMotion: boolean
  /** True when Dynamic Type / font scaling is allowed (default true). */
  fontScaleEnabled: boolean
  /** True when the OS bold-text preference is on (bumps font weight). */
  isBoldTextEnabled: boolean
  /** True when the OS high-contrast / invert preference is on. */
  highContrast: boolean
  /** Shared WCAG_AA contrast checker from @chinooz/utils. */
  meetsContrast: (fg: string, bg: string) => boolean
}

const A11yContext = createContext<A11yContextValue>({
  minTouchTarget: 48,
  reducedMotion: false,
  fontScaleEnabled: true,
  isBoldTextEnabled: false,
  highContrast: false,
  meetsContrast: meetsWCAG_AA,
})

export function useA11y() {
  return useContext(A11yContext)
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion()
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  // Register a runtime-only accessibility change event whose name is not in
  // the RN 0.81 typed union (boldTextChanged on iOS, highTextContrastChanged
  // on Android). We force the boolean change-handler overload explicitly.
  const addBooleanChangeListener = (
    eventName: string,
    handler: (value: boolean) => void,
  ): { remove: () => void } => {
    const add = AccessibilityInfo.addEventListener as unknown as (
      e: string,
      h: (value: boolean) => void,
    ) => { remove: () => void }
    return add(eventName, handler)
  }

  useEffect(() => {
    // Bold-text preference (iOS). Falls back gracefully on Android.
    let boldSub: { remove: () => void } | undefined
    const boldIsAvailable =
      typeof AccessibilityInfo.isBoldTextEnabled === 'function'
    if (boldIsAvailable) {
      AccessibilityInfo.isBoldTextEnabled().then(setIsBoldTextEnabled)
      try {
        boldSub = addBooleanChangeListener('boldTextChanged', setIsBoldTextEnabled)
      } catch {}
    }

    // High-contrast / invert preference (Android high-contrast, iOS invert).
    let contrastSub: { remove: () => void } | undefined
    const contrastIsAvailable =
      typeof AccessibilityInfo.isHighTextContrastEnabled === 'function' ||
      typeof AccessibilityInfo.isInvertColorsEnabled === 'function'
    if (contrastIsAvailable) {
      const probe = async () => {
        try {
          if (typeof AccessibilityInfo.isHighTextContrastEnabled === 'function') {
            const hc = await AccessibilityInfo.isHighTextContrastEnabled()
            if (hc) return true
          }
        } catch {}
        try {
          if (typeof AccessibilityInfo.isInvertColorsEnabled === 'function') {
            return await AccessibilityInfo.isInvertColorsEnabled()
          }
        } catch {}
        return false
      }
      probe().then(setHighContrast)
      try {
        contrastSub = addBooleanChangeListener(
          'highTextContrastChanged',
          setHighContrast,
        )
      } catch {}
    }

    return () => {
      boldSub?.remove()
      contrastSub?.remove()
    }
  }, [])

  // 48dp in physical pixels for the current device, so tap targets stay
  // one-handed-friendly even on high-density screens.
  const minTouchTarget = Math.round(48 * PixelRatio.get())

  return (
    <A11yContext.Provider
      value={{
        minTouchTarget,
        reducedMotion,
        fontScaleEnabled: true,
        isBoldTextEnabled,
        highContrast,
        meetsContrast: meetsWCAG_AA,
      }}
    >
      {children}
    </A11yContext.Provider>
  )
}

/**
 * Build a consistent screen-reader label for an element, composing a name
 * with an optional value/state. Use this for the one-handed, voice-driven UI
 * so labels read predictably across screens.
 */
export function a11yLabel(name: string, value?: string | number): string {
  return value == null || value === '' ? name : `${name}, ${value}`
}

/**
 * Build a screen-reader hint describing the result of an action. Kept short
 * so TalkBack/VoiceOver reads it quickly while the rider is moving.
 */
export function a11yHint(hint: string): string {
  return hint
}
