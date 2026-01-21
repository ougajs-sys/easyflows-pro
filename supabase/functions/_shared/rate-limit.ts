/**
 * RATE LIMITING MIDDLEWARE
 * 
 * Protection contre les attaques DDOS et abus
 * Utilise un système de "token bucket" en mémoire
 * 
 * Pour une production à grande échelle, considérer:
 * - Redis pour le partage d'état entre instances
 * - Cloudflare Rate Limiting
 * - AWS WAF
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// In-memory store (pour développement)
// En production, utiliser Redis ou Supabase
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number; // Nombre maximum de requêtes
  windowMs: number; // Fenêtre de temps en millisecondes
  message?: string; // Message d'erreur personnalisé
}

/**
 * Vérifie si la requête dépasse la limite de taux
 * @param identifier - Identifiant unique (IP, user_id, etc.)
 * @param config - Configuration du rate limiting
 * @returns true si la limite est dépassée
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    // Première requête de cet identifiant
    rateLimitStore.set(identifier, {
      tokens: config.maxRequests - 1,
      lastRefill: now,
    });
    return false;
  }

  // Calculer le nombre de tokens à ajouter depuis la dernière requête
  const timePassed = now - entry.lastRefill;
  const tokensToAdd = (timePassed / config.windowMs) * config.maxRequests;
  
  // Refill tokens
  entry.tokens = Math.min(
    config.maxRequests,
    entry.tokens + tokensToAdd
  );
  entry.lastRefill = now;

  // Vérifier si on a des tokens disponibles
  if (entry.tokens < 1) {
    return true; // Rate limited
  }

  // Consommer un token
  entry.tokens -= 1;
  rateLimitStore.set(identifier, entry);

  return false;
}

/**
 * Extraire l'IP de la requête
 * Supporte les headers de proxy (Cloudflare, AWS, etc.)
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // Try various headers in order of preference
  const ip =
    headers.get("cf-connecting-ip") || // Cloudflare
    headers.get("x-real-ip") || // Nginx
    headers.get("x-forwarded-for")?.split(",")[0] || // Standard proxy
    headers.get("x-client-ip") ||
    "unknown";

  return ip.trim();
}

/**
 * Middleware de rate limiting pour les Edge Functions
 */
export function rateLimitMiddleware(
  request: Request,
  config: RateLimitConfig = {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
    message: "Trop de requêtes, veuillez réessayer plus tard",
  }
): Response | null {
  const identifier = getClientIP(request);
  
  if (isRateLimited(identifier, config)) {
    console.warn(`⚠️ Rate limit exceeded for ${identifier}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: config.message,
        retry_after: Math.ceil(config.windowMs / 1000), // seconds
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(config.windowMs / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Not rate limited, continue
  return null;
}

/**
 * Nettoyer les anciennes entrées du store (garbage collection)
 * À appeler périodiquement pour éviter les fuites mémoire
 */
export function cleanupRateLimitStore(maxAgeMs = 3600000): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastRefill > maxAgeMs) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup automatique toutes les 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    cleanupRateLimitStore();
  }, 600000); // 10 minutes
}
