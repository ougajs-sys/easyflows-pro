import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  phone: string;
  type: 'order_created' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'payment_received';
  data: {
    order_number?: string;
    client_name?: string;
    product_name?: string;
    amount?: number;
    delivery_address?: string;
  };
  channel?: 'sms' | 'whatsapp';
}

// Templates de messages
const messageTemplates = {
  order_created: (data: NotificationRequest['data']) => 
    `Bonjour ${data.client_name || 'cher client'}! Votre commande ${data.order_number} pour "${data.product_name}" a été enregistrée. Nous vous contacterons bientôt pour confirmer. Merci de votre confiance!`,
  order_confirmed: (data: NotificationRequest['data']) =>
    `Bonne nouvelle ${data.client_name || ''}! Votre commande ${data.order_number} est confirmée. Montant: ${data.amount?.toLocaleString()} FCFA. Livraison prévue à: ${data.delivery_address || 'adresse indiquée'}.`,
  order_shipped: (data: NotificationRequest['data']) =>
    `${data.client_name || 'Cher client'}, votre commande ${data.order_number} est en cours de livraison! Notre livreur vous contactera bientôt.`,
  order_delivered: (data: NotificationRequest['data']) =>
    `Merci ${data.client_name || ''}! Votre commande ${data.order_number} a été livrée avec succès. À bientôt!`,
  payment_received: (data: NotificationRequest['data']) =>
    `Paiement reçu! Merci ${data.client_name || ''} pour votre paiement de ${data.amount?.toLocaleString()} FCFA sur la commande ${data.order_number}.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required", sent: false }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token", sent: false }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
    if (!MESSENGER360_API_KEY) {
      console.error("MESSENGER360_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured", sent: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, type, data, channel = 'sms' }: NotificationRequest = await req.json();

    // --- Input validation ---
    if (!phone || typeof phone !== "string" || phone.length > 30) {
      return new Response(JSON.stringify({ error: "Invalid phone number", sent: false }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const validTypes = ['order_created', 'order_confirmed', 'order_shipped', 'order_delivered', 'payment_received'];
    if (!type || !validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid notification type", sent: false }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to ${phone} via ${channel}`);

    const templateFn = messageTemplates[type];
    const message = templateFn(data);

    const cleanPhone = phone
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/^\+225/, "225")
      .replace(/^\+/, "")
      .replace(/^00225/, "225")
      .replace(/^0(\d{9})$/, "225$1");

    const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESSENGER360_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        phonenumber: cleanPhone,
        text: message,
        channel: channel,
      }),
    });

    const responseData = await response.json();

    if (response.ok) {
      await supabase.from("campaign_logs").insert({
        phone: cleanPhone,
        status: "sent",
      }).then(({ error }) => {
        if (error) console.log("Could not log notification:", error);
      });

      return new Response(
        JSON.stringify({ sent: true, message: "Notification sent successfully", phone: cleanPhone, notification_type: type }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      console.error(`Failed to send SMS:`, responseData);
      return new Response(
        JSON.stringify({ sent: false, error: responseData.message || "Failed to send SMS" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification-sms:", error);
    return new Response(
      JSON.stringify({ error: errorMessage, sent: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
