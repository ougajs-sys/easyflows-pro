import { useCallback, DependencyList } from 'react';

/**
 * Memoized callback hook
 * Alternative to useCallback with better ergonomics
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList = []
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps);
}
