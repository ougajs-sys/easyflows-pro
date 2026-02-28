import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid CI phone prefixes (after country code 225)
const VALID_CI_PREFIXES = ["01", "05", "07", "21", "22", "23", "24", "25", "27"];

function normalizeCIPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = phone.replace(/[\s\-()\.]/g, "");

  // Remove leading + or 00
  cleaned = cleaned.replace(/^\+/, "").replace(/^00/, "");

  // If starts with 225, keep as is
  // If starts with 0 + 9 digits, prepend 225
  if (/^0\d{9}$/.test(cleaned)) {
    cleaned = "225" + cleaned.substring(1);
  }

  // If doesn't start with 225, prepend it (local 10-digit number without leading 0)
  if (!cleaned.startsWith("225") && /^\d{10}$/.test(cleaned)) {
    cleaned = "225" + cleaned;
  }

  // Now should be 225 + 10 digits = 13 digits
  if (!/^225\d{10}$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: `Format invalide: ${phone} -> ${cleaned} (attendu: 225 + 10 chiffres)` };
  }

  // Check valid prefix (first 2 digits after 225)
  const prefix = cleaned.substring(3, 5);
  if (!VALID_CI_PREFIXES.includes(prefix)) {
    return { valid: false, normalized: cleaned, error: `Préfixe CI invalide: ${prefix} (valides: ${VALID_CI_PREFIXES.join(",")})` };
  }

  return { valid: true, normalized: cleaned };
}

