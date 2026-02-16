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
    const BATCH_SIZE = 500;

    for (const campaign of scheduledCampaigns || []) {
      console.log(`Processing campaign: ${campaign.name} (${campaign.id})`);

      try {
        // Get all clients (paginated to bypass 1000 row limit)
        let allClients: { id: string; phone: string }[] = [];
        let from = 0;
        const pageSize = 1000;

        while (true) {
          let clientsQuery = supabase.from("clients").select("id, phone").range(from, from + pageSize - 1);
          if (campaign.segment && campaign.segment !== 'all') {
            clientsQuery = clientsQuery.eq("segment", campaign.segment);
          }
          const { data: clients, error: clientsError } = await clientsQuery;
          if (clientsError) throw clientsError;
          if (!clients || clients.length === 0) break;
          allClients = allClients.concat(clients);
          if (clients.length < pageSize) break;
          from += pageSize;
        }

        if (allClients.length === 0) {
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
          total_recipients: allClients.length,
        }).eq("id", campaign.id);

        // Send in batches using service role key for auth bypass
        const phones = allClients.map(c => c.phone);
        let totalSent = 0;
        let totalFailed = 0;

        for (let i = 0; i < phones.length; i += BATCH_SIZE) {
          const batch = phones.slice(i, i + BATCH_SIZE);
          
          const { data, error } = await supabase.functions.invoke("send-sms", {
            body: {
              campaign_id: campaign.id,
              phones: batch,
              message: campaign.message,
              type: campaign.type,
            },
          });

          if (error) {
            console.error(`Batch failed:`, error);
            totalFailed += batch.length;
          } else if (data) {
            totalSent += data.sent || 0;
            totalFailed += data.failed || 0;
          }
        }

        // Final update
        await supabase.from("campaigns").update({
          sent_count: totalSent,
          failed_count: totalFailed,
          status: "completed",
          sent_at: new Date().toISOString(),
        }).eq("id", campaign.id);

        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: "processed",
          recipients: allClients.length,
          sent: totalSent,
          failed: totalFailed,
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
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
