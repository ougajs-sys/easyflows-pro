/**
 * Rate Limiting Utility for Supabase Edge Functions
 * Implements token bucket algorithm for rate limiting
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (per edge function instance)
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Check if a request should be rate limited
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    keyPrefix: 'ratelimit',
  }
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  
  let store = rateLimitStore.get(key);
  
  // Initialize or reset if window expired
  if (!store || now > store.resetTime) {
    store = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, store);
  }
  
  // Check if limit exceeded
  if (store.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: store.resetTime,
    };
  }
  
  // Increment counter
  store.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - store.count,
    resetTime: store.resetTime,
  };
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try to get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  return forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, store] of rateLimitStore.entries()) {
    if (now > store.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(
  remaining: number,
  resetTime: number,
  maxRequests: number
): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', maxRequests.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
  return headers;
}

/**
 * Middleware function for rate limiting
 */
export async function rateLimitMiddleware(
  req: Request,
  config?: RateLimitConfig
): Promise<Response | null> {
  const identifier = getRateLimitIdentifier(req);
  const result = await checkRateLimit(identifier, config);
  
  if (!result.allowed) {
    const headers = getRateLimitHeaders(
      result.remaining,
      result.resetTime,
      config?.maxRequests || 100
    );
    
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetTime: new Date(result.resetTime).toISOString(),
      }),
      {
        status: 429,
        headers: {
          ...Object.fromEntries(headers),
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  return null; // Allow request to proceed
}
