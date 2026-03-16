import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function sendViaMessenger360(phone: string, message: string, channel: string, apiKey: string): Promise<{ ok: boolean; data: any; status?: number }> {
  const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ phonenumber: phone, text: message, channel }),
  });
  const data = await response.json();
  return { ok: response.ok, data, status: response.status };
}

// Random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find campaigns with pending batches that are ready to process
    const { data: readyControls, error: ctrlErr } = await supabase
      .from("campaign_queue_control")
      .select("*")
      .lte("next_batch_at", now)
      .order("next_batch_at", { ascending: true })
      .limit(1);

    if (ctrlErr) throw ctrlErr;
    if (!readyControls || readyControls.length === 0) {
      return new Response(JSON.stringify({ message: "No batches ready" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const control = readyControls[0];
    const batchSize = randomInt(15, 20); // Random batch size between 15-20

    // Fetch pending messages for this campaign
    const { data: messages, error: msgErr } = await supabase
      .from("campaign_queue")
      .select("*")
      .eq("campaign_id", control.campaign_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (msgErr) throw msgErr;

    if (!messages || messages.length === 0) {
      // No more messages, mark campaign as completed
      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          sent_count: control.total_sent,
          failed_count: control.total_failed,
          sent_at: now,
        })
        .eq("id", control.campaign_id);

      console.log(`Campaign ${control.campaign_id} completed: ${control.total_sent} sent, ${control.total_failed} failed`);

      return new Response(JSON.stringify({ 
        message: "Campaign completed", 
        campaign_id: control.campaign_id,
        total_sent: control.total_sent,
        total_failed: control.total_failed,
      }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine provider
    const isSms = messages[0].type === "sms";
    const SMS8_API_KEY = Deno.env.get("SMS8_API_KEY") || "";
    const SMS8_DEVICE_ID = Deno.env.get("SMS8_DEVICE_ID") || "";
    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY") || "";

    let batchSent = 0;
    let batchFailed = 0;

    console.log(`Processing batch of ${messages.length} ${messages[0].type} messages for campaign ${control.campaign_id}`);

    for (const msg of messages) {
      try {
        const { valid, normalized, error: normError } = normalizeCIPhone(msg.phone);

        if (!valid) {
          batchFailed++;
          await supabase.from("campaign_queue").update({
            status: "failed", error_message: normError || "Numéro invalide", sent_at: now,
          }).eq("id", msg.id);
          await supabase.from("campaign_logs").insert({
            campaign_id: msg.campaign_id, phone: msg.phone, status: "failed",
            error_message: normError || "Numéro CI invalide",
          });
          continue;
        }

        let sendResult: { ok: boolean; data: any };

        if (isSms) {
          sendResult = await sendViaSms8(normalized, msg.message, SMS8_API_KEY, SMS8_DEVICE_ID);
        } else {
          // WhatsApp with retry on 429
          let sent = false;
          sendResult = { ok: false, data: {} };
          for (let attempt = 0; attempt <= 2; attempt++) {
            const res = await sendViaMessenger360(normalized, msg.message, "whatsapp", MESSENGER360_API_KEY);
            if (res.ok) { sendResult = res; sent = true; break; }
            if (res.status === 429 && attempt < 2) {
              await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
              continue;
            }
            sendResult = res;
            break;
          }
        }

        if (sendResult.ok) {
          batchSent++;
          await supabase.from("campaign_queue").update({
            status: "sent", sent_at: new Date().toISOString(),
          }).eq("id", msg.id);
          await supabase.from("campaign_logs").insert({
            campaign_id: msg.campaign_id, phone: normalized, status: "sent",
          });
        } else {
          batchFailed++;
          const errMsg = sendResult.data?.message || JSON.stringify(sendResult.data);
          await supabase.from("campaign_queue").update({
            status: "failed", error_message: errMsg, sent_at: new Date().toISOString(),
          }).eq("id", msg.id);
          await supabase.from("campaign_logs").insert({
            campaign_id: msg.campaign_id, phone: normalized, status: "failed",
            error_message: errMsg,
          });
        }

        // Small delay between messages within a batch (1-3 seconds, irregular)
        const intraDelay = randomInt(1000, 3000);
        await new Promise(r => setTimeout(r, intraDelay));

      } catch (err: unknown) {
        batchFailed++;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        await supabase.from("campaign_queue").update({
          status: "failed", error_message: errMsg,
        }).eq("id", msg.id);
      }
    }

    // Check remaining messages
    const { count: remaining } = await supabase
      .from("campaign_queue")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", control.campaign_id)
      .eq("status", "pending");

    const newTotalSent = control.total_sent + batchSent;
    const newTotalFailed = control.total_failed + batchFailed;

    if (remaining === 0) {
      // Campaign done
      await supabase.from("campaign_queue_control").update({
        total_sent: newTotalSent,
        total_failed: newTotalFailed,
        updated_at: now,
      }).eq("id", control.id);

      await supabase.from("campaigns").update({
        status: "completed",
        sent_count: newTotalSent,
        failed_count: newTotalFailed,
        sent_at: now,
      }).eq("id", control.campaign_id);

      console.log(`Campaign ${control.campaign_id} fully completed: ${newTotalSent} sent, ${newTotalFailed} failed`);
    } else {
      // Schedule next batch with random delay: 10min to 60min
      const delayMinutes = randomInt(10, 60);
      const nextBatchAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

      await supabase.from("campaign_queue_control").update({
        total_sent: newTotalSent,
        total_failed: newTotalFailed,
        next_batch_at: nextBatchAt,
        batch_size: randomInt(15, 20), // Vary next batch size too
        updated_at: now,
      }).eq("id", control.id);

      // Update campaign progress
      await supabase.from("campaigns").update({
        sent_count: newTotalSent,
        failed_count: newTotalFailed,
      }).eq("id", control.campaign_id);

      console.log(`Batch done: ${batchSent} sent, ${batchFailed} failed. ${remaining} remaining. Next batch in ${delayMinutes}min at ${nextBatchAt}`);
    }

    return new Response(JSON.stringify({
      message: "Batch processed",
      campaign_id: control.campaign_id,
      batch_sent: batchSent,
      batch_failed: batchFailed,
      remaining: remaining || 0,
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-campaign-queue:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
