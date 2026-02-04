/**
 * Phone validation utilities for Ivory Coast (Côte d'Ivoire)
 * Supports formats: 0102030405, +225 0102030405, 01 02 03 04 05
 * Valid prefixes: 01, 05, 07, 21, 22, 23, 24, 25, 27
 */

const VALID_IVORIAN_PREFIXES = ['01', '05', '07', '21', '22', '23', '24', '25', '27'];

/**
 * Normalize an Ivorian phone number to 10 digits format
 * @param phone - Raw phone number string
 * @returns Normalized 10-digit phone number or empty string if invalid
 */
export function normalizeIvorianPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove spaces, dashes, parentheses, dots
  let cleaned = phone.replace(/[\s\-()\.]/g, '');

  // Handle +225 prefix
  if (cleaned.startsWith('+225')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('225')) {
    cleaned = cleaned.substring(3);
  }

  // Handle 00225 prefix
  if (cleaned.startsWith('00225')) {
    cleaned = cleaned.substring(5);
  }

  // Remove any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, '');

  // Check if it's exactly 10 digits with a valid prefix
  if (cleaned.length === 10 && VALID_IVORIAN_PREFIXES.some(p => cleaned.startsWith(p))) {
    return cleaned;
  }

  return '';
}

/**
 * Validate if a phone number is a valid Ivorian number
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidIvorianPhone(phone: string): boolean {
  return normalizeIvorianPhone(phone) !== '';
}

/**
 * Format an Ivorian phone number for display
 * @param phone - Normalized 10-digit phone number
 * @returns Formatted phone number (XX XX XX XX XX)
 */
export function formatIvorianPhone(phone: string): string {
  const normalized = normalizeIvorianPhone(phone);
  if (!normalized) return phone;
  
  return normalized.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

/**
 * Get validation error message for an invalid phone number
 * @param phone - Phone number that failed validation
 * @returns Error message in French
 */
export function getPhoneValidationError(phone: string): string {
  if (!phone || phone.trim() === '') {
    return 'Numéro de téléphone requis';
  }

  const cleaned = phone.replace(/[\s\-()\.]/g, '').replace(/^\+?225/, '').replace(/^00225/, '');
  
  if (cleaned.length !== 10) {
    return `Le numéro doit contenir 10 chiffres (${cleaned.length} trouvés)`;
  }

  const prefix = cleaned.substring(0, 2);
  if (!VALID_IVORIAN_PREFIXES.includes(prefix)) {
    return `Préfixe invalide: ${prefix}. Préfixes valides: ${VALID_IVORIAN_PREFIXES.join(', ')}`;
  }

  return 'Numéro de téléphone invalide';
}
