import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyWebhookSignature, extractSignatureFromHeaders } from "./crypto-utils.ts";
import { webhookRateLimiter, applyRateLimit, getRateLimitHeaders, getRateLimitIdentifier } from "../_shared/rate-limit.ts";
import { sanitizeString, isValidPhone } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-secret",
};

type AnyRecord = Record<string, unknown>;

function setDeep(obj: AnyRecord, path: string[], value: unknown) {
  let curr: AnyRecord = obj;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const isLast = i === path.length - 1;
    if (isLast) {
      curr[key] = value;
      return;
    }

    const next = curr[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      curr[key] = {};
    }
    curr = curr[key] as AnyRecord;
  }
}

function parseBracketNotation(flat: Record<string, string>) {
  const out: AnyRecord = {};
  for (const [rawKey, value] of Object.entries(flat)) {
    // Examples:
    // - form[id]
    // - form[fields][phone]
    // - fields[product_name]
    const parts = rawKey.split(/\[|\]/).filter(Boolean);
    if (parts.length === 0) continue;
    setDeep(out, parts, value);
  }
  return out;
}

function pickFirstString(...values: unknown[]) {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

function pickFirstNumber(...values: unknown[]) {
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function getField(body: AnyRecord, key: string) {
  // Accept multiple payload shapes:
  // - { phone: "..." }
  // - { form: { fields: { phone: "..." } } }
  // - { fields: { phone: "..." } }
  const form = (body.form ?? {}) as AnyRecord;
  const formFields = (form.fields ?? {}) as AnyRecord;
  const fields = (body.fields ?? {}) as AnyRecord;

  return (body[key] ?? formFields[key] ?? fields[key]) as unknown;
}

function getFormName(body: AnyRecord): string {
  // Le nom du formulaire Elementor contient le nom du produit
  // Elementor envoie: form[name] ou form_name
  const form = (body.form ?? {}) as AnyRecord;
  return pickFirstString(
    body.form_name,
    form.name,
    getField(body, "form_name")
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📦 Webhook received - Processing order");

    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(req, webhookRateLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get rate limit headers for successful request
    const identifier = getRateLimitIdentifier(req);
    const rateLimitHeaders = getRateLimitHeaders(webhookRateLimiter, identifier);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    // Verify webhook signature if secret is configured
    // Note: Signature verification is not supported for multipart/form-data
    if (webhookSecret && !contentType.includes("multipart/form-data")) {
      const signature = extractSignatureFromHeaders(req.headers);
      
      if (signature) {
        const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
        
        if (!isValid) {
          console.error("❌ Invalid webhook signature");
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid webhook signature",
            }),
            {
              headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
              status: 401,
            }
          );
        }
        console.log("✅ Webhook signature verified");
      } else {
        console.warn("⚠️ Webhook signature not provided but secret is configured");
      }
    }

    // Parse the body
    let body: AnyRecord;

    if (contentType.includes("application/json")) {
      body = JSON.parse(rawBody) as AnyRecord;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const flat = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;
      body = parseBracketNotation(flat);
    } else if (contentType.includes("multipart/form-data")) {
      // For multipart, we need to create a new request since body was already consumed
      // Note: Signature verification is not supported for multipart uploads
      console.warn("⚠️ Multipart form data - signature verification skipped");
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      });
      const fd = await newReq.formData();
      const flat: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") flat[k] = v;
      }
      body = parseBracketNotation(flat);
    } else {
      // Fallback
      try {
        body = JSON.parse(rawBody);
      } catch {
        const flat = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;
        body = parseBracketNotation(flat);
      }
    }

    // Log only non-sensitive info (avoid PII)
    const topKeys = Object.keys(body ?? {}).slice(0, 30);
    console.log("📥 Payload content-type:", req.headers.get("content-type") ?? "(none)");
    console.log("📥 Payload top-level keys:", topKeys);

    // Extract order data from multiple possible formats
    const clientName = sanitizeString(pickFirstString(
      getField(body, "client_name"),
      getField(body, "customer_name"),
      getField(body, "name"),
      pickFirstString(body.billing_first_name as unknown)
        ? `${pickFirstString(body.billing_first_name)} ${pickFirstString(body.billing_last_name)}`.trim()
        : ""
    ));

    const clientPhone = sanitizeString(pickFirstString(
      getField(body, "phone"),
      getField(body, "client_phone"),
      body.billing_phone
    ));

    const clientCity = sanitizeString(pickFirstString(
      getField(body, "city"),
      getField(body, "client_city"),
      body.billing_city
    ));

    const clientAddress = sanitizeString(pickFirstString(
      getField(body, "address"),
      getField(body, "client_address"),
      body.billing_address_1
        ? `${pickFirstString(body.billing_address_1)}${pickFirstString(body.billing_address_2) ? ", " + pickFirstString(body.billing_address_2) : ""}`
        : ""
    ));

    // Le nom du produit peut venir de: form_name (nom du formulaire), product_name, ou product
    const formName = getFormName(body);
    const productName = sanitizeString(pickFirstString(
      formName,  // Priorité au nom du formulaire Elementor
      getField(body, "product_name"),
      getField(body, "product"),
      body.line_items && Array.isArray(body.line_items)
        ? (body.line_items[0] as AnyRecord)?.name
        : ""
    ));

    console.log("📝 Form name (product):", formName || "(not set)");
    console.log("📦 Resolved product name:", productName);

    const quantityRaw = pickFirstNumber(
      getField(body, "quantity"),
      body.line_items && Array.isArray(body.line_items)
        ? (body.line_items[0] as AnyRecord)?.quantity
        : 1
    );
    const quantity = Math.max(1, Math.trunc(quantityRaw || 1));

    const unitPrice = pickFirstNumber(
      getField(body, "unit_price"),
      getField(body, "price"),
      body.line_items && Array.isArray(body.line_items)
        ? (body.line_items[0] as AnyRecord)?.price
        : 0
    );

    const notes = sanitizeString(pickFirstString(
      getField(body, "notes"),
      getField(body, "order_notes"),
      body.customer_note
    ));

    const externalOrderId =
      (body.id as string | undefined) ||
      (getField(body, "order_id") as string | undefined) ||
      (getField(body, "order_number") as string | undefined) ||
      null;

    // Enhanced server-side validation
    if (!clientPhone) {
      throw new Error("Téléphone obligatoire (champ 'phone').");
    }
    if (!isValidPhone(clientPhone)) {
      throw new Error("Format de téléphone invalide.");
    }
    if (!productName) {
      throw new Error("Nom du produit obligatoire (champ 'product_name').");
    }
    if (quantity < 1 || quantity > 10000) {
      throw new Error("Quantité invalide (doit être entre 1 et 10000).");
    }

    // Step 1: Find or create client
    let clientId: string;

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", clientPhone)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
      console.log("👤 Found existing client:", clientId);
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          full_name: clientName || "Client Web",
          phone: clientPhone,
          address: clientAddress || null,
          city: clientCity || null,
          notes: "Client importé depuis formulaire web",
        })
        .select("id")
        .single();

      if (clientError) {
        console.error("❌ Error creating client:", clientError);
        throw new Error(`Failed to create client: ${clientError.message}`);
      }

      clientId = newClient.id;
      console.log("✅ Created new client:", clientId);
    }

    // Step 2: Find product by name (optional)
    let productId: string | null = null;
    let resolvedUnitPrice = unitPrice;

    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, price")
      .ilike("name", `%${productName}%`)
      .maybeSingle();

    if (existingProduct) {
      productId = existingProduct.id;
      if (!resolvedUnitPrice || resolvedUnitPrice <= 0) {
        resolvedUnitPrice = Number(existingProduct.price) || 0;
      }
      console.log("📦 Found existing product:", productId);
    }

    const totalAmount =
      pickFirstNumber(getField(body, "total_amount"), body.total, body.order_total) ||
      resolvedUnitPrice * quantity;

    // Step 3: Create order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: clientId,
        product_id: productId,
        quantity,
        unit_price: resolvedUnitPrice,
        total_amount: totalAmount,
        delivery_address: clientAddress || null,
        delivery_notes: notes || null,
        status: "pending",
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("❌ Error creating order:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("✅ Order created successfully:", newOrder.id);

    // Send SMS notification to client (non-blocking)
    try {
      const notificationPayload = {
        phone: clientPhone,
        type: 'order_created',
        channel: 'sms',
        data: {
          order_number: newOrder.order_number,
          client_name: clientName || 'Client',
          product_name: productName,
          amount: totalAmount,
          delivery_address: clientAddress
        }
      };

      // Fire and forget - don't wait for SMS response
      fetch(`${supabaseUrl}/functions/v1/send-notification-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(notificationPayload)
      }).then(response => {
        console.log("📱 SMS notification triggered, status:", response.status);
      }).catch(smsError => {
        console.log("📱 SMS notification failed (non-critical):", smsError);
      });
    } catch (smsError) {
      // Non-blocking - log but don't fail the order
      console.log("📱 Could not trigger SMS notification:", smsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order created successfully",
        order: {
          id: newOrder.id,
          order_number: newOrder.order_number,
        },
        client_id: clientId,
        external_order_id: externalOrderId,
        sms_notification: "triggered"
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Webhook error:", errorMessage);

    // Get rate limit headers even for errors
    const identifier = getRateLimitIdentifier(req);
    const rateLimitHeaders = getRateLimitHeaders(webhookRateLimiter, identifier);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
