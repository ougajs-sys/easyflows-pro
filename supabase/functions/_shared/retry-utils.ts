/**
 * Retry Utilities for Supabase Edge Functions
 * Implements exponential backoff retry logic
 */

interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for next retry with exponential backoff
 */
function calculateDelay(
  attemptNumber: number,
  config: Required<RetryConfig>
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, config: Required<RetryConfig>): boolean {
  // Check if error code matches retryable errors
  const errorCode = (error as any).code;
  if (errorCode && config.retryableErrors.includes(errorCode)) {
    return true;
  }
  
  // Check for common retryable error messages
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('503') ||
    message.includes('504')
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's the last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      // Don't retry if error is not retryable
      if (!isRetryableError(lastError, finalConfig)) {
        throw lastError;
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        lastError.message
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function retryFetch(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(url, options);
    
    // Retry on 5xx errors
    if (response.status >= 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, config);
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure < this.resetTimeoutMs) {
        throw new Error('Circuit breaker is open');
      }
      
      // Try to close the circuit
      this.state = 'half-open';
    }
    
    try {
      const result = await fn();
      
      // Reset on success
      if (this.state === 'half-open') {
        this.state = 'closed';
      }
      this.failureCount = 0;
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        console.error('Circuit breaker opened due to repeated failures');
      }
      
      throw error;
    }
  }
  
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
  
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}
