import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSmsRequest {
  campaign_id?: string;
  phones: string[];
  message: string;
  type: 'sms' | 'whatsapp';
}

serve(async (req) => {
  // Handle CORS preflight
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
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const userId = claimsData.claims.sub;

    // --- Role check: only superviseur/administrateur ---
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("confirmed", true);

    const roles = (userRoles || []).map((r: { role: string }) => r.role);
    if (!roles.some((r: string) => ["superviseur", "administrateur"].includes(r))) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // --- Input validation ---
    const { campaign_id, phones, message, type }: SendSmsRequest = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid phones array" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (phones.length > 1000) {
      return new Response(JSON.stringify({ error: "Maximum 1000 recipients per request" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!message || typeof message !== "string" || message.length > 1600) {
      return new Response(JSON.stringify({ error: "Invalid message (max 1600 chars)" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!type || !["sms", "whatsapp"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid type, must be 'sms' or 'whatsapp'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
    if (!MESSENGER360_API_KEY) {
      throw new Error("MESSENGER360_API_KEY not configured");
    }

    console.log(`Sending ${type} to ${phones.length} recipients (by user ${userId})`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send messages to each phone
    for (const phone of phones) {
      try {
        const cleanPhone = phone
          .replace(/\s+/g, "")
          .replace(/-/g, "")
          .replace(/^\+/, "")
          .replace(/^0/, "212");

        const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MESSENGER360_API_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            phonenumber: cleanPhone,
            text: message,
          }),
        });

        const responseData = await response.json();

        if (response.ok) {
          results.sent++;
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id,
              phone: cleanPhone,
              status: "sent",
            });
          }
        } else {
          results.failed++;
          results.errors.push(`${cleanPhone}: ${responseData.message || "Unknown error"}`);
          if (campaign_id) {
            await supabase.from("campaign_logs").insert({
              campaign_id,
              phone: cleanPhone,
              status: "failed",
              error_message: responseData.message || "Unknown error",
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
            campaign_id,
            phone,
            status: "failed",
            error_message: errorMessage,
          });
        }
      }
    }

    if (campaign_id) {
      await supabase.from("campaigns").update({
        sent_count: results.sent,
        failed_count: results.failed,
        status: "completed",
        sent_at: new Date().toISOString(),
      }).eq("id", campaign_id);
    }

    console.log(`Completed: ${results.sent} sent, ${results.failed} failed`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
