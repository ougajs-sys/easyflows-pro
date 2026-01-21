/**
 * Crypto utilities for webhook signature verification
 * Provides HMAC-SHA256 signature validation for secure webhook handling
 */

/**
 * Calculate HMAC-SHA256 signature for a given body and secret
 * @param body - The request body as a string
 * @param secret - The secret key for HMAC
 * @returns Promise<string> - The hex-encoded HMAC signature
 */
export async function calculateHmac(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  // Import the secret key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the message
  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify webhook signature using HMAC-SHA256
 * @param body - The request body as a string
 * @param signature - The signature to verify (hex-encoded)
 * @param secret - The secret key for HMAC
 * @returns Promise<boolean> - True if signature is valid, false otherwise
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    console.warn("⚠️ Missing signature or secret for verification");
    return false;
  }

  try {
    const expectedSignature = await calculateHmac(body, secret);
    
    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(expectedSignature, signature);
  } catch (error) {
    console.error("❌ Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns boolean - True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate a secure random webhook secret
 * @param length - Length of the secret (default: 32 bytes)
 * @returns string - Hex-encoded random secret
 */
export function generateWebhookSecret(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Extract signature from request headers
 * Supports multiple header formats:
 * - X-Webhook-Signature
 * - X-Hub-Signature-256 (GitHub format: sha256=...)
 * @param headers - Request headers
 * @returns string | null - The extracted signature or null
 */
export function extractSignatureFromHeaders(headers: Headers): string | null {
  // Check standard webhook signature header
  const webhookSig = headers.get("x-webhook-signature");
  if (webhookSig) {
    return webhookSig;
  }

  // Check GitHub-style signature header
  const hubSig = headers.get("x-hub-signature-256");
  if (hubSig) {
    // GitHub format: "sha256=<signature>"
    const match = hubSig.match(/^sha256=(.+)$/);
    return match ? match[1] : null;
  }

  return null;
}
