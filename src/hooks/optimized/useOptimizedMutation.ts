import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * Optimized version of useMutation with performance tracking
 */
export function useOptimizedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  // Memoize mutation options
  const memoizedOptions = useMemo(() => ({
    ...options,
    onMutate: async (variables: TVariables) => {
      const mutationKey = options.mutationKey?.[0] || 'mutation';
      performanceMonitor.mark(`mutation-${mutationKey}`);
      return options.onMutate?.(variables);
    },
    onSuccess: (data: TData, variables: TVariables, context: TContext) => {
      const mutationKey = options.mutationKey?.[0] || 'mutation';
      performanceMonitor.measure(`mutation-${mutationKey}`, 'query');
      return options.onSuccess?.(data, variables, context);
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      const mutationKey = options.mutationKey?.[0] || 'mutation';
      performanceMonitor.measure(`mutation-${mutationKey}`, 'query');
      return options.onError?.(error, variables, context);
    },
  }), [options.mutationFn, JSON.stringify(options.mutationKey)]);

  return useMutation(memoizedOptions);
}
