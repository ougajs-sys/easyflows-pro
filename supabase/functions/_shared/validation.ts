/**
 * Validation utilities using Zod schemas
 * Provides type-safe validation for orders, clients, and other entities
 */

// Note: In Deno environment, import from esm.sh
// For local development with npm/bun, import from 'zod'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Schema for creating a new order
 */
export const CreateOrderSchema = z.object({
  client_id: z.string().uuid("Invalid client ID format"),
  product_id: z.string().uuid("Invalid product ID format").nullable().optional(),
  quantity: z.number().int().positive("Quantity must be positive").default(1),
  unit_price: z.number().nonnegative("Unit price must be non-negative").default(0),
  total_amount: z.number().nonnegative("Total amount must be non-negative"),
  delivery_address: z.string().nullable().optional(),
  delivery_notes: z.string().nullable().optional(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).default("pending"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * Schema for creating a new client
 */
export const CreateClientSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200),
  phone: z.string().regex(/^[+]?[\d\s()-]+$/, "Invalid phone number format"),
  email: z.string().email("Invalid email format").nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

/**
 * Schema for webhook payload validation
 */
export const WebhookPayloadSchema = z.object({
  // Client information
  client_name: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  
  // Product information
  product_name: z.string().min(1, "Product name is required"),
  quantity: z.number().int().positive().default(1),
  unit_price: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().optional(),
  
  // Order notes
  notes: z.string().optional().nullable(),
  order_id: z.string().optional().nullable(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/**
 * Schema for campaign creation
 */
export const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  type: z.enum(["sms", "email", "whatsapp"]),
  message_template: z.string().min(1, "Message template is required"),
  target_audience: z.enum(["all_clients", "new_clients", "active_clients", "inactive_clients"]),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.enum(["draft", "scheduled", "active", "completed", "cancelled"]).default("draft"),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

/**
 * Generic validation function for objects
 * @param obj - Object to validate
 * @param schema - Validation schema with field validators
 * @returns Validation result with errors
 */
export function validateObject<T>(
  obj: unknown,
  schema: Record<keyof T, (v: unknown) => boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof obj !== "object" || obj === null) {
    return { valid: false, errors: ["Invalid input: expected an object"] };
  }

  const data = obj as Record<string, unknown>;

  for (const [key, validator] of Object.entries(schema)) {
    const value = data[key];
    try {
      if (!validator(value)) {
        errors.push(`Invalid value for field: ${key}`);
      }
    } catch (error) {
      errors.push(`Validation error for field ${key}: ${error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate using Zod schema with error formatting
 * @param data - Data to validate
 * @param schema - Zod schema
 * @returns Validation result
 */
export function validateWithZod<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  } catch (error) {
    return { 
      success: false, 
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Sanitize string input to prevent XSS
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Encode special HTML characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove any script-like content
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validate phone number format (international)
 * @param phone - Phone number to validate
 * @returns boolean
 */
export function isValidPhone(phone: string): boolean {
  // Accept international format with optional + and digits
  const phoneRegex = /^[+]?[\d\s()-]{8,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns boolean
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
