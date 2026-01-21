/**
 * VALIDATION SCHEMAS WITH ZOD
 * 
 * Schémas de validation pour sécuriser les données entrantes
 * Protège contre:
 * - Injection SQL
 * - XSS attacks
 * - Data corruption
 * - Type mismatches
 */

import { z } from "npm:zod@3.23.8";

/**
 * Schéma de validation pour les commandes webhook
 */
export const OrderWebhookSchema = z.object({
  // Client information
  client_name: z
    .string()
    .min(2, "Le nom du client doit contenir au moins 2 caractères")
    .max(200, "Le nom du client ne peut pas dépasser 200 caractères")
    .optional(),
  
  phone: z
    .string()
    .regex(/^[0-9+\s()-]{8,20}$/, "Numéro de téléphone invalide")
    .transform((val) => val.replace(/[\s()-]/g, "")), // Normaliser le format
  
  city: z.string().max(100).optional(),
  
  address: z.string().max(500).optional(),
  
  // Product information
  product_name: z
    .string()
    .min(1, "Le nom du produit est obligatoire")
    .max(200, "Le nom du produit ne peut pas dépasser 200 caractères"),
  
  quantity: z
    .number()
    .int()
    .positive("La quantité doit être positive")
    .max(1000, "La quantité ne peut pas dépasser 1000")
    .default(1),
  
  unit_price: z
    .number()
    .nonnegative("Le prix unitaire ne peut pas être négatif")
    .max(1000000, "Le prix unitaire ne peut pas dépasser 1,000,000")
    .optional(),
  
  total_amount: z
    .number()
    .nonnegative("Le montant total ne peut pas être négatif")
    .max(10000000, "Le montant total ne peut pas dépasser 10,000,000")
    .optional(),
  
  // Additional information
  notes: z.string().max(1000).optional(),
  
  order_id: z.string().max(100).optional(),
  
  // Metadata
  form_name: z.string().max(200).optional(),
  
  // Nested structures support
  form: z
    .object({
      name: z.string().optional(),
      fields: z.record(z.unknown()).optional(),
    })
    .optional(),
  
  fields: z.record(z.unknown()).optional(),
  
  // E-commerce platforms support
  billing_first_name: z.string().max(100).optional(),
  billing_last_name: z.string().max(100).optional(),
  billing_phone: z.string().optional(),
  billing_city: z.string().max(100).optional(),
  billing_address_1: z.string().max(500).optional(),
  billing_address_2: z.string().max(500).optional(),
  
  line_items: z
    .array(
      z.object({
        name: z.string().optional(),
        quantity: z.number().optional(),
        price: z.number().optional(),
      })
    )
    .optional(),
}).passthrough(); // Allow additional fields but validate known ones

/**
 * Type TypeScript généré depuis le schéma
 */
export type OrderWebhookInput = z.infer<typeof OrderWebhookSchema>;

/**
 * Schéma pour les notifications SMS
 */
export const SMSNotificationSchema = z.object({
  phone: z.string().regex(/^[0-9+]{8,20}$/),
  type: z.enum([
    "order_created",
    "order_confirmed",
    "order_shipped",
    "order_delivered",
    "payment_reminder",
    "followup",
  ]),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
  data: z.record(z.unknown()),
});

export type SMSNotificationInput = z.infer<typeof SMSNotificationSchema>;

/**
 * Schéma pour les clients
 */
export const ClientSchema = z.object({
  full_name: z.string().min(2).max(200),
  phone: z.string().regex(/^[0-9+]{8,20}$/),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type ClientInput = z.infer<typeof ClientSchema>;

/**
 * Validation helper avec messages d'erreur détaillés
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ["Unknown validation error"] };
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^0-9+]/g, "");
  
  // Ensure + is only at the start
  if (cleaned.includes("+")) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }
  
  return cleaned;
}
