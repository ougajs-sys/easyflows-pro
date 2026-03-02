import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Normalize Ivorian phone number to 225XXXXXXXXXX format (no +)
 */
function normalizeCIPhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-()\.]/g, "");
  // Remove leading + or 00
  cleaned = cleaned.replace(/^(\+|00)/, "");
  // Handle local format 0XXXXXXXXX
  if (/^0[0-9]{9}$/.test(cleaned)) {
    cleaned = "225" + cleaned.substring(1);
  }
  // Validate: must be 225 + 10 digits with valid prefix
  if (/^225(01|05|07|21|22|23|24|25|27)\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return "";
}

/**
 * Send WhatsApp message via Messenger360
 */
async function sendWhatsApp(
  phone: string,
  message: string,
  apiKey: string
): Promise<{ ok: boolean; data: any }> {
  try {
    const response = await fetch(
      "https://api.360messenger.com/v2/sendMessage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          phone,
          body: message,
          type: "text",
        }),
      }
    );
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (err) {
    return { ok: false, data: { error: String(err) } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");

    if (!MESSENGER360_API_KEY) {
      console.error("MESSENGER360_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const {
      event_type,
      title,
      body: messageBody,
      target_user_ids,
      link,
    } = body;

    if (!event_type || !title || !messageBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_type, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = "https://easyflows-pro.lovable.app";
    const fullLink = link ? `${baseUrl}${link}` : baseUrl;

    // Build the WhatsApp message
    const whatsappMessage = `${title}\n${messageBody}\nConsultez: ${fullLink}`;

    const userIds: string[] = target_user_ids || [];

    if (userIds.length === 0) {
      console.log("No target user IDs provided, skipping");
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, failed: 0, reason: "no_targets" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${event_type} notification for ${userIds.length} users`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const userId of userIds) {
      try {
        // Deduplication: check if same event_type + recipient in last 60s
        const { data: recentLog } = await supabase
          .from("work_notification_logs")
          .select("id")
          .eq("event_type", event_type)
          .eq("recipient_user_id", userId)
          .gte("created_at", new Date(Date.now() - 60000).toISOString())
          .limit(1);

        if (recentLog && recentLog.length > 0) {
          console.log(`Skipping duplicate ${event_type} for user ${userId}`);
          skipped++;
          continue;
        }

        // Get user phone from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("id", userId)
          .single();

        if (!profile?.phone) {
          console.log(`No phone for user ${userId}, skipping`);
          await supabase.from("work_notification_logs").insert({
            event_type,
            recipient_user_id: userId,
            recipient_phone: null,
            message: whatsappMessage,
            link: fullLink,
            status: "skipped",
            error_message: "No phone number",
            provider: "messenger360",
          });
          skipped++;
          continue;
        }

        const normalized = normalizeCIPhone(profile.phone);
        if (!normalized) {
          console.log(`Invalid phone ${profile.phone} for user ${userId}`);
          await supabase.from("work_notification_logs").insert({
            event_type,
            recipient_user_id: userId,
            recipient_phone: profile.phone,
            message: whatsappMessage,
            link: fullLink,
            status: "skipped",
            error_message: "Invalid CI phone number",
            provider: "messenger360",
          });
          skipped++;
          continue;
        }

        // Send WhatsApp
        const result = await sendWhatsApp(normalized, whatsappMessage, MESSENGER360_API_KEY);

        await supabase.from("work_notification_logs").insert({
          event_type,
          recipient_user_id: userId,
          recipient_phone: normalized,
          message: whatsappMessage,
          link: fullLink,
          status: result.ok ? "sent" : "failed",
          error_message: result.ok ? null : JSON.stringify(result.data),
          provider: "messenger360",
        });

        if (result.ok) {
          console.log(`WhatsApp sent to ${normalized} (${profile.full_name})`);
          sent++;
        } else {
          console.error(`WhatsApp failed for ${normalized}:`, result.data);
          failed++;
        }

        // Small delay between sends
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
        failed++;
      }
    }

    console.log(`Completed: sent=${sent}, failed=${failed}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({ sent, failed, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-work-notification error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
