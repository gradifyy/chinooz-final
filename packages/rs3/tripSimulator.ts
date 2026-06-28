import type { DeliveryLeg, GeoPoint } from '@chinooz/types'
import { interpolateLeg, legDistanceMeters } from './geometry'

/** Simulated rider speed in meters per second (~32 km/h city riding). */
export const RS3_DRIVER_SPEED_MPS = 9

export interface TripSimState {
  /** The leg currently being traversed. */
  leg: DeliveryLeg
  /** Normalized progress along the leg, 0..1. */
  progress: number
  /** Current geo position of the rider. */
  point: GeoPoint
  /** Remaining distance to the leg end, in meters. */
  remainingMeters: number
  /** Remaining time to the leg end, in seconds. */
  remainingSeconds: number
  /** True once progress reached 1. */
  arrived: boolean
}

/**
 * RS3 trip simulator.
 *
 * Stateful but pure: callers advance it with {@link advance} using the elapsed
 * wall-clock delta (seconds). The simulator converts distance to progress using
 * the leg's actual length and a fixed rider speed, so movement animates at a
 * believable cadence regardless of the polyline resolution.
 */
export const RS3_TRIP_SIMULATOR = {
  /** Build the initial state for a leg, starting at progress 0. */
  start(leg: DeliveryLeg): TripSimState {
    const total = legDistanceMeters(leg) || 1
    const eta = leg.etaSeconds || Math.round(total / RS3_DRIVER_SPEED_MPS)
    const initial = interpolateLeg(leg, 0)
    return {
      leg,
      progress: 0,
      point: initial.point,
      remainingMeters: initial.remainingMeters,
      remainingSeconds: eta,
      arrived: false,
    }
  },

  /** Build a state resumed at a specific progress (e.g. after a state change). */
  resume(leg: DeliveryLeg, progress: number): TripSimState {
    const at = interpolateLeg(leg, progress)
    const remainingSeconds = Math.round(at.remainingMeters / RS3_DRIVER_SPEED_MPS)
    return {
      leg,
      progress: Math.min(Math.max(progress, 0), 1),
      point: at.point,
      remainingMeters: at.remainingMeters,
      remainingSeconds,
      arrived: progress >= 1,
    }
  },

  /**
   * Advance the simulator by `deltaSeconds` of wall-clock time.
   * Returns a new state (immutably). Never overshoots progress 1.
   */
  advance(state: TripSimState, deltaSeconds: number): TripSimState {
    if (state.arrived || deltaSeconds <= 0) return state
    const total = legDistanceMeters(state.leg) || 1
    const eta = state.leg.etaSeconds || Math.round(total / RS3_DRIVER_SPEED_MPS)
    if (eta <= 0) {
      const at = interpolateLeg(state.leg, 1)
      return { ...state, progress: 1, point: at.point, remainingMeters: 0, remainingSeconds: 0, arrived: true }
    }
    const progressDelta = deltaSeconds / eta
    const nextProgress = Math.min(state.progress + progressDelta, 1)
    const at = interpolateLeg(state.leg, nextProgress)
    const remainingSeconds = Math.max(0, Math.round(at.remainingMeters / RS3_DRIVER_SPEED_MPS))
    return {
      ...state,
      progress: nextProgress,
      point: at.point,
      remainingMeters: at.remainingMeters,
      remainingSeconds,
      arrived: nextProgress >= 1,
    }
  },

  /** Distance already covered on the current leg, in meters. */
  coveredMeters(state: TripSimState): number {
    const total = legDistanceMeters(state.leg)
    return Math.round(total * state.progress)
  },
}
