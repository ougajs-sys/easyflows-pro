import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_id?: string;
  user_ids?: string[];
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    webpush?: {
      fcm_options?: {
        link?: string;
      };
    };
  };
}

/**
 * Get OAuth2 access token for FCM HTTP v1 API using Service Account
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Create JWT header
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  // Create JWT claims
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  };

  // Encode header and claims
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  // Create signature input
  const signatureInput = `${encodedHeader}.${encodedClaims}`;

  // Import private key
  const privateKey = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length
  ).trim();

  // Decode base64 private key
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Import the key
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

  // Sign the JWT
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  // Encode signature
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Create final JWT
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Send push notification using FCM HTTP v1 API
 */
async function sendFCMNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // Convert data to string values (FCM requirement)
  const fcmData: Record<string, string> = {};
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      fcmData[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }

  const message: FCMMessage = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: fcmData,
      webpush: {
        fcm_options: {
          link: data?.link || "/",
        },
      },
    },
  };

  try {
    const response = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`FCM error for token ${token.substring(0, 20)}...: ${error}`);
      return { success: false, error: error };
    }

    const result = await response.json();
    console.log(`FCM success for token ${token.substring(0, 20)}...: ${result.name}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Exception sending to token ${token.substring(0, 20)}...: ${error.message}`);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get FCM credentials from environment
    const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");

    if (!FCM_SERVICE_ACCOUNT_JSON || !FCM_PROJECT_ID) {
      throw new Error("FCM credentials not configured. Please set FCM_SERVICE_ACCOUNT_JSON and FCM_PROJECT_ID in Supabase secrets.");
    }

    // Parse service account JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      throw new Error("Invalid FCM_SERVICE_ACCOUNT_JSON format");
    }

    // Use project_id from service account if FCM_PROJECT_ID not set
    const projectId = FCM_PROJECT_ID || serviceAccount.project_id;
    if (!projectId) {
      throw new Error("FCM project ID not found in secrets or service account JSON");
    }

    // Parse request body
    const { user_id, user_ids, tokens: providedTokens, title, body, data }: PushNotificationRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve tokens: either provided directly or fetched from user_ids
    let tokens: string[] = providedTokens || [];

    // Collect all target user IDs
    const targetUserIds: string[] = [];
    if (user_ids && user_ids.length > 0) {
      targetUserIds.push(...user_ids);
    }
    if (user_id) {
      targetUserIds.push(user_id);
    }

    // Fetch tokens from database for user_ids
    if (targetUserIds.length > 0 && tokens.length === 0) {
      const { data: tokenRecords, error: tokenError } = await supabase
        .from("user_push_tokens")
        .select("token")
        .in("user_id", targetUserIds)
        .eq("is_enabled", true);

      if (tokenError) {
        console.error("Error fetching tokens:", tokenError);
      } else if (tokenRecords) {
        tokens = tokenRecords.map((r: any) => r.token);
      }
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: { sent: 0, failed: 0, errors: [], message: "No tokens found" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notification to ${tokens.length} token(s)`);

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);

    // Send to all tokens
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const token of tokens) {
      const result = await sendFCMNotification(
        accessToken,
        projectId,
        token,
        title,
        body,
        data
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(result.error);
          
          // If token is invalid, remove it from database
          if (result.error.includes("INVALID_ARGUMENT") || result.error.includes("NOT_FOUND")) {
            console.log(`Removing invalid token: ${token.substring(0, 20)}...`);
            await supabase
              .from("user_push_tokens")
              .delete()
              .eq("token", token);
          }
        }
      }
    }

    console.log(`Push notification results: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
