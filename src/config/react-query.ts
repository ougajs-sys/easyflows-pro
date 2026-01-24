import { QueryClient } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The time (in milliseconds) after data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes
      // The time (in milliseconds) after unused/inactive data is garbage collected
      gcTime: 1000 * 60 * 60, // 1 hour
      // Avoid refetching on navigation to keep transitions fast
      refetchOnMount: false,
      // Keep data fresh on tab focus or network recovery
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Enable query retry on failure
      retry: 3,
      // Options to handle retries if query fails
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    },
  },
});

export default queryClient;
