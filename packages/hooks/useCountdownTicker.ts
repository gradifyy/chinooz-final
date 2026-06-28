import { useEffect, useState } from 'react'

interface TimeRemaining {
  total: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function getTimeRemaining(target: string): TimeRemaining {
  const total = Math.max(0, new Date(target).getTime() - Date.now())
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  return { total, days, hours, minutes, seconds }
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function countdownStr(r: TimeRemaining): string {
  if (r.days > 0) return `${r.days}d ${pad(r.hours)}h ${pad(r.minutes)}m`
  return `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
}

type TickMap = Map<string, TimeRemaining>
type TickListener = (map: TickMap) => void

let tickListeners: Set<TickListener> = new Set()
let tickInterval: ReturnType<typeof setInterval> | null = null
let tickTargets: Map<string, string> = new Map()

function ensureTicker() {
  if (tickInterval) return
  tickInterval = setInterval(() => {
    const map: TickMap = new Map()
    let allDone = true
    for (const [id, target] of tickTargets) {
      const r = getTimeRemaining(target)
      map.set(id, r)
      if (r.total > 0) allDone = false
    }
    for (const listener of tickListeners) {
      listener(map)
    }
    if (allDone && tickListeners.size === 0) {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
      tickTargets.clear()
    }
  }, 1000)
}

function stopTicker() {
  if (tickInterval && tickListeners.size === 0 && tickTargets.size === 0) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}

export function useCountdownTicker(targets: { id: string; endsAt: string }[]): Record<string, TimeRemaining> {
  const [state, setState] = useState<Record<string, TimeRemaining>>({})

  useEffect(() => {
    for (const t of targets) {
      tickTargets.set(t.id, t.endsAt)
    }
    const ids = new Set(targets.map(t => t.id))
    for (const key of tickTargets.keys()) {
      if (!ids.has(key)) tickTargets.delete(key)
    }

    const listener: TickListener = (map) => {
      const next: Record<string, TimeRemaining> = {}
      for (const t of targets) {
        next[t.id] = map.get(t.id) ?? getTimeRemaining(t.endsAt)
      }
      setState(next)
    }

    tickListeners.add(listener)
    ensureTicker()

    const initial: Record<string, TimeRemaining> = {}
    for (const t of targets) {
      initial[t.id] = getTimeRemaining(t.endsAt)
    }
    setState(initial)

    return () => {
      tickListeners.delete(listener)
      stopTicker()
    }
  }, [JSON.stringify(targets.map(t => `${t.id}:${t.endsAt}`))])

  return state
}
