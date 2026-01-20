import { QueryClient } from 'react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The time (in milliseconds) after data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes
      // The time (in milliseconds) after unused/inactive data is garbaged collected
      cacheTime: 1000 * 60 * 60, // 1 hour
      // Enable query retry on failure
      retry: 3,
      // Options to handle retries if query fails
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
      // Use the default behavior when it comes to caching
      cache: true,
    },
  },
});

export default queryClient;