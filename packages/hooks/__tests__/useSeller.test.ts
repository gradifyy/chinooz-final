import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { ReactNode } from 'react'

// Mock the mock-data api surface used by useSeller. useSeller does
// `import * as api from '@chinooz/mock-data'` then calls `api.getSellerInventoryApi`,
// and `import { orderService } from '@chinooz/mock-data'` — so the mock must
// expose both as top-level exports (matching the real package's re-exports).
const mockGetSellerInventoryApi = vi.fn()
const mockUpdateStatus = vi.fn()

vi.mock('@chinooz/mock-data', () => ({
  getSellerInventoryApi: (...args: unknown[]) => mockGetSellerInventoryApi(...args),
  api: {
    getSellerInventoryApi: (...args: unknown[]) => mockGetSellerInventoryApi(...args),
  },
  orderService: {
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
  },
}))

// useSeller imports analytics — stub it so it does not call real telemetry.
vi.mock('@chinooz/analytics', () => ({
  analytics: { track: vi.fn() },
}))

const { useSellerInventoryApi, useUpdateOrderStatus } = await import('../useSeller')

/** Wraps a hook in a fresh QueryClientProvider for each test. */
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
  return { queryClient, Wrapper }
}

const INVENTORY_FIXTURE = {
  products: [
    {
      id: 'p1',
      name: 'Product 1',
      variants: [{ id: 'v1', stockCount: 10, stock: 'in_stock' as const, sku: 'S1' }],
      aggregateStock: 10,
      stock: 'in_stock' as const,
    },
  ],
  counts: { in_stock: 1, low_stock: 0, out_of_stock: 0, all: 1 },
}

describe('useSellerInventoryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSellerInventoryApi.mockResolvedValue(INVENTORY_FIXTURE)
  })

  it('fetches the seller inventory via the mocked api', async () => {
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useSellerInventoryApi(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual(INVENTORY_FIXTURE)
    expect(mockGetSellerInventoryApi).toHaveBeenCalledTimes(1)
  })

  it('exposes a loading state before the query resolves', () => {
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useSellerInventoryApi(), { wrapper: Wrapper })
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useUpdateOrderStatus (optimistic update + rollback)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateStatus.mockResolvedValue({ subOrderId: 'so1', statusKey: 'shipped', success: true })
  })

  it('optimistically updates a matching cached order, then settles', async () => {
    const { queryClient, Wrapper } = makeWrapper()
    // Seed the cache with a single order in 'new' status.
    queryClient.setQueryData(
      ['seller-orders'],
      [{ subOrderId: 'so1', statusKey: 'new', orderId: 'o1', buyerName: 'Ram', total: 1000 }],
    )

    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ subOrderId: 'so1', newStatusKey: 'shipped' })
    })

    // After settling, the order reflects the new status in the cache.
    await waitFor(() => {
      const orders = queryClient.getQueryData<{ subOrderId: string; statusKey: string }[]>([
        'seller-orders',
      ])
      expect(orders?.[0].statusKey).toBe('shipped')
    })
    expect(mockUpdateStatus).toHaveBeenCalledWith('so1', 'shipped')
  })

  it('rolls back the cache when the mutation rejects', async () => {
    const { queryClient, Wrapper } = makeWrapper()
    queryClient.setQueryData(
      ['seller-orders'],
      [{ subOrderId: 'so1', statusKey: 'new', orderId: 'o1', buyerName: 'Ram', total: 1000 }],
    )
    mockUpdateStatus.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper: Wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ subOrderId: 'so1', newStatusKey: 'shipped' })
      } catch {
        // expected rejection — the cache should roll back below
      }
    })

    await waitFor(() => {
      const orders = queryClient.getQueryData<{ subOrderId: string; statusKey: string }[]>([
        'seller-orders',
      ])
      expect(orders?.[0].statusKey).toBe('new')
    })
  })
})
