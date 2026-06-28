import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import * as api from '@chinooz/mock-data'
import type {
  FinanceRange,
  FinanceRangeKey,
  FinanceSummary,
  Transaction,
  TransactionFilters,
  TransactionDetail,
  FinancePayout,
  FinancePayoutDetail,
  PayoutMethodEntry,
  PayoutMethodInput,
  WithdrawMethod,
  WithdrawResult,
} from '@chinooz/mock-data'

const STALE = {
  summary: 1000 * 60,
  transactions: 1000 * 120,
  payouts: 1000 * 120,
  payoutDetail: 1000 * 120,
  methods: 1000 * 120,
  withdrawMethods: 1000 * 60,
} as const

// --- Finance Summary ---

export function useFinanceSummary(range: FinanceRange) {
  return useQuery<FinanceSummary>({
    queryKey: ['finance-summary', range.key, range.days],
    queryFn: () => api.getFinanceSummary(range),
    staleTime: STALE.summary,
  })
}

// --- Transactions ---

export function useFinanceTransactions(filters: TransactionFilters) {
  return useQuery<{ items: Transaction[]; total: number }>({
    queryKey: ['finance-transactions', filters],
    queryFn: () => api.getTransactions(filters),
    staleTime: STALE.transactions,
  })
}

export function useFinanceTransactionDetail(id: string | null) {
  return useQuery<TransactionDetail | null>({
    queryKey: ['finance-transaction-detail', id],
    queryFn: () => (id ? api.getTransactionById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: STALE.transactions,
  })
}

// --- Payouts ---

export function useFinancePayouts() {
  return useQuery<FinancePayout[]>({
    queryKey: ['finance-payouts'],
    queryFn: () => api.getFinancePayouts(),
    staleTime: STALE.payouts,
  })
}

export function useFinancePayoutDetail(id: string | null) {
  return useQuery<FinancePayoutDetail | null>({
    queryKey: ['finance-payout-detail', id],
    queryFn: () => (id ? api.getFinancePayoutById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: STALE.payoutDetail,
  })
}

// --- Payout Methods ---

export function usePayoutMethods() {
  return useQuery<PayoutMethodEntry[]>({
    queryKey: ['finance-payout-methods'],
    queryFn: () => api.getPayoutMethodEntries(),
    staleTime: STALE.methods,
  })
}

export function useAddPayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PayoutMethodInput) => api.addPayoutMethod(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['finance-payout-methods'] })
      const prev = qc.getQueryData<PayoutMethodEntry[]>(['finance-payout-methods'])
      if (prev) {
        const tempEntry: PayoutMethodEntry = {
          id: `temp-${Date.now()}`,
          type: input.type,
          label: input.type === 'bank' ? 'Bank transfer' : input.type === 'khalti' ? 'Khalti' : 'eSewa',
          accountMasked: '•••• ••••',
          accountName: input.accountName,
          bankName: input.bankName,
          branch: input.branch,
          walletNumber: input.walletNumber,
          isDefault: input.isDefault ?? false,
        }
        qc.setQueryData<PayoutMethodEntry[]>(['finance-payout-methods'], [tempEntry, ...prev])
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['finance-payout-methods'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['finance-payout-methods'] })
      qc.invalidateQueries({ queryKey: ['finance-withdraw-methods'] })
    },
  })
}

export function useUpdatePayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PayoutMethodInput> }) =>
      api.updatePayoutMethod(id, input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['finance-payout-methods'] })
      qc.invalidateQueries({ queryKey: ['finance-withdraw-methods'] })
    },
  })
}

export function useDeletePayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePayoutMethod(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['finance-payout-methods'] })
      const prev = qc.getQueryData<PayoutMethodEntry[]>(['finance-payout-methods'])
      if (prev) {
        qc.setQueryData<PayoutMethodEntry[]>(
          ['finance-payout-methods'],
          prev.filter(m => m.id !== id),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['finance-payout-methods'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['finance-payout-methods'] })
      qc.invalidateQueries({ queryKey: ['finance-withdraw-methods'] })
    },
  })
}

export function useSetDefaultPayoutMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.setDefaultPayoutMethod(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['finance-payout-methods'] })
      const prev = qc.getQueryData<PayoutMethodEntry[]>(['finance-payout-methods'])
      if (prev) {
        qc.setQueryData<PayoutMethodEntry[]>(
          ['finance-payout-methods'],
          prev.map(m => ({ ...m, isDefault: m.id === id })),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['finance-payout-methods'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['finance-payout-methods'] })
      qc.invalidateQueries({ queryKey: ['finance-withdraw-methods'] })
    },
  })
}

// --- Withdraw ---

export function useWithdrawMethods() {
  return useQuery<WithdrawMethod[]>({
    queryKey: ['finance-withdraw-methods'],
    queryFn: () => api.getWithdrawMethods(),
    staleTime: STALE.withdrawMethods,
  })
}

export function useRequestWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { amount: number; methodId: string }) =>
      api.requestWithdraw(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['finance-summary'] })
      const prevSummary = qc.getQueryData<FinanceSummary>(['finance-summary', '30d', 30])
      if (prevSummary) {
        qc.setQueryData<FinanceSummary>(['finance-summary', '30d', 30], {
          ...prevSummary,
          availableBalance: prevSummary.availableBalance - input.amount,
          pendingBalance: prevSummary.pendingBalance + input.amount,
        })
      }
      return { prevSummary }
    },
    onError: (_e, input, ctx) => {
      api.rollbackWithdraw(input.amount)
      if (ctx?.prevSummary) {
        qc.setQueryData(['finance-summary', '30d', 30], ctx.prevSummary)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
      qc.invalidateQueries({ queryKey: ['finance-payouts'] })
      qc.invalidateQueries({ queryKey: ['finance-transactions'] })
    },
  })
}
