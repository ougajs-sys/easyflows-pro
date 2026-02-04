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
    const MESSENGER360_API_KEY = Deno.env.get("MESSENGER360_API_KEY");
    if (!MESSENGER360_API_KEY) {
      throw new Error("MESSENGER360_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, phones, message, type }: SendSmsRequest = await req.json();

    console.log(`Sending ${type} to ${phones.length} recipients`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send messages to each phone
    for (const phone of phones) {
      try {
        // Clean phone number for 360Messenger (without +)
        const cleanPhone = phone
          .replace(/\s+/g, "")      // Remove spaces
          .replace(/-/g, "")        // Remove dashes
          .replace(/^\+/, "")       // Remove leading +
          .replace(/^0/, "212");    // Replace leading 0 with 212 (Morocco)
        
        console.log(`Sending ${type} to ${cleanPhone}`);
        
        // 360Messenger API call
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
        console.log(`Response for ${cleanPhone}:`, responseData);

        if (response.ok) {
          results.sent++;
          
          // Log success if campaign_id provided
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
          
          // Log failure if campaign_id provided
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

    // Update campaign stats if campaign_id provided
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
