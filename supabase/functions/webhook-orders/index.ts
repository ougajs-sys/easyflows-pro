import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📦 Webhook received - Processing order from WordPress/Make");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming data
    const body = await req.json();
    console.log("📥 Received payload:", JSON.stringify(body, null, 2));

    // Extract order data from Make/WordPress payload
    // Adaptable to different WordPress/WooCommerce formats
    const orderData = {
      // Client info
      client_name: body.billing_first_name 
        ? `${body.billing_first_name} ${body.billing_last_name || ""}`.trim()
        : body.client_name || body.customer_name || body.name || "Client WordPress",
      client_phone: body.billing_phone || body.phone || body.client_phone || "",
      client_address: body.billing_address_1 
        ? `${body.billing_address_1}${body.billing_address_2 ? ", " + body.billing_address_2 : ""}`
        : body.address || body.client_address || "",
      client_city: body.billing_city || body.city || body.client_city || "",
      
      // Order info
      product_name: body.line_items?.[0]?.name || body.product_name || body.product || "Produit WordPress",
      quantity: parseInt(body.line_items?.[0]?.quantity || body.quantity || "1"),
      unit_price: parseFloat(body.line_items?.[0]?.price || body.unit_price || body.price || "0"),
      total_amount: parseFloat(body.total || body.order_total || body.total_amount || "0"),
      
      // WordPress/WooCommerce order ID for reference
      external_order_id: body.id || body.order_id || body.order_number || null,
      notes: body.customer_note || body.order_notes || body.notes || `Commande WordPress #${body.id || body.order_id || ""}`,
    };

    console.log("📋 Parsed order data:", JSON.stringify(orderData, null, 2));

    // Step 1: Find or create client
    let clientId: string;

    // Check if client exists by phone
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", orderData.client_phone)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
      console.log("👤 Found existing client:", clientId);
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          full_name: orderData.client_name,
          phone: orderData.client_phone || `WP-${Date.now()}`, // Phone is required
          address: orderData.client_address,
          city: orderData.client_city,
          notes: `Client importé depuis WordPress`,
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

    // Step 2: Find product by name or create a generic one
    let productId: string | null = null;

    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, price")
      .ilike("name", `%${orderData.product_name}%`)
      .maybeSingle();

    if (existingProduct) {
      productId = existingProduct.id;
      console.log("📦 Found existing product:", productId);
    }

    // Step 3: Create order
    const totalAmount = orderData.total_amount || orderData.unit_price * orderData.quantity;

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: clientId,
        product_id: productId,
        quantity: orderData.quantity,
        unit_price: orderData.unit_price,
        total_amount: totalAmount,
        delivery_address: orderData.client_address,
        delivery_notes: orderData.notes,
        status: "pending",
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("❌ Error creating order:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("✅ Order created successfully:", newOrder);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order created successfully",
        order: {
          id: newOrder.id,
          order_number: newOrder.order_number,
        },
        client_id: clientId,
        external_order_id: orderData.external_order_id,
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
