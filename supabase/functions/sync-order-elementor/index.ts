import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncOrderRequest {
  order_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEMENTOR_WEBHOOK_URL = Deno.env.get("ELEMENTOR_WEBHOOK_URL");
    if (!ELEMENTOR_WEBHOOK_URL) {
      throw new Error("ELEMENTOR_WEBHOOK_URL not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id }: SyncOrderRequest = await req.json();

    console.log(`Syncing order ${order_id} to WordPress`);

    // Fetch order with related client and product data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(id, full_name, phone, phone_secondary, address, city),
        product:products(id, name, price)
      `)
      .eq('id', order_id)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      throw orderError;
    }

    if (!order) {
      console.error("Order not found:", order_id);
      return new Response(
        JSON.stringify({ sent: false, error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only send if order status is confirmed
    if (order.status !== 'confirmed') {
      console.log(`Order ${order_id} status is ${order.status}, skipping webhook`);
      return new Response(
        JSON.stringify({ 
          sent: false, 
          skipped: true, 
          reason: "Order not confirmed" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build webhook payload for WordPress
    const webhookPayload = {
      event: "order_confirmed",
      source: "easyflows-pro",
      sent_at: new Date().toISOString(),
      order: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        quantity: order.quantity,
        unit_price: order.unit_price,
        total_amount: order.total_amount,
        delivery_address: order.delivery_address,
        delivery_notes: order.delivery_notes,
        confirmed_at: new Date().toISOString(),
      },
      client: {
        id: order.client?.id || order.client_id,
        full_name: order.client?.full_name || null,
        phone: order.client?.phone || order.client_phone,
        phone_secondary: order.client?.phone_secondary || order.client_phone_secondary,
        address: order.client?.address || null,
        city: order.client?.city || null,
      },
      product: {
        id: order.product?.id || null,
        name: order.product?.name || null,
        price: order.product?.price || null,
      },
    };

    console.log("Sending webhook payload to WordPress:", JSON.stringify(webhookPayload, null, 2));

    // Send webhook to WordPress (non-blocking error handling)
    try {
      const webhookResponse = await fetch(ELEMENTOR_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      const webhookStatus = webhookResponse.status;
      let webhookResponseData;
      
      try {
        webhookResponseData = await webhookResponse.text();
      } catch (e) {
        webhookResponseData = "Unable to read response";
      }

      console.log(`Webhook response status: ${webhookStatus}`);
      console.log(`Webhook response: ${webhookResponseData}`);

      if (webhookResponse.ok) {
        return new Response(
          JSON.stringify({ 
            sent: true, 
            webhook_status: webhookStatus,
            webhook_response: webhookResponseData,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        // Non-blocking: return success to client even if webhook failed
        console.error(`Webhook failed with status ${webhookStatus}: ${webhookResponseData}`);
        return new Response(
          JSON.stringify({ 
            sent: false, 
            webhook_status: webhookStatus,
            webhook_response: webhookResponseData,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch (webhookError: unknown) {
      const errorMessage = webhookError instanceof Error ? webhookError.message : "Unknown error";
      console.error("Error sending webhook:", webhookError);
      
      // Non-blocking: return success to client even if webhook failed
      return new Response(
        JSON.stringify({ 
          sent: false, 
          webhook_status: 0,
          webhook_response: errorMessage,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in sync-order-elementor function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