async function sendWithRetry(
  phone: string,
  message: string,
  channel: string,
  apiKey: string,
  maxRetries = 2
): Promise<{ ok: boolean; data: any }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ phonenumber: phone, text: message, channel }),
    });

    const data = await response.json();

    if (response.ok) {
      return { ok: true, data };
    }

    // Retry on 429 (Too Many Requests)
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "2");
      const waitMs = Math.min(retryAfter * 1000, 10000) * (attempt + 1);
      console.log(`429 for ${phone}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    return { ok: false, data };
  }
  return { ok: false, data: { message: "Max retries exceeded" } };
}

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
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;
    let userId = "service-role";

    if (!isServiceRole) {
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
      const roles = (userRoles || []).map((r: any) => r.role);
      if (!roles.some((r: string) => ["superviseur", "administrateur"].includes(r))) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns").select("*").eq("id", campaign_id).single();
    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
    if (!MESSENGER360_API_KEY) {
      throw new Error("MESSENGER360_API_KEY not configured");
    }

    console.log(`Processing campaign ${campaign.name} (${campaign_id}), segment: ${campaign.segment}, by: ${userId}`);

    // --- Resolve recipients based on segment ---
    let allClients: { id: string; phone: string }[] = [];
    const segment = campaign.segment || "all";
    const isGroupSegment = segment.startsWith("campaign_group:");
    const isProductSegment = segment.startsWith("product:") || segment.startsWith("product_cancelled:");

    if (isProductSegment) {
      const isCancelled = segment.startsWith("product_cancelled:");
      const productId = segment.replace(isCancelled ? "product_cancelled:" : "product:", "");
      
      // Fetch orders for this product with pagination
      let allOrders: { client_id: string; status: string }[] = [];
      let from = 0;
      while (true) {
        let q = supabase.from("orders").select("client_id, status").eq("product_id", productId).range(from, from + 999);
        if (isCancelled) q = q.eq("status", "cancelled");
        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        allOrders = allOrders.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }

      const uniqueClientIds = [...new Set(allOrders.map((o) => o.client_id))];
      for (let i = 0; i < uniqueClientIds.length; i += 100) {
        const batch = uniqueClientIds.slice(i, i + 100);
        const { data: clients } = await supabase.from("clients").select("id, phone").in("id", batch);
        if (clients) allClients = allClients.concat(clients);
      }
    } else {
      // Standard segments with pagination
      let from = 0;
      while (true) {
        let q = supabase.from("clients").select("id, phone").range(from, from + 999);

        if (isGroupSegment) {
          q = q.eq("campaign_group", segment.replace("campaign_group:", ""));
        } else if (segment !== "all") {
          // Map segment IDs to DB queries
          const dbSegmentMap: Record<string, string> = {
            new: "new", regular: "regular", vip: "vip",
            inactive: "inactive", problematic: "problematic",
          };
          if (dbSegmentMap[segment]) {
            q = q.eq("segment", dbSegmentMap[segment]);
          }
          // For advanced segments (confirmed_paid, cancelled, etc.), we fetch all and filter later
          // But for simple DB segments, apply filter directly
        }

        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        allClients = allClients.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }

      // For advanced segments that need order data, filter clients
      const advancedSegments = [
        "confirmed_paid", "cancelled", "reported", "pending",
        "inactive_30", "inactive_60", "inactive_90",
        "frequent", "occasional", "lost",
      ];
      if (advancedSegments.includes(segment)) {
        // Fetch all orders with pagination
        let allOrders: { client_id: string; status: string; created_at: string }[] = [];
        let oFrom = 0;
        while (true) {
          const { data, error } = await supabase.from("orders")
            .select("client_id, status, created_at").range(oFrom, oFrom + 999);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allOrders = allOrders.concat(data);
          if (data.length < 1000) break;
          oFrom += 1000;
        }

        const ordersByClient: Record<string, typeof allOrders> = {};
        allOrders.forEach((o) => {
          if (!ordersByClient[o.client_id]) ordersByClient[o.client_id] = [];
          ordersByClient[o.client_id].push(o);
        });

        const now = new Date();
        const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

        allClients = allClients.filter((c) => {
          const orders = ordersByClient[c.id] || [];
          const lastDate = orders.length > 0
            ? new Date(Math.max(...orders.map((o) => new Date(o.created_at).getTime())))
            : null;
          const recent90 = orders.filter((o) => new Date(o.created_at) >= daysAgo(90));

          switch (segment) {
            case "confirmed_paid": return orders.some((o) => o.status === "delivered" || o.status === "confirmed");
            case "cancelled": return orders.some((o) => o.status === "cancelled");
            case "reported": return orders.some((o) => o.status === "reported");
            case "pending": return orders.some((o) => o.status === "pending" || o.status === "partial");
            case "inactive_30": return !lastDate || lastDate < daysAgo(30);
            case "inactive_60": return !lastDate || lastDate < daysAgo(60);
            case "inactive_90": return !lastDate || lastDate < daysAgo(90);
            case "frequent": return recent90.length >= 3;
            case "occasional": return recent90.length >= 1 && recent90.length < 3;
            case "lost": return !lastDate || lastDate < daysAgo(180);
            default: return true;
          }
        });
      }
    }

    if (allClients.length === 0) {
      await supabase.from("campaigns").update({
        status: "completed", sent_at: new Date().toISOString(), total_recipients: 0,
        sent_count: 0, failed_count: 0,
      }).eq("id", campaign_id);
      return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0 }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update status to sending
    await supabase.from("campaigns").update({
      status: "sending", total_recipients: allClients.length,
    }).eq("id", campaign_id);

    console.log(`Sending ${campaign.type} to ${allClients.length} recipients`);

    let totalSent = 0;
    let totalFailed = 0;
    let totalInvalid = 0;

    // Send messages one by one with throttling + validation
    for (let i = 0; i < allClients.length; i++) {
      const client = allClients[i];
      try {
        const { valid, normalized, error: normError } = normalizeCIPhone(client.phone);

        if (!valid) {
          totalFailed++;
          totalInvalid++;
          console.log(`INVALID phone: ${client.phone} -> ${normError}`);
          await supabase.from("campaign_logs").insert({
            campaign_id, phone: client.phone, status: "failed",
            error_message: normError || "Numéro CI invalide",
          });
          continue;
        }

        const { ok, data } = await sendWithRetry(normalized, campaign.message, campaign.type, MESSENGER360_API_KEY);

        if (ok) {
          totalSent++;
          await supabase.from("campaign_logs").insert({
            campaign_id, phone: normalized, status: "sent",
          });
        } else {
          totalFailed++;
          const errMsg = data?.message || data?.error || JSON.stringify(data);
          console.log(`FAILED ${normalized}: ${errMsg}`);
          await supabase.from("campaign_logs").insert({
            campaign_id, phone: normalized, status: "failed",
            error_message: errMsg,
          });
        }
      } catch (err: unknown) {
        totalFailed++;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`ERROR sending to ${client.phone}:`, err);
        await supabase.from("campaign_logs").insert({
          campaign_id, phone: client.phone, status: "failed",
          error_message: errMsg,
        });
      }

      // Anti-throttling: 200ms between messages
      await new Promise((r) => setTimeout(r, 200));

      // Update progress every 50 messages
      if ((i + 1) % 50 === 0) {
        await supabase.from("campaigns").update({
          sent_count: totalSent, failed_count: totalFailed,
        }).eq("id", campaign_id);
      }
    }

    // Final update
    await supabase.from("campaigns").update({
      sent_count: totalSent, failed_count: totalFailed,
      status: "completed", sent_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    console.log(`Campaign ${campaign_id} completed: ${totalSent} sent, ${totalFailed} failed (${totalInvalid} invalid numbers)`);

    return new Response(JSON.stringify({
      sent: totalSent, failed: totalFailed, invalid: totalInvalid,
      total: allClients.length,
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-campaign:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
