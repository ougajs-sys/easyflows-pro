/**
 * Custom fetch wrapper for Supabase that applies exponential backoff + jitter
 * and a hard attempt cap to /auth/v1/token requests.
 *
 * Why: during Supabase degradation or network flakiness, the browser can
 * otherwise enter a tight retry loop on token refresh, hammering the server
 * and making the outage worse for everyone. Auth endpoints other than /token
 * are left alone, and permanent errors (4xx except 408/425/429) are NOT
 * retried — only transient failures (network errors, 408/425/429, 5xx).
 */

const TOKEN_PATH = '/auth/v1/token';

const MAX_ATTEMPTS = 4;       // initial try + 3 retries
const BASE_DELAY_MS = 400;    // first retry ~400ms
const MAX_DELAY_MS = 8_000;   // cap a single wait at 8s
const COOLDOWN_MS = 30_000;   // after exhaustion, reject fast for this long

// Shared cooldown state so repeated failures don't each burn MAX_ATTEMPTS.
let cooldownUntil = 0;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isTokenRequest(input: RequestInfo | URL): boolean {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    return url.includes(TOKEN_PATH);
  } catch {
    return false;
  }
}

function computeDelay(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  // Full jitter: random value in [0, exp]
  return Math.floor(Math.random() * exp);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authFetch: typeof fetch = async (input, init) => {
  // Non-token requests bypass the retry logic entirely.
  if (!isTokenRequest(input)) {
    return fetch(input, init);
  }

  // If we recently exhausted our budget, fail fast to avoid retry storms.
  const now = Date.now();
  if (cooldownUntil > now) {
    throw new Error(
      `auth/token temporairement indisponible, réessayez dans ${Math.ceil(
        (cooldownUntil - now) / 1000,
      )}s`,
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(input, init);

      // Retry on transient server-side errors only.
      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS - 1) {
        // Honor Retry-After header if present (seconds or HTTP-date).
        const retryAfter = response.headers.get('Retry-After');
        let wait = computeDelay(attempt);
        if (retryAfter) {
          const asSeconds = Number(retryAfter);
          if (Number.isFinite(asSeconds)) {
            wait = Math.min(MAX_DELAY_MS, asSeconds * 1000);
          }
        }
        await sleep(wait);
        continue;
      }

      return response;
    } catch (err) {
      // Network-level error (offline, DNS, TLS, CORS reset, ...).
      lastError = err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(computeDelay(attempt));
        continue;
      }
    }
  }

  // Budget exhausted — start cooldown so we don't keep retrying.
  cooldownUntil = Date.now() + COOLDOWN_MS;
  throw lastError instanceof Error
    ? lastError
    : new Error('auth/token: échec après plusieurs tentatives');
};
