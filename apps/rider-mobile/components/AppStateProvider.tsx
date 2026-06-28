import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager } from '@tanstack/react-query'

/**
 * AppStateProvider — battery/data-conscious baseline for the rider app.
 *
 * Riders run the app all day on a single charge, often on metered data, so
 * background work must pause aggressively:
 *  - TanStack Query refetches/polls are paused when the app is backgrounded
 *    (focusManager.setFocused) and when the network drops
 *    (onlineManager.setOnline).
 *  - Screens can read `useAppState().isForeground` to stop location polling,
 *    animation loops, and timers while backgrounded.
 *  - A `useAppActiveCallback` hook lets screens run effects only while the
 *    app is active (e.g. online-time tick, request polling) and auto-pause
 *    otherwise — no per-screen AppState wiring needed.
 */

type Connectivity = 'online' | 'offline'

interface AppStateContextValue {
  isForeground: boolean
  connectivity: Connectivity
}

const AppStateContext = createContext<AppStateContextValue>({
  isForeground: true,
  connectivity: 'online',
})

export function useAppState() {
  return useContext(AppStateContext)
}

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active')
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isForeground, setIsForeground] = useState(true)
  const [connectivity, setConnectivity] = useState<Connectivity>('online')
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      appStateRef.current = status
      setIsForeground(status === 'active')
      onAppStateChange(status)
    })
    onAppStateChange(AppState.currentState)
    return () => sub.remove()
  }, [])

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const next: Connectivity = state.isConnected ? 'online' : 'offline'
      setConnectivity(next)
      onlineManager.setOnline(next === 'online')
    })
    return () => unsub()
  }, [])

  return (
    <AppStateContext.Provider value={{ isForeground, connectivity }}>
      {children}
    </AppStateContext.Provider>
  )
}

/**
 * Run `effect()` only while the app is in the foreground, and call
 * `onPause()` when it leaves the foreground. This is the hook screens use to
 * pause location polling, animation loops, and timers — the battery/data
 * conscious baseline. Dependencies are passed through to the inner effect.
 */
export function useAppActiveCallback(
  effect: () => void | (() => void),
  onPause: () => void,
  deps: React.DependencyList,
) {
  const { isForeground } = useAppState()
  const cleanupRef = useRef<(() => void) | void>(undefined)

  useEffect(() => {
    if (!isForeground) {
      onPause()
      if (typeof cleanupRef.current === 'function') cleanupRef.current()
      cleanupRef.current = undefined
      return
    }
    cleanupRef.current = effect()
    return () => {
      if (typeof cleanupRef.current === 'function') cleanupRef.current()
      cleanupRef.current = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForeground, ...deps])
}
