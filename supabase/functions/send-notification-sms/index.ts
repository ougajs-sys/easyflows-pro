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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
    if (!MESSENGER360_API_KEY) {
      console.error("MESSENGER360_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured", sent: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, type, data, channel = 'sms' }: NotificationRequest = await req.json();

    console.log(`Sending ${type} notification to ${phone} via ${channel}`);

    // Get message template
    const templateFn = messageTemplates[type];
    if (!templateFn) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const message = templateFn(data);
    console.log(`Message: ${message}`);

    // Clean phone number - ensure it has country code
    let cleanPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
    
    // Handle different country codes
    if (cleanPhone.startsWith("0")) {
      // Assume Morocco by default, change to your country
      cleanPhone = "+212" + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = "+" + cleanPhone;
    }

    console.log(`Cleaned phone: ${cleanPhone}`);

    // MESSENGER360 API call
    const response = await fetch("https://api.messenger360.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESSENGER360_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: cleanPhone,
        message: message,
        channel: channel,
      }),
    });

    const responseData = await response.json();
    console.log(`Messenger360 response:`, responseData);

    if (response.ok) {
      // Log the notification
      await supabase.from("campaign_logs").insert({
        phone: cleanPhone,
        status: "sent",
        message: message,
      }).then(({ error }) => {
        if (error) console.log("Could not log notification:", error);
      });

      return new Response(
        JSON.stringify({ 
          sent: true, 
          message: "Notification sent successfully",
          phone: cleanPhone,
          notification_type: type
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      console.error(`Failed to send SMS:`, responseData);
      return new Response(
        JSON.stringify({ 
          sent: false, 
          error: responseData.message || "Failed to send SMS",
          details: responseData
        }),
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
