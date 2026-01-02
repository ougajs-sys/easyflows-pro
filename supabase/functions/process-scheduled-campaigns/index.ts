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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for scheduled campaigns...");

    // Find campaigns that are scheduled and due to be sent
    const now = new Date().toISOString();
    const { data: scheduledCampaigns, error: fetchError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${scheduledCampaigns?.length || 0} campaigns to process`);

    const results = [];

    for (const campaign of scheduledCampaigns || []) {
      console.log(`Processing campaign: ${campaign.name} (${campaign.id})`);

      try {
        // Get clients based on segment
        let clientsQuery = supabase.from("clients").select("id, phone");
        
        if (campaign.segment && campaign.segment !== 'all') {
          clientsQuery = clientsQuery.eq("segment", campaign.segment);
        }

        const { data: clients, error: clientsError } = await clientsQuery;
        
        if (clientsError) {
          throw clientsError;
        }

        if (!clients || clients.length === 0) {
          console.log(`No clients found for campaign ${campaign.id}`);
          await supabase.from("campaigns").update({
            status: "completed",
            sent_at: now,
            total_recipients: 0,
          }).eq("id", campaign.id);
          continue;
        }

        // Update status to sending
        await supabase.from("campaigns").update({
          status: "sending",
          total_recipients: clients.length,
        }).eq("id", campaign.id);

        // Call send-sms function
        const phones = clients.map(c => c.phone);
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: {
            campaign_id: campaign.id,
            phones,
            message: campaign.message,
            type: campaign.type,
          },
        });

        if (error) {
          throw error;
        }

        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: "processed",
          recipients: clients.length,
          ...data,
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
        // Mark campaign as failed
        await supabase.from("campaigns").update({
          status: "cancelled",
        }).eq("id", campaign.id);

        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return new Response(JSON.stringify({ 
      processed: results.length,
      results 
    }), {
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
