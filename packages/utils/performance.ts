import React, { memo, useCallback, useMemo } from 'react'

export function memoComponent<P extends Record<string, any>>(
  component: React.FC<P>,
): React.FC<P> {
  return memo(component) as React.FC<P>
}

export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = React.useRef(fn)
  ref.current = fn
  return useCallback((...args: any[]) => ref.current(...args), []) as unknown as T
}

export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = React.useRef<{ deps: React.DependencyList; value: T }>()

  const depsChanged = !ref.current || deps.some((dep, i) => !Object.is(dep, ref.current!.deps[i]))

  if (depsChanged) {
    ref.current = { deps, value: factory() }
  }

  return ref.current!.value
}

export const ITEM_HEIGHT = 80
export const WINDOW_SIZE = 10
export const INITIAL_NUM_TO_RENDER = 8
export const MAX_TO_RENDER_PER_BATCH = 5
