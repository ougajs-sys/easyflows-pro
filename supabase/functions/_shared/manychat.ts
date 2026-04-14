import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MANYCHAT_API_BASE = "https://api.manychat.com/fb";

interface ManyChatResult {
  ok: boolean;
  data: any;
  subscriber_id?: string;
}

/**
 * Get or create a ManyChat subscriber for a WhatsApp phone number.
 * Uses the manychat_subscribers table as a cache to avoid redundant API calls.
 */
async function getOrCreateSubscriber(
  phone: string,
  apiKey: string,
  supabase: ReturnType<typeof createClient>,
  firstName?: string
): Promise<{ ok: boolean; subscriber_id?: string; error?: string }> {
  // 1. Check cache first
  const { data: cached } = await supabase
    .from("manychat_subscribers")
    .select("subscriber_id")
    .eq("phone", phone)
    .maybeSingle();

  if (cached?.subscriber_id) {
    return { ok: true, subscriber_id: cached.subscriber_id };
  }

  // 2. Create subscriber via ManyChat API
  const phoneWithPlus = "+" + phone;
  try {
    const response = await fetch(`${MANYCHAT_API_BASE}/subscriber/createSubscriber`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        whatsapp_phone: phoneWithPlus,
        first_name: firstName || "Client",
        consent_phrase: "opt-in",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If subscriber already exists, try to find them
      if (data?.message?.includes("already exists") || response.status === 400) {
        const findResponse = await fetch(
          `${MANYCHAT_API_BASE}/subscriber/findBySystemField`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              field_name: "whatsapp_phone",
              field_value: phoneWithPlus,
            }),
          }
        );
        const findData = await findResponse.json();
        
        if (findResponse.ok && findData?.data?.id) {
          const subscriberId = String(findData.data.id);
          // Cache it
          await supabase.from("manychat_subscribers").upsert(
            { phone, subscriber_id: subscriberId },
            { onConflict: "phone" }
          );
          return { ok: true, subscriber_id: subscriberId };
        }
      }
      return { ok: false, error: data?.message || JSON.stringify(data) };
    }

    const subscriberId = String(data?.data?.id || data?.data?.subscriber_id);
    if (!subscriberId || subscriberId === "undefined") {
      return { ok: false, error: "No subscriber_id in response: " + JSON.stringify(data) };
    }

    // Cache the mapping
    await supabase.from("manychat_subscribers").upsert(
      { phone, subscriber_id: subscriberId },
      { onConflict: "phone" }
    );

    return { ok: true, subscriber_id: subscriberId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "createSubscriber failed",
    };
  }
}

/**
 * Send a WhatsApp message via ManyChat API.
 * 1. Get or create subscriber
 * 2. Send content via sendContent (free text within 24h window)
 * 3. If that fails, fallback to sendFlow (template-based, works outside 24h)
 */
export async function sendViaManyChat(
  phone: string,
  message: string,
  apiKey: string,
  supabase: ReturnType<typeof createClient>,
  firstName?: string,
  flowNs?: string
): Promise<ManyChatResult> {
  // Step 1: Get or create subscriber
  const subResult = await getOrCreateSubscriber(phone, apiKey, supabase, firstName);
  if (!subResult.ok || !subResult.subscriber_id) {
    return {
      ok: false,
      data: { message: "Failed to create subscriber: " + (subResult.error || "unknown") },
    };
  }

  const subscriberId = subResult.subscriber_id;

  // Step 2: Try sendContent (free text - works within 24h window)
  try {
    const contentResponse = await fetch(`${MANYCHAT_API_BASE}/sending/sendContent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: parseInt(subscriberId, 10),
        data: {
          version: "v2",
          content: {
            type: "whatsapp",
            messages: [{ type: "text", text: message }],
          },
        },
      }),
    });

    const contentData = await contentResponse.json();

    if (contentResponse.ok && contentData?.status === "success") {
      return { ok: true, data: contentData, subscriber_id: subscriberId };
    }

    console.log(
      `sendContent failed for ${phone} (${contentResponse.status}): ${JSON.stringify(contentData)}`
    );

    // Step 3: Fallback to sendFlow (template) if configured
    if (flowNs) {
      try {
        const flowResponse = await fetch(`${MANYCHAT_API_BASE}/sending/sendFlow`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriber_id: parseInt(subscriberId, 10),
            flow_ns: flowNs,
            // Pass the message as an external field so the flow template can use it
            external_fields: [
              { field_name: "message_text", field_value: message },
            ],
          }),
        });

        const flowData = await flowResponse.json();

        if (flowResponse.ok && flowData?.status === "success") {
          return { ok: true, data: flowData, subscriber_id: subscriberId };
        }

        return {
          ok: false,
          data: {
            message: `sendFlow failed: ${flowData?.message || JSON.stringify(flowData)}`,
          },
        };
      } catch (flowErr) {
        return {
          ok: false,
          data: {
            message: `sendFlow error: ${flowErr instanceof Error ? flowErr.message : "unknown"}`,
          },
        };
      }
    }

    // No flow fallback configured
    return {
      ok: false,
      data: {
        message: contentData?.message || `sendContent failed (${contentResponse.status})`,
      },
    };
  } catch (err) {
    return {
      ok: false,
      data: {
        message: err instanceof Error ? err.message : "sendContent request failed",
      },
    };
  }
}
