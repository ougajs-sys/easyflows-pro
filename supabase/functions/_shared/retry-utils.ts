/**
 * RETRY UTILITIES
 * 
 * Gestion des retries automatiques pour les opérations réseau
 * Utilise exponential backoff avec jitter
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  exponentialBase: 2,
  jitter: true,
};

/**
 * Calcule le délai avant le prochain retry
 * Utilise exponential backoff avec jitter optionnel
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.exponentialBase, attempt);
  
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  if (config.jitter) {
    // Ajouter un jitter aléatoire pour éviter les thundering herd
    const jitterFactor = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
    return cappedDelay * jitterFactor;
  }
  
  return cappedDelay;
}

/**
 * Détermine si une erreur est retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return true;
    }
  }
  
  // HTTP errors
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: number }).status;
    // Retry sur 5xx et 429 (rate limit)
    return status >= 500 || status === 429;
  }
  
  return false;
}

/**
 * Exécute une fonction avec retry automatique
 * @param fn - Fonction à exécuter
 * @param config - Configuration du retry
 * @returns Le résultat de la fonction
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Ne pas retry si ce n'est pas une erreur retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Ne pas attendre après la dernière tentative
      if (attempt < finalConfig.maxAttempts - 1) {
        const delay = calculateDelay(attempt, finalConfig);
        console.log(
          `⚠️ Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Toutes les tentatives ont échoué
  console.error(
    `❌ All ${finalConfig.maxAttempts} attempts failed`
  );
  throw lastError;
}

/**
 * Wrapper pour les fetch requests avec retry
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig?: Partial<RetryConfig>
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // Lancer une erreur pour les status codes >= 500 ou 429
    if (response.status >= 500 || response.status === 429) {
      throw {
        status: response.status,
        statusText: response.statusText,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return response;
  }, retryConfig);
}

/**
 * Circuit breaker simple pour éviter les cascades de failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  
  constructor(
    private readonly threshold = 5,
    private readonly resetTimeMs = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Vérifier si le circuit breaker doit être reset
    if (
      this.state === "open" &&
      Date.now() - this.lastFailureTime > this.resetTimeMs
    ) {
      console.log("🔄 Circuit breaker: half-open state");
      this.state = "half-open";
    }

    // Rejeter immédiatement si le circuit est ouvert
    if (this.state === "open") {
      throw new Error("Circuit breaker is open - service temporarily unavailable");
    }

    try {
      const result = await fn();
      
      // Succès - reset le circuit breaker
      if (this.state === "half-open") {
        console.log("✅ Circuit breaker: closed state");
        this.state = "closed";
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // Ouvrir le circuit si le seuil est atteint
      if (this.failures >= this.threshold) {
        console.error("🔴 Circuit breaker: open state");
        this.state = "open";
      }
      
      throw error;
    }
  }
}
