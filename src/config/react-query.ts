import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized settings for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The time (in milliseconds) after data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes - keep data fresh
      // The time (in milliseconds) after unused/inactive data is garbage collected
      gcTime: 1000 * 60 * 60, // 1 hour (previously cacheTime in v4)
      // Enable query retry on failure
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Options to handle retries if query fails
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: false, // Disable to reduce unnecessary requests
      // Refetch on mount if data is stale
      refetchOnMount: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations on network errors
      retry: 1,
      retryDelay: 1000,
    },
  },
});

export default queryClient;