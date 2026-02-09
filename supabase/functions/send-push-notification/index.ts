import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Get OAuth 2.0 access token for Firebase Cloud Messaging
async function getAccessToken(serviceAccount: any): Promise<string> {
  // Helper function for base64url encoding
  const base64url = (str: string): string => {
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const jwtHeader = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  
  const jwtClaimSetEncoded = base64url(JSON.stringify(jwtClaimSet));
  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
  
  // Import private key
  const privateKey = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );
  
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  
  const jwt = `${signatureInput}.${signature}`;
  
  // Exchange JWT for access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Send push notification via Firebase Cloud Messaging HTTP v1
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  accessToken: string,
  projectId: string
): Promise<void> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  const message = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: data,
      webpush: {
        fcm_options: {
          link: data.link || "/",
        },
      },
    },
  };
  
  const response = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM request failed: ${errorText}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
    
    if (!FCM_SERVICE_ACCOUNT_JSON || !FCM_PROJECT_ID) {
      throw new Error("FCM credentials not configured. Set FCM_SERVICE_ACCOUNT_JSON and FCM_PROJECT_ID environment variables.");
    }

    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, title, body, data }: PushNotificationRequest = await req.json();

    console.log(`Sending push notification to user ${user_id}`);

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("token")
      .eq("user_id", user_id)
      .eq("is_enabled", true);

    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens found for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: "No push tokens found for user" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get OAuth access token
    const accessToken = await getAccessToken(serviceAccount);

    // Send notification to all user's tokens
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const tokenRecord of tokens) {
      try {
        await sendFCMNotification(
          tokenRecord.token,
          title,
          body,
          data || {},
          accessToken,
          FCM_PROJECT_ID
        );
        
        results.sent++;
        
        // Log success
        await supabase.from("push_log").insert({
          user_id: user_id,
          notification_type: data?.type || "general",
          title: title,
          body: body,
          data: data || {},
          delivery_status: "sent",
        });
        
        console.log(`Push notification sent successfully to token ${tokenRecord.token.substring(0, 20)}...`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to send to token ${tokenRecord.token.substring(0, 20)}...:`, error);
        results.failed++;
        results.errors.push(errorMessage);
        
        // Log failure
        await supabase.from("push_log").insert({
          user_id: user_id,
          notification_type: data?.type || "general",
          title: title,
          body: body,
          data: data || {},
          delivery_status: "failed",
          error_message: errorMessage,
        });
      }
    }

    console.log(`Push notification result: ${results.sent} sent, ${results.failed} failed`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
