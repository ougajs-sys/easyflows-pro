/**
 * WEBHOOK SIGNATURE VERIFICATION
 * 
 * Utilise HMAC-SHA256 pour vérifier l'authenticité des webhooks
 * Protège contre les attaques de type:
 * - Requêtes non autorisées
 * - Injection de commandes malveillantes
 * - Replay attacks (avec timestamp)
 */

/**
 * Génère une signature HMAC-SHA256
 * @param payload - Le corps de la requête (string ou object)
 * @param secret - Le secret partagé
 * @returns La signature en hexadécimal
 */
export async function generateSignature(
  payload: string | Record<string, unknown>,
  secret: string
): Promise<string> {
  const message = typeof payload === "string" ? payload : JSON.stringify(payload);
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import the secret as a cryptographic key
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
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Vérifie la signature d'un webhook
 * @param payload - Le corps de la requête
 * @param receivedSignature - La signature reçue dans les headers
 * @param secret - Le secret partagé
 * @returns true si la signature est valide
 */
export async function verifySignature(
  payload: string | Record<string, unknown>,
  receivedSignature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = await generateSignature(payload, secret);
    
    // Utilise une comparaison timing-safe pour éviter les timing attacks
    return timingSafeEqual(expectedSignature, receivedSignature);
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

/**
 * Comparaison timing-safe de deux strings
 * Protège contre les timing attacks
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
 * Vérifie si le timestamp du webhook est récent (< 5 minutes)
 * Protège contre les replay attacks
 */
export function verifyTimestamp(timestamp: string | number, maxAgeMinutes = 5): boolean {
  try {
    const webhookTime = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds

    return now - webhookTime < maxAge && webhookTime <= now;
  } catch (error) {
    console.error("Error verifying timestamp:", error);
    return false;
  }
}

/**
 * Extrait et vérifie la signature depuis les headers
 * Supporte plusieurs formats de header:
 * - X-Webhook-Signature
 * - X-Hub-Signature-256
 * - Signature
 */
export function extractSignature(headers: Headers): string | null {
  // Try different header names
  const signature =
    headers.get("x-webhook-signature") ||
    headers.get("x-hub-signature-256") ||
    headers.get("signature");

  if (!signature) {
    return null;
  }

  // Handle "sha256=..." format
  if (signature.startsWith("sha256=")) {
    return signature.substring(7);
  }

  return signature;
}
