import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledFollowup {
  id: string;
  order_id: string;
  client_id: string;
  scheduled_at: string;
  followup_type: string;
  sms_content: string | null;
  attempts: number;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const messenger360ApiKey = Deno.env.get("MESSENGER360_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing scheduled followups...");

    // Get all pending followups that are due
    const now = new Date().toISOString();
    const { data: followups, error: followupsError } = await supabase
      .from("scheduled_followups")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .lt("attempts", 3);

    if (followupsError) {
      console.error("Error fetching followups:", followupsError);
      throw followupsError;
    }

    console.log(`Found ${followups?.length || 0} followups to process`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    if (!followups || followups.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No followups to process",
          results 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const followup of followups as ScheduledFollowup[]) {
      try {
        // Get client info
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("id, full_name, phone")
          .eq("id", followup.client_id)
          .single();

        if (clientError || !client) {
          console.error(`Client not found for followup ${followup.id}`);
          results.skipped++;
          continue;
        }

        // Get order info
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, order_number, status, total_amount")
          .eq("id", followup.order_id)
          .single();

        if (orderError || !order) {
          console.error(`Order not found for followup ${followup.id}`);
          results.skipped++;
          continue;
        }

        // Skip if order is already delivered or confirmed
        if (order.status === "delivered" || order.status === "confirmed") {
          await supabase
            .from("scheduled_followups")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", followup.id);
          results.skipped++;
          continue;
        }

        // Prepare SMS content
        const smsContent = followup.sms_content || generateDefaultMessage(client as Client, order as Order);

        // Send SMS if API key is available
        if (messenger360ApiKey && followup.followup_type === "sms") {
          const smsSent = await sendSMS(messenger360ApiKey, client.phone, smsContent);
          
          if (smsSent) {
            await supabase
              .from("scheduled_followups")
              .update({
                status: "sent",
                last_attempt_at: new Date().toISOString(),
                attempts: followup.attempts + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", followup.id);

            // Log the SMS in campaign_logs if needed
            await supabase.from("campaign_logs").insert({
              phone_number: client.phone,
              message_content: smsContent,
              status: "sent",
              sent_at: new Date().toISOString(),
            });

            results.sent++;
          } else {
            await supabase
              .from("scheduled_followups")
              .update({
                last_attempt_at: new Date().toISOString(),
                attempts: followup.attempts + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", followup.id);
            results.failed++;
          }
        } else {
          // For call followups, just mark as sent (notifies the caller)
          await supabase
            .from("scheduled_followups")
            .update({
              status: "sent",
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", followup.id);
          results.sent++;
        }

        results.processed++;
      } catch (err) {
        console.error(`Error processing followup ${followup.id}:`, err);
        results.failed++;
      }
    }

    console.log("Followup processing complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-auto-followups:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateDefaultMessage(client: Client, order: Order): string {
  return `Bonjour ${client.full_name}, nous vous recontactons concernant votre commande ${order.order_number} d'un montant de ${order.total_amount} FCFA. Merci de nous confirmer votre disponibilité pour la livraison. Cordialement.`;
}

async function sendSMS(apiKey: string, phone: string, message: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.messenger360.net/api/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error("SMS API error:", await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("SMS send error:", err);
    return false;
  }
}
