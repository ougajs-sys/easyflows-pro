/**
 * Cryptographic Utilities for Webhook Security
 * HMAC-SHA256 signature generation and verification
 */

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export async function generateSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Generate signature
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC-SHA256 signature for webhook payload
 */
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = await generateSignature(payload, secret);
    
    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
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
 * Extract signature from request headers
 */
export function extractSignature(req: Request): string | null {
  // Check multiple common header names
  return (
    req.headers.get('x-signature') ||
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-hub-signature-256')?.replace('sha256=', '') ||
    null
  );
}

/**
 * Verify webhook request signature
 */
export async function verifyWebhookRequest(
  req: Request,
  secret: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Extract signature from headers
  const signature = extractSignature(req);
  
  if (!signature) {
    return {
      valid: false,
      error: 'Missing signature header',
    };
  }
  
  // Get raw body
  const body = await req.text();
  
  if (!body) {
    return {
      valid: false,
      error: 'Empty request body',
    };
  }
  
  // Verify signature
  const valid = await verifySignature(body, signature, secret);
  
  if (!valid) {
    return {
      valid: false,
      error: 'Invalid signature',
    };
  }
  
  return { valid: true };
}

/**
 * Generate timestamp-based nonce for replay attack prevention
 */
export function generateNonce(): string {
  const timestamp = Date.now();
  const random = crypto.getRandomValues(new Uint8Array(16));
  const randomHex = Array.from(random)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${timestamp}-${randomHex}`;
}

/**
 * Verify timestamp to prevent replay attacks
 */
export function verifyTimestamp(
  timestamp: number,
  maxAgeMs: number = 300000 // 5 minutes
): boolean {
  const now = Date.now();
  const age = now - timestamp;
  
  // Reject if timestamp is in the future or too old
  return age >= 0 && age <= maxAgeMs;
}

/**
 * Hash data using SHA-256
 */
export async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
