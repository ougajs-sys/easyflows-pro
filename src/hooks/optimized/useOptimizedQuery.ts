import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * Optimized version of useQuery with performance tracking
 */
export function useOptimizedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  // Use a ref to track the query key without serialization
  const queryKeyRef = useRef<string>();
  const currentKeyStr = options.queryKey?.toString() || '';
  
  // Only update if the key actually changed
  if (queryKeyRef.current !== currentKeyStr) {
    queryKeyRef.current = currentKeyStr;
  }
  
  // Memoize query options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => options, [
    queryKeyRef.current,
    options.queryFn,
    options.enabled,
  ]);

  // Track query performance
  const queryKey = String(options.queryKey);
  performanceMonitor.mark(`query-${queryKey}`);

  const result = useQuery(memoizedOptions);

  // Measure query performance when data is fetched
  if (result.dataUpdatedAt) {
    performanceMonitor.measure(`query-${queryKey}`, 'query');
  }

  return result;
}
