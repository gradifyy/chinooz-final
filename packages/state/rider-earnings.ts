import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RE1/RE5 — shared rider earnings store.
 *
 * Single source of truth for the rider's withdrawable balance + cash-out
 * intent across the rider-mobile app (Earnings overview, chart, ledger,
 * cash-out flow). The hero balance on the overview reads from here so a
 * cash-out optimistically reduces the displayed balance without waiting
 * for a server round-trip.
 *
 * Income vs cash-in-hand:
 * - `withdrawableBalance` = earnings Chinooz owes the rider (withdrawable).
 * - Cash & COD Wallet cash-in-hand lives in the mock data layer, not here,
 *   because it is physical cash the rider must remit, not spendable income.
 */

interface EarningsState {
  /** Withdrawable income in NPR (integer paisa = 0). */
  withdrawableBalance: number | null
  /** True while a cash-out request is in flight. */
  cashoutInFlight: boolean
  /** Epoch ms of the most recent successful cash-out. */
  lastCashoutAt: number | null
  /** Seed the store once the overview has loaded. */
  setWithdrawableBalance: (amount: number) => void
  /** Mark a cash-out as started (optimistic). */
  beginCashout: () => void
  /** Confirm a cash-out of `amount` and settle the balance. */
  completeCashout: (amount: number) => void
  /** Roll back an in-flight cash-out on failure. */
  cancelCashout: () => void
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

export const useRiderEarningsStore = create<EarningsState>()(
  persist(
    (set, get) => ({
      withdrawableBalance: null,
      cashoutInFlight: false,
      lastCashoutAt: null,

      setWithdrawableBalance: amount => {
        if (get().withdrawableBalance === null) set({ withdrawableBalance: amount })
      },

      beginCashout: () => set({ cashoutInFlight: true }),

      completeCashout: amount =>
        set(state => ({
          cashoutInFlight: false,
          lastCashoutAt: Date.now(),
          withdrawableBalance:
            state.withdrawableBalance !== null
              ? Math.max(0, state.withdrawableBalance - amount)
              : null,
        })),

      cancelCashout: () => set({ cashoutInFlight: false }),
    }),
    {
      name: 'chinooz-rider-earnings',
      storage: getStorage(),
      partialize: state => ({
        withdrawableBalance: state.withdrawableBalance,
        lastCashoutAt: state.lastCashoutAt,
      }),
    },
  ),
)
