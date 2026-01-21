/**
 * Performance Configuration
 * Centralized settings for application performance optimization
 */

export const PerformanceConfig = {
  // React Query Cache Settings
  cache: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },

  // Lazy Loading Settings
  lazyLoading: {
    enabled: true,
    suspenseTimeout: 1000, // 1 second
    retryAttempts: 3,
  },

  // Code Splitting Thresholds
  codeSplitting: {
    chunkSizeWarning: 1000 * 1024, // 1MB
    minChunkSize: 20 * 1024, // 20KB
    maxChunks: 20,
  },

  // Image Optimization
  images: {
    lazyLoad: true,
    inlineThreshold: 4096, // 4KB
    formats: ['webp', 'avif', 'jpeg'],
  },

  // Performance Monitoring
  monitoring: {
    enabled: true,
    sampleRate: 1.0, // 100% of users
    reportThreshold: 100, // Report operations > 100ms
    trackNavigations: true,
    trackRenders: true,
  },

  // Debounce/Throttle Settings
  inputHandling: {
    searchDebounce: 300, // 300ms
    resizeThrottle: 150, // 150ms
    scrollThrottle: 100, // 100ms
  },

  // Virtual Scrolling Settings
  virtualScrolling: {
    itemHeight: 60, // pixels
    overscan: 5, // items to render outside viewport
    threshold: 50, // Enable virtual scrolling for lists > 50 items
  },

  // Memoization Settings
  memoization: {
    enabled: true,
    complexityThreshold: 10, // Number of props to trigger memo
  },
} as const;

export type PerformanceConfigType = typeof PerformanceConfig;
