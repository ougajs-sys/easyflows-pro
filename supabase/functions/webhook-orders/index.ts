import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
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

async function parseIncomingBody(req: Request): Promise<AnyRecord> {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

  // Elementor webhook often sends application/x-www-form-urlencoded.
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as AnyRecord;
    return json;
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const flat = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
    return parseBracketNotation(flat);
  }

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const flat: Record<string, string> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string") flat[k] = v;
    }
    return parseBracketNotation(flat);
  }

  // Fallback: try JSON first, else urlencoded-ish.
  const raw = await req.text();
  try {
    return JSON.parse(raw);
  } catch {
    const flat = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
    return parseBracketNotation(flat);
  }
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming data (JSON / urlencoded / multipart)
    const body = await parseIncomingBody(req);

    // Log only non-sensitive info (avoid PII)
    const topKeys = Object.keys(body ?? {}).slice(0, 30);
    console.log("📥 Payload content-type:", req.headers.get("content-type") ?? "(none)");
    console.log("📥 Payload top-level keys:", topKeys);

    // Extract order data from multiple possible formats
    const clientName = pickFirstString(
      getField(body, "client_name"),
      getField(body, "customer_name"),
      getField(body, "name"),
      pickFirstString(body.billing_first_name as unknown)
        ? `${pickFirstString(body.billing_first_name)} ${pickFirstString(body.billing_last_name)}`.trim()
        : ""
    );

    const clientPhone = pickFirstString(
      getField(body, "phone"),
      getField(body, "client_phone"),
      body.billing_phone
    );

    const clientCity = pickFirstString(
      getField(body, "city"),
      getField(body, "client_city"),
      body.billing_city
    );

    const clientAddress = pickFirstString(
      getField(body, "address"),
      getField(body, "client_address"),
      body.billing_address_1
        ? `${pickFirstString(body.billing_address_1)}${pickFirstString(body.billing_address_2) ? ", " + pickFirstString(body.billing_address_2) : ""}`
        : ""
    );

    // Le nom du produit peut venir de: form_name (nom du formulaire), product_name, ou product
    const formName = getFormName(body);
    const productName = pickFirstString(
      formName,  // Priorité au nom du formulaire Elementor
      getField(body, "product_name"),
      getField(body, "product"),
      body.line_items && Array.isArray(body.line_items)
        ? (body.line_items[0] as AnyRecord)?.name
        : ""
    );

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

    const notes = pickFirstString(
      getField(body, "notes"),
      getField(body, "order_notes"),
      body.customer_note
    );

    const externalOrderId =
      (body.id as string | undefined) ||
      (getField(body, "order_id") as string | undefined) ||
      (getField(body, "order_number") as string | undefined) ||
      null;

    // Minimal server-side validation
    if (!clientPhone) {
      throw new Error("Téléphone obligatoire (champ 'phone').");
    }
    if (!productName) {
      throw new Error("Nom du produit obligatoire (champ 'product_name').");
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
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Webhook error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
