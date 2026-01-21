/**
 * Rate limiting utilities to prevent DDOS and abuse
 * Uses in-memory storage for Deno edge functions
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Rate limiter class using sliding window algorithm
 */
class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private config: RateLimiterConfig;
  private cleanupInterval: number | null = null;

  constructor(windowMs: number, maxRequests: number) {
    this.store = new Map();
    this.config = { windowMs, maxRequests };
    
    // Cleanup old entries every minute
    this.startCleanup();
  }

  private startCleanup() {
    // Cleanup old entries periodically to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Check if request is allowed based on rate limit
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @returns Object with allowed status and retry info
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No existing entry or expired window
    if (!entry || entry.resetAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.config.windowMs,
      };
      this.store.set(identifier, newEntry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: newEntry.resetAt,
      };
    }

    // Existing entry within window
    if (entry.count < this.config.maxRequests) {
      entry.count++;
      this.store.set(identifier, entry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000), // Seconds until reset
    };
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clear all rate limit entries
   */
  clearAll(): void {
    this.store.clear();
  }

  /**
   * Get current stats for an identifier
   * @param identifier - Unique identifier
   * @returns Current count and reset time or null
   */
  getStats(identifier: string): { count: number; resetAt: number } | null {
    const entry = this.store.get(identifier);
    if (!entry || entry.resetAt < Date.now()) {
      return null;
    }
    return { count: entry.count, resetAt: entry.resetAt };
  }

  /**
   * Stop cleanup interval (for testing/cleanup)
   */
  stopCleanup(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get the configuration
   * @returns Configuration object
   */
  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }
}

/**
 * Create a new rate limiter instance
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests allowed in the window
 * @returns RateLimiter instance
 */
export function createRateLimiter(windowMs: number, maxRequests: number): RateLimiter {
  return new RateLimiter(windowMs, maxRequests);
}

/**
 * Rate limiter for webhook endpoints
 * Allows 1000 requests per minute (aggressive protection)
 */
export const webhookRateLimiter = createRateLimiter(60000, 1000);

/**
 * Rate limiter for API endpoints
 * Allows 500 requests per minute
 */
export const apiRateLimiter = createRateLimiter(60000, 500);

/**
 * Rate limiter for authentication endpoints
 * Allows 20 requests per minute (stricter for security)
 */
export const authRateLimiter = createRateLimiter(60000, 20);

/**
 * Extract identifier from request for rate limiting
 * Uses IP address, or falls back to a default
 * @param req - Request object
 * @returns Identifier string
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try to get real IP from headers (Cloudflare, Netlify, etc.)
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const xRealIp = req.headers.get("x-real-ip");

  // Use first IP from X-Forwarded-For if available
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }

  return cfConnectingIp || xRealIp || "unknown";
}

/**
 * Middleware function to apply rate limiting to a request
 * @param req - Request object
 * @param limiter - RateLimiter instance to use
 * @returns Response if rate limited, null if allowed
 */
export function applyRateLimit(
  req: Request,
  limiter: RateLimiter
): Response | null {
  const identifier = getRateLimitIdentifier(req);
  const result = limiter.check(identifier);

  if (!result.allowed) {
    console.warn(`⚠️ Rate limit exceeded for ${identifier}`);
    
    const config = limiter.getConfig();
    
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }

  // Add rate limit headers to response (caller should include these)
  return null;
}

/**
 * Get rate limit headers for a successful request
 * @param limiter - RateLimiter instance
 * @param identifier - Request identifier
 * @returns Headers object
 */
export function getRateLimitHeaders(
  limiter: RateLimiter,
  identifier: string
): Record<string, string> {
  const stats = limiter.getStats(identifier);
  const config = limiter.getConfig();
  
  if (!stats) {
    return {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(config.maxRequests),
    };
  }

  return {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(config.maxRequests - stats.count),
    "X-RateLimit-Reset": String(stats.resetAt),
  };
}
