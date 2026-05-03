import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
async function sendViaMessenger360(phone: string, message: string, apiKey: string): Promise<{ ok: boolean; data: any }> {
  try {
    const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ phonenumber: phone, text: message, channel: "whatsapp" }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch (err) {
    return { ok: false, data: { message: err instanceof Error ? err.message : "messenger360 request failed" } };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CI_PREFIXES = ["01", "05", "07", "21", "22", "23", "24", "25", "27"];

function normalizeCIPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  cleaned = cleaned.replace(/^\+/, "").replace(/^00/, "");
  if (/^0\d{9}$/.test(cleaned)) cleaned = "225" + cleaned;
  if (!cleaned.startsWith("225") && /^\d{10}$/.test(cleaned)) cleaned = "225" + cleaned;
  if (!/^225\d{10}$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: `Format invalide: ${phone} -> ${cleaned}` };
  }
  const prefix = cleaned.substring(3, 5);
  if (!VALID_CI_PREFIXES.includes(prefix)) {
    return { valid: false, normalized: cleaned, error: `Préfixe CI invalide: ${prefix}` };
  }
  return { valid: true, normalized: cleaned };
}

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

// --- sms8.io sender ---
async function sendViaSms8(phone: string, message: string, apiKey: string, deviceId: string): Promise<{ ok: boolean; data: any }> {
  const phoneWithPlus = "+" + phone;
  const url = `https://app.sms8.io/services/send.php?key=${encodeURIComponent(apiKey)}&number=${encodeURIComponent(phoneWithPlus)}&message=${encodeURIComponent(message)}&devices=${encodeURIComponent(JSON.stringify([deviceId]))}&type=sms`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.success || response.ok) return { ok: true, data };
    return { ok: false, data };
  } catch (err) {
    return { ok: false, data: { message: err instanceof Error ? err.message : "sms8.io request failed" } };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required", sent: false }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token", sent: false }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { phone, type, data, channel = 'sms' }: NotificationRequest = await req.json();

    if (!phone || typeof phone !== "string" || phone.length > 30) {
      return new Response(JSON.stringify({ error: "Invalid phone number", sent: false }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const validTypes = ['order_created', 'order_confirmed', 'order_shipped', 'order_delivered', 'payment_received'];
    if (!type || !validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid notification type", sent: false }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { valid, normalized, error: normError } = normalizeCIPhone(phone);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: `Numéro invalide: ${normError}`, sent: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isSms = channel === 'sms';
    const providerName = isSms ? 'sms8.io' : 'messenger360';
    console.log(`Sending ${type} notification to ${normalized} via ${providerName} (channel: ${channel})`);

    const templateFn = messageTemplates[type];
    const message = templateFn(data);

    let result: { ok: boolean; data: any };

    if (isSms) {
      const SMS8_API_KEY = Deno.env.get("SMS8_API_KEY");
      const SMS8_DEVICE_ID = Deno.env.get("SMS8_DEVICE_ID");
      if (!SMS8_API_KEY || !SMS8_DEVICE_ID) {
        return new Response(
          JSON.stringify({ error: "SMS service (sms8.io) not configured", sent: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      result = await sendViaSms8(normalized, message, SMS8_API_KEY, SMS8_DEVICE_ID);
    } else {
      const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
      if (!MESSENGER360_API_KEY) {
        return new Response(
          JSON.stringify({ error: "WhatsApp service (Messenger360) not configured", sent: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      result = await sendViaMessenger360(normalized, message, MESSENGER360_API_KEY);
    }

    console.log(`${providerName} response for ${normalized}:`, JSON.stringify(result.data));

    if (result.ok) {
      await supabase.from("campaign_logs").insert({
        phone: normalized, status: "sent",
      }).then(({ error }) => {
        if (error) console.log("Could not log notification:", error);
      });

      return new Response(
        JSON.stringify({ sent: true, message: "Notification sent successfully", phone: normalized, notification_type: type, provider: providerName }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      const errMsg = result.data?.message || JSON.stringify(result.data);
      console.error(`Failed to send notification to ${normalized}: ${errMsg}`);
      return new Response(
        JSON.stringify({ sent: false, error: errMsg, provider: providerName }),
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
