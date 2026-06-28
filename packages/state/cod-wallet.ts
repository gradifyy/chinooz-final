import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  getCODWalletSync,
  computeCodLimitStatus,
  type CODWalletStatus,
  type CODLimitStatus,
} from '@chinooz/mock-data'

/**
 * RW2/RW6 — shared rider Cash & COD Wallet store (`codWalletStatus`).
 *
 * Single source of truth for the cash-in-hand figure the rider holds from
 * Cash-on-Delivery collections, AND for the COD float limit that gates
 * whether the rider can accept new COD jobs.
 *
 * The hero number on the overview screen reads from here so it can render
 * immediately (optimistic seed) and stay consistent across the overview
 * (RW2), collection ledger (RW3), deposit history (RW5) and the limit meter
 * (RW6). Jobs/Active Delivery read the derived `codLimitStatus` /
 * `canAcceptCodJob` so COD jobs are greyed/blocked at the limit everywhere.
 *
 * Invariant:
 *   cashInHand = codCollectedTotal − codDepositedTotal
 *   pendingToDeposit = cashInHand
 *
 * The store is seeded synchronously from the mock so the hero balance is
 * never blank on first paint; `hydrateFromSnapshot` replaces it once the
 * async `getCODWallet()` fetch resolves.
 */

interface CODWalletStoreState extends CODWalletStatus {
  /** True until the first async `getCODWallet()` hydrates the store. */
  hydrated: boolean
  /** Replace the whole status from a fetched snapshot. */
  hydrateFromSnapshot: (snap: CODWalletStatus) => void
  /**
   * Record a new COD collection (RW3). Increases collected totals and
   * cash-in-hand.
   */
  recordCollection: (amount: number) => void
  /**
   * Record a deposit / settle (RW4). Increases deposited totals and
   * decreases cash-in-hand by the deposited amount.
   */
  recordDeposit: (amount: number) => void
  /** Reset to the mock seed (used on logout / dev reset). */
  resetCODWallet: () => void
}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return createJSONStorage(() => localStorage)
  }
  return createJSONStorage(() => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }))
}

function seed(): CODWalletStatus {
  const snap = getCODWalletSync()
  return {
    currency: snap.currency,
    codCollectedTotal: snap.codCollectedTotal,
    codDepositedTotal: snap.codDepositedTotal,
    cashInHand: snap.cashInHand,
    collectedToday: snap.collectedToday,
    depositedToday: snap.depositedToday,
    pendingToDeposit: snap.pendingToDeposit,
    collectedTodayCount: snap.collectedTodayCount,
    nextDepositBy: snap.nextDepositBy,
    maxCodFloat: snap.maxCodFloat,
  }
}

function recompute(base: CODWalletStatus): CODWalletStatus {
  const cashInHand = base.codCollectedTotal - base.codDepositedTotal
  return {
    ...base,
    cashInHand,
    pendingToDeposit: cashInHand,
  }
}

export const useCODWalletStore = create<CODWalletStoreState>()(
  persist(
    (set, get) => ({
      ...seed(),
      hydrated: false,

      hydrateFromSnapshot: snap =>
        set({
          ...recompute(snap),
          hydrated: true,
        }),

      recordCollection: amount => {
        const next = recompute({
          ...get(),
          codCollectedTotal: get().codCollectedTotal + amount,
          collectedToday: get().collectedToday + amount,
          collectedTodayCount: get().collectedTodayCount + 1,
        })
        set(next)
      },

      recordDeposit: amount => {
        const next = recompute({
          ...get(),
          codDepositedTotal: get().codDepositedTotal + amount,
          depositedToday: get().depositedToday + amount,
        })
        set(next)
      },

      resetCODWallet: () =>
        set({
          ...seed(),
          hydrated: false,
        }),
    }),
    {
      name: 'chinooz-rider-cod-wallet',
      storage: getStorage(),
      partialize: state => ({
        codCollectedTotal: state.codCollectedTotal,
        codDepositedTotal: state.codDepositedTotal,
        cashInHand: state.cashInHand,
        collectedToday: state.collectedToday,
        depositedToday: state.depositedToday,
        pendingToDeposit: state.pendingToDeposit,
        collectedTodayCount: state.collectedTodayCount,
        nextDepositBy: state.nextDepositBy,
        maxCodFloat: state.maxCodFloat,
        hydrated: state.hydrated,
      }),
    },
  ),
)

/**
 * Selector hook: derive the COD limit status from the shared store.
 * Use anywhere that needs to know whether the rider can accept COD jobs
 * (Jobs/AvailableTab, Home wallet entry, the wallet limit meter).
 */
export function useCodLimitStatus(): CODLimitStatus {
  return useCODWalletStore(s => computeCodLimitStatus(s.cashInHand, s.maxCodFloat))
}

/**
 * Selector hook: true when the rider is NOT at the COD float limit and may
 * accept new COD jobs. False (blocked) when cash-in-hand >= maxCodFloat.
 */
export function useCanAcceptCodJob(): boolean {
  return useCODWalletStore(s => s.cashInHand < s.maxCodFloat)
}
