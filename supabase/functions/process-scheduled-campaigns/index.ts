import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for scheduled campaigns...");

    const now = new Date().toISOString();
    const { data: scheduledCampaigns, error: fetchError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) throw fetchError;

    console.log(`Found ${scheduledCampaigns?.length || 0} campaigns to process`);

    const results = [];

    for (const campaign of scheduledCampaigns || []) {
      console.log(`Delegating campaign: ${campaign.name} (${campaign.id}) to send-campaign`);

      try {
        // Delegate to send-campaign edge function which handles all segment resolution,
        // phone validation, throttling, and status updates
        const { data, error } = await supabase.functions.invoke("send-campaign", {
          body: { campaign_id: campaign.id },
        });

        if (error) {
          console.error(`send-campaign invocation failed for ${campaign.id}:`, error);
          await supabase.from("campaigns").update({ status: "cancelled" }).eq("id", campaign.id);
          results.push({
            campaign_id: campaign.id,
            name: campaign.name,
            status: "failed",
            error: error.message,
          });
        } else {
          results.push({
            campaign_id: campaign.id,
            name: campaign.name,
            status: "processed",
            sent: data?.sent || 0,
            failed: data?.failed || 0,
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing campaign ${campaign.id}:`, error);
        await supabase.from("campaigns").update({ status: "cancelled" }).eq("id", campaign.id);
        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-scheduled-campaigns:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
