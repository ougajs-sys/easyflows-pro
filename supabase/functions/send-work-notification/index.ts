import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
async function sendViaMessenger360(
  phone: string,
  message: string,
  apiKey: string
): Promise<{ ok: boolean; data: any; status?: number }> {
  const response = await fetch("https://api.360messenger.com/v2/sendMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ phonenumber: phone, text: message, channel: "whatsapp" }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data, status: response.status };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CI_PREFIXES = ["01", "05", "07", "21", "22", "23", "24", "25", "27"];

function normalizeCIPhone(raw: string): { valid: boolean; normalized: string; error?: string } {
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, "");
  cleaned = cleaned.replace(/^\+/, "").replace(/^00/, "");
  if (/^0\d{9}$/.test(cleaned)) cleaned = "225" + cleaned;
  if (!cleaned.startsWith("225") && /^\d{10}$/.test(cleaned)) cleaned = "225" + cleaned;
  if (/^\d{8}$/.test(cleaned)) cleaned = "225" + cleaned;
  if (!/^225\d{10}$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: `Format invalide: ${raw} -> ${cleaned}` };
  }
  const prefix = cleaned.substring(3, 5);
  if (!VALID_CI_PREFIXES.includes(prefix)) {
    return { valid: false, normalized: cleaned, error: `Préfixe CI invalide: ${prefix}` };
  }
  return { valid: true, normalized: cleaned };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405, headers: corsHeaders });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Payload JSON invalide", { status: 400, headers: corsHeaders });
  }

  const { event_type, title, body, target_user_ids, link } = payload;

  if (!event_type || !title || !body || !target_user_ids || !Array.isArray(target_user_ids)) {
    return new Response("Paramètres requis manquants", { status: 400, headers: corsHeaders });
  }

  const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
  if (!MESSENGER360_API_KEY) {
    console.error("MESSENGER360_API_KEY not configured");
    return new Response("MESSENGER360_API_KEY not configured", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  

  console.log(`[send-work-notification] event=${event_type}, targets=${target_user_ids.length}`);

  const { data: users, error: fetchError } = await supabase
    .from("profiles")
    .select("id, phone, full_name")
    .in("id", target_user_ids);

  if (fetchError || !users) {
    console.error("Error fetching profiles:", fetchError?.message);
    return new Response("Erreur récupération profils: " + fetchError?.message, {
      status: 500, headers: corsHeaders,
    });
  }

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.phone) {
      console.log(`[skip] user ${user.id}: no phone`);
      continue;
    }

    const { valid, normalized, error: normError } = normalizeCIPhone(user.phone);
    if (!valid) {
      console.log(`[skip] user ${user.id}: ${normError}`);
      await supabase.from("work_notification_logs").insert([{
        event_type, recipient_user_id: user.id, recipient_phone: user.phone,
        message: `${title}\n${body}`, link, status: "error",
        error_message: normError || "Numéro invalide", provider: "manychat",
      }]);
      failed++;
      continue;
    }

    // Deduplication: skip if same event+user within 60s
    const { count } = await supabase
      .from("work_notification_logs")
      .select("*", { count: "exact", head: true })
      .eq("event_type", event_type)
      .eq("recipient_user_id", user.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());

    if ((count ?? 0) > 0) {
      console.log(`[skip] user ${user.id}: deduplicated`);
      continue;
    }

    const message = `EasyFlows: ${title}.\n${body}\nConsultez: ${link ?? ""}`;
    const firstName = user.full_name?.split(" ")[0] || "Équipe";

    const sendResult = await sendViaManyChat(
      normalized, message, MANYCHAT_API_KEY, supabase,
      firstName, MANYCHAT_FLOW_NS || undefined
    );

    const status = sendResult.ok ? "success" : "error";
    const errorMessage = sendResult.ok ? "" : (sendResult.data?.message || "Envoi échoué");

    console.log(`[${status}] ${normalized}: ${errorMessage || "OK"}`);

    await supabase.from("work_notification_logs").insert([{
      event_type, recipient_user_id: user.id, recipient_phone: normalized,
      message, link, status, error_message: errorMessage, provider: "manychat",
    }]);

    if (sendResult.ok) sent++;
    else failed++;

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[send-work-notification] Done: ${sent} sent, ${failed} failed`);

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
