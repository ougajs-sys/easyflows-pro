// Edge Function: send-work-notification
// Notifications métier WhatsApp Messenger360 pour Easyflows Pro

import { serve } from "std/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

function normalizeCIPhone(raw: string): string {
  // Normalisation du numéro Côte d'Ivoire pour Messenger360 : 225XXXXXXXXXX (sans +)
  const digits = raw.replace(/[^0-9]/g, "")
  if (digits.startsWith("225")) return digits
  if (digits.length === 8) return "225" + digits
  if (digits.length === 10 && digits.startsWith("07")) return "225" + digits
  // À améliorer si besoin selon les formats rencontrés
  return digits
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 })
  }

  let payload
  try {
    payload = await req.json()
  } catch {
    return new Response("Payload JSON invalide", { status: 400 })
  }

  const { event_type, title, body, target_user_ids, link } = payload

  if (!event_type || !title || !body || !target_user_ids || !Array.isArray(target_user_ids)) {
    return new Response("Paramètres requis manquants", { status: 400 })
  }

  // Récupération des profils cibles
  const { data: users, error: fetchError } = await supabase
    .from("profiles")
    .select("id, phone")
    .in("id", target_user_ids)

  if (fetchError || !users) {
    return new Response("Erreur récupération profils: " + `${fetchError?.message}`, { status: 500 })
  }

  for (const user of users) {
    if (!user.phone) continue
    const recipient_phone = normalizeCIPhone(user.phone)

    // Déduplication : vérifie s'il y a déjà eu la même notif sur ce user et cet event_type <60s
    const { count = 0 } = await supabase
      .from("work_notification_logs")
      .select("*", { count: "exact", head: true })
      .eq("event_type", event_type)
      .eq("recipient_user_id", user.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString())

    if (count > 0) {
      // Déjà notifié
      continue
    }

    const message =
      `EasyFlows: ${title}.
${body}
Consultez: ${link ?? ''}`

    // Envoi Messenger360 : POST {phone, message} avec autorisation (clé déjà configurée)
    let status = "success"
    let error_message = ""

    try {
      const resp = await fetch("https://messenger360/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("MESSENGER360_API_KEY")!,
        },
        body: JSON.stringify({
          to: recipient_phone,
          message,
        }),
      })
      if (!resp.ok) {
        status = "error"
        error_message = `HTTP ${resp.status}`
      }
    } catch (err) {
      status = "error"
      error_message = err?.toString?.() ?? "send error"
    }

    // Log dans work_notification_logs
    await supabase.from("work_notification_logs").insert([{ 
      event_type,
      recipient_user_id: user.id,
      recipient_phone,
      message,
      link,
      status,
      error_message,
      provider: "messenger360"
    }])
  }
  return new Response("OK", { status: 200 })
})
