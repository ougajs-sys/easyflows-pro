import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Validation Schemas for Webhook Orders
 */

export const WebhookOrderSchema = z.object({
  order_id: z.string().min(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
  customer_address: z.string().min(5),
  customer_city: z.string().min(1),
  items: z.array(z.object({
    product_id: z.string().min(1),
    product_name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
  total_amount: z.number().positive(),
  delivery_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(['cash', 'card', 'online']).optional(),
  signature: z.string().optional(), // HMAC signature
  timestamp: z.number().optional(),
});

export type WebhookOrderType = z.infer<typeof WebhookOrderSchema>;

/**
 * Validation Schema for Client Data
 */
export const ClientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
  address: z.string().min(5).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export type ClientType = z.infer<typeof ClientSchema>;

/**
 * Validation Schema for Product Data
 */
export const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50).optional(),
  price: z.number().positive(),
  cost: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative(),
  category: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  image_url: z.string().url().optional(),
});

export type ProductType = z.infer<typeof ProductSchema>;

/**
 * Validation Schema for Campaign Data
 */
export const CampaignSchema = z.object({
  name: z.string().min(1).max(200),
  message: z.string().min(1).max(1600), // SMS limit
  segment_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'sent', 'cancelled']),
});

export type CampaignType = z.infer<typeof CampaignSchema>;

/**
 * Validate request body against a schema
 */
export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`,
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error.message}`,
    };
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();
}

/**
 * Sanitize phone number to E.164 format
 */
export function sanitizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}
