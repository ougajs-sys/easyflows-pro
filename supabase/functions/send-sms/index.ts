import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid CI phone prefixes (after country code 225)
const VALID_CI_PREFIXES = ["01", "05", "07", "21", "22", "23", "24", "25", "27"];

function normalizeCIPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  cleaned = cleaned.replace(/^\+/, "").replace(/^00/, "");

  if (/^0\d{9}$/.test(cleaned)) {
    cleaned = "225" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("225") && /^\d{10}$/.test(cleaned)) {
    cleaned = "225" + cleaned;
  }

  if (!/^225\d{10}$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: `Format invalide: ${phone} -> ${cleaned} (attendu: 225 + 10 chiffres)` };
  }

  const prefix = cleaned.substring(3, 5);
  if (!VALID_CI_PREFIXES.includes(prefix)) {
    return { valid: false, normalized: cleaned, error: `Préfixe CI invalide: ${prefix} (valides: ${VALID_CI_PREFIXES.join(",")})` };
  }

  return { valid: true, normalized: cleaned };
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

    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
    if (!MESSENGER360_API_KEY) {
      throw new Error("MESSENGER360_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`Sending ${type} to ${phones.length} recipients (by ${userId})`);

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const phone of phones) {
      try {
        const { valid, normalized, error: normError } = normalizeCIPhone(phone);

        if (!valid) {
          results.failed++;
          results.errors.push(`${phone}: ${normError}`);
          console.log(`INVALID: ${phone} -> ${normError}`);
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id, phone, status: "failed",
              error_message: normError || "Numéro CI invalide",
            });
          }
          // No delay needed for invalid numbers
          continue;
        }

        // Send with retry on 429
        let sent = false;
        let lastError = "";
        for (let attempt = 0; attempt <= 2; attempt++) {
          const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${MESSENGER360_API_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ phonenumber: normalized, text: message, channel: type }),
          });

          const responseData = await response.json();

          if (response.ok) {
            sent = true;
            results.sent++;
            if (campaign_id) {
              await supabase.from("campaign_logs").insert({
                campaign_id, phone: normalized, status: "sent",
              });
            }
            break;
          }

          lastError = responseData?.message || JSON.stringify(responseData);

          if (response.status === 429 && attempt < 2) {
            const wait = Math.min(parseInt(response.headers.get("Retry-After") || "2") * 1000, 10000) * (attempt + 1);
            console.log(`429 for ${normalized}, waiting ${wait}ms`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }

          break;
        }

        if (!sent) {
          results.failed++;
          results.errors.push(`${normalized}: ${lastError}`);
          console.log(`FAILED: ${normalized} -> ${lastError}`);
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id, phone: normalized, status: "failed",
              error_message: lastError,
            });
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error sending to ${phone}:`, error);
        results.failed++;
        results.errors.push(`${phone}: ${errorMessage}`);
        if (campaign_id) {
          await supabase.from("campaign_logs").insert({
            campaign_id, phone, status: "failed", error_message: errorMessage,
          });
        }
      }

      // Anti-throttling delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Completed: ${results.sent} sent, ${results.failed} failed`);

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
