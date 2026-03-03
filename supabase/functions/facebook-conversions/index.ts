import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      pixel_id,
      event_name,
      event_id,
      value,
      currency,
      client_user_agent,
      source_url,
    } = await req.json();

    if (!pixel_id || !event_name) {
      return new Response(
        JSON.stringify({ error: "pixel_id and event_name required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("FACEBOOK_ACCESS_TOKEN");
    if (!accessToken) {
      console.warn("FACEBOOK_ACCESS_TOKEN not configured, skipping CAPI");
      return new Response(
        JSON.stringify({ warning: "CAPI not configured, event skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "";

    const eventData = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      event_source_url: source_url,
      action_source: "website",
      user_data: {
        client_ip_address: clientIp,
        client_user_agent: client_user_agent || "",
      },
      custom_data: {
        value,
        currency: currency || "XOF",
      },
    };

    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pixel_id}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [eventData],
          access_token: accessToken,
        }),
      }
    );

    const fbResult = await fbResponse.json();
    console.log("Facebook CAPI response:", JSON.stringify(fbResult));

    return new Response(JSON.stringify({ success: true, fb_response: fbResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Facebook CAPI error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
