'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Accessible focus management for dialogs/modals.
 *
 * On activation it moves focus into the container (first focusable element, or
 * the container itself), traps Tab/Shift+Tab inside the container, and restores
 * focus to the previously-focused element when deactivated.
 *
 * @param active whether the trap is engaged (e.g. modal `visible`)
 * @returns a ref to attach to the dialog container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    // Remember what had focus so we can restore it on close.
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null || el === document.activeElement,
      )

    // Move initial focus into the dialog.
    const focusables = getFocusable()
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      container.setAttribute('tabindex', '-1')
      container.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the dialog.
      const toRestore = previouslyFocused.current
      if (toRestore && typeof toRestore.focus === 'function') {
        toRestore.focus()
      }
    }
  }, [active])

  return containerRef
}
