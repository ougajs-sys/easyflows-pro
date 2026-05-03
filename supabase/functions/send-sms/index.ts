import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
async function sendViaMessenger360(phone: string, message: string, apiKey: string): Promise<{ ok: boolean; data: any; status?: number }> {
  try {
    const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ phonenumber: phone, text: message, channel: "whatsapp" }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data, status: response.status };
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

interface SendSmsRequest {
  campaign_id?: string;
  phones: string[];
  message: string;
  type: 'sms' | 'whatsapp';
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
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;
    let userId: string | undefined;

    if (isServiceRole) {
      userId = "service-role";
    } else {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await authClient.auth.getUser();
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      userId = userData.user.id;

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", userId).eq("confirmed", true);
      const roles = (userRoles || []).map((r: { role: string }) => r.role);
      if (!roles.some((r: string) => ["superviseur", "administrateur"].includes(r))) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const { campaign_id, phones, message, type }: SendSmsRequest = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid phones array" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (phones.length > 10000) {
      return new Response(JSON.stringify({ error: "Maximum 10000 recipients per request" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!message || typeof message !== "string" || message.length > 1600) {
      return new Response(JSON.stringify({ error: "Invalid message (max 1600 chars)" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!type || !["sms", "whatsapp"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const isSms = type === "sms";

    // Validate provider config
    if (isSms) {
      const SMS8_API_KEY = Deno.env.get("SMS8_API_KEY");
      const SMS8_DEVICE_ID = Deno.env.get("SMS8_DEVICE_ID");
      if (!SMS8_API_KEY || !SMS8_DEVICE_ID) {
        throw new Error("SMS8_API_KEY or SMS8_DEVICE_ID not configured");
      }
    } else {
      const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
      if (!MESSENGER360_API_KEY) {
        throw new Error("MESSENGER360_API_KEY not configured");
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const providerName = isSms ? "sms8.io" : "messenger360";
    console.log(`Sending ${type} to ${phones.length} recipients via ${providerName} (by ${userId})`);

    const SMS8_API_KEY = Deno.env.get("SMS8_API_KEY") || "";
    const SMS8_DEVICE_ID = Deno.env.get("SMS8_DEVICE_ID") || "";
    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY") || "";

    const results = { sent: 0, failed: 0, errors: [] as string[] };
    const throttleMs = isSms ? 100 : 200;
    const WA_BATCH_SIZE = 20;
    const WA_BATCH_PAUSE_MS = 20_000;
    let waBatchCount = 0;

    for (const phone of phones) {
      try {
        const { valid, normalized, error: normError } = normalizeCIPhone(phone);

        if (!valid) {
          results.failed++;
          results.errors.push(`${phone}: ${normError}`);
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id, phone, status: "failed",
              error_message: normError || "Numéro CI invalide",
            });
          }
          continue;
        }

        let sendResult: { ok: boolean; data: any };

        if (isSms) {
          sendResult = await sendViaSms8(normalized, message, SMS8_API_KEY, SMS8_DEVICE_ID);
        } else {
          sendResult = await sendViaMessenger360(normalized, message, MESSENGER360_API_KEY);
        }

        if (sendResult.ok) {
          results.sent++;
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id, phone: normalized, status: "sent",
            });
          }
        } else {
          results.failed++;
          const errMsg = sendResult.data?.message || JSON.stringify(sendResult.data);
          results.errors.push(`${normalized}: ${errMsg}`);
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id, phone: normalized, status: "failed",
              error_message: errMsg,
            });
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push(`${phone}: ${errorMessage}`);
        if (campaign_id) {
          await supabase.from("campaign_logs").insert({
            campaign_id, phone, status: "failed", error_message: errorMessage,
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, throttleMs));

      if (!isSms) {
        waBatchCount++;
        if (waBatchCount >= WA_BATCH_SIZE) {
          console.log(`WhatsApp batch pause: ${results.sent + results.failed}/${phones.length} processed, waiting ${WA_BATCH_PAUSE_MS / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, WA_BATCH_PAUSE_MS));
          waBatchCount = 0;
        }
      }
    }

    console.log(`Completed: ${results.sent} sent, ${results.failed} failed via ${providerName}`);

    return new Response(JSON.stringify(results), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-sms function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
