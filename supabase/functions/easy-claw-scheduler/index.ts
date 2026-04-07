import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Easy-Claw] Starting autonomous analysis...");

    // ── 1. Collect all data ──
    const [
      ordersResult,
      productsResult,
      clientsResult,
      campaignsResult,
      recentProposalsResult,
    ] = await Promise.all([
      supabase.from("orders").select("id, status, client_id, product_id, quantity, total_amount, created_at, cancellation_reason, report_reason, delivery_person_id")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, stock, price, is_active"),
      supabase.from("clients").select("id, full_name, phone, segment, total_orders, total_spent, phone_normalized")
        .order("total_spent", { ascending: false }).limit(500),
      supabase.from("campaigns").select("id, name, status, sent_at, category, total_recipients")
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("ai_campaign_proposals").select("id, target_segment, campaign_type, status, created_at")
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const orders = ordersResult.data || [];
    const products = productsResult.data || [];
    const clients = clientsResult.data || [];
    const campaigns = campaignsResult.data || [];
    const recentProposals = recentProposalsResult.data || [];

    // ── 2. Calculate conversion funnel ──
    const totalOrders = orders.length;
    const byStatus: Record<string, number> = {};
    orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

    const confirmed = (byStatus["confirmed"] || 0) + (byStatus["in_transit"] || 0) + (byStatus["delivered"] || 0);
    const delivered = byStatus["delivered"] || 0;
    const cancelled = byStatus["cancelled"] || 0;
    const reported = byStatus["reported"] || 0;
    const pending = byStatus["pending"] || 0;

    const confirmRate = totalOrders > 0 ? Math.round((confirmed / totalOrders) * 100) : 0;
    const deliveryRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;
    const cancelRate = totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0;

    // Per-product breakdown
    const productStats: Record<string, { name: string; total: number; confirmed: number; delivered: number; cancelled: number; reported: number }> = {};
    for (const p of products) {
      productStats[p.id] = { name: p.name, total: 0, confirmed: 0, delivered: 0, cancelled: 0, reported: 0 };
    }
    for (const o of orders) {
      if (o.product_id && productStats[o.product_id]) {
        const ps = productStats[o.product_id];
        ps.total++;
        if (["confirmed", "in_transit", "delivered"].includes(o.status)) ps.confirmed++;
        if (o.status === "delivered") ps.delivered++;
        if (o.status === "cancelled") ps.cancelled++;
        if (o.status === "reported") ps.reported++;
      }
    }

    // Cancelled orders with client info (recovery targets)
    const cancelledOrders = orders.filter(o => o.status === "cancelled");
    const cancelledClientIds = [...new Set(cancelledOrders.map(o => o.client_id))];
    
    // Clients who cancelled but never had a delivered order
    const deliveredClientIds = new Set(orders.filter(o => o.status === "delivered").map(o => o.client_id));
    const recoveryTargets = cancelledClientIds.filter(cid => !deliveredClientIds.has(cid));

    // Inactive clients (ordered before but not in last 30 days)
    const activeClientIds = new Set(orders.map(o => o.client_id));
    const inactiveClients = clients.filter(c => c.total_orders > 0 && !activeClientIds.has(c.id));

    // Check if we already proposed something similar recently (last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const recentPendingProposals = recentProposals.filter(
      p => p.status === "pending" && p.created_at > threeDaysAgo
    );

    if (recentPendingProposals.length >= 2) {
      console.log("[Easy-Claw] Already 2+ pending proposals in last 3 days, skipping.");
      return new Response(JSON.stringify({ skipped: true, reason: "Recent proposals pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Ask AI to generate proposal ──
    const productBreakdown = Object.values(productStats)
      .filter(ps => ps.total > 0)
      .map(ps => `- ${ps.name}: ${ps.total} commandes, ${ps.confirmed} confirmées, ${ps.delivered} livrées, ${ps.cancelled} annulées, ${ps.reported} reportées`)
      .join("\n");

    const analysisPrompt = `Tu es Easy-Claw, l'expert marketing autonome d'EasyFlows. Analyse ces données et propose UNE campagne marketing pertinente.

DONNÉES DES 30 DERNIERS JOURS:
- ${totalOrders} commandes totales
- Taux de confirmation: ${confirmRate}%
- Taux de livraison: ${deliveryRate}%
- Taux d'annulation: ${cancelRate}%
- ${pending} commandes en attente
- ${reported} commandes reportées

PAR PRODUIT:
${productBreakdown || "Aucune donnée produit"}

CIBLES POTENTIELLES:
- ${recoveryTargets.length} clients ayant annulé sans jamais recevoir de livraison (récupération)
- ${inactiveClients.length} clients inactifs depuis 30+ jours (réactivation)
- ${clients.filter(c => c.segment === "vip").length} clients VIP (fidélisation)

CAMPAGNES RÉCENTES:
${campaigns.slice(0, 5).map(c => `- ${c.name} (${c.status}, ${c.total_recipients || 0} destinataires)`).join("\n") || "Aucune"}

RÈGLES:
1. Propose UNE SEULE campagne, la plus impactante
2. Le message doit être en français, court (max 160 car pour SMS/WhatsApp)
3. Inclure {nom} comme placeholder pour le prénom du client
4. Cible un segment précis, pas "tous les clients"
5. Justifie avec les chiffres`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu es Easy-Claw, expert marketing. Réponds UNIQUEMENT via le tool propose_campaign." },
          { role: "user", content: analysisPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_campaign",
            description: "Propose une campagne marketing basée sur l'analyse des données",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titre court de la campagne (ex: 'Récupération clients annulés LB10+')" },
                analysis: { type: "string", description: "Analyse des données qui justifie cette campagne (2-3 phrases)" },
                target_segment: { type: "string", description: "Segment cible (ex: 'cancelled_no_delivery', 'inactive_30d', 'vip')" },
                target_count: { type: "number", description: "Nombre estimé de destinataires" },
                campaign_type: { type: "string", enum: ["recovery", "reactivation", "loyalty", "promotion"], description: "Type de campagne" },
                channel: { type: "string", enum: ["whatsapp", "sms"], description: "Canal préféré" },
                proposed_message: { type: "string", description: "Message SMS/WhatsApp proposé (max 160 car, inclure {nom})" },
              },
              required: ["title", "analysis", "target_segment", "target_count", "campaign_type", "channel", "proposed_message"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_campaign" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[Easy-Claw] AI error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("[Easy-Claw] No tool call in AI response");
      throw new Error("AI did not return a proposal");
    }

    const proposal = JSON.parse(toolCall.function.arguments);
    console.log("[Easy-Claw] Proposal generated:", proposal.title);

    // ── 4. Save proposal ──
    const { data: savedProposal, error: saveError } = await supabase
      .from("ai_campaign_proposals")
      .insert({
        title: proposal.title,
        analysis: proposal.analysis,
        target_segment: proposal.target_segment,
        target_count: proposal.target_count,
        campaign_type: proposal.campaign_type,
        channel: proposal.channel,
        proposed_message: proposal.proposed_message,
        status: "pending",
      })
      .select()
      .single();

    if (saveError) {
      console.error("[Easy-Claw] Save error:", saveError);
      throw saveError;
    }

    // ── 5. Notify admins/supervisors via internal DM + WhatsApp ──
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["administrateur", "superviseur"])
      .eq("confirmed", true);

    const targetUserIds = adminUsers?.map(u => u.user_id) || [];

    if (targetUserIds.length > 0) {
      const notifMessage = `🤖 Easy-Claw — Nouvelle proposition de campagne\n\n📌 ${proposal.title}\n📊 ${proposal.analysis}\n👥 ${proposal.target_count} clients ciblés\n💬 "${proposal.proposed_message}"\n\n👉 Allez dans Agent IA > Propositions pour approuver ou rejeter.`;

      // Send internal DMs
      const dmInserts = targetUserIds.map((uid: string) => ({
        sender_id: targetUserIds[0], // System message from first admin
        receiver_id: uid,
        content: notifMessage,
        channel: "direct",
        message_type: "system",
      }));

      await supabase.from("messages").insert(dmInserts);

      // Send WhatsApp notifications via send-work-notification
      try {
        const workNotifUrl = `${supabaseUrl}/functions/v1/send-work-notification`;
        await fetch(workNotifUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            event_type: "easy_claw_proposal",
            title: "Easy-Claw: Nouvelle proposition",
            body: `${proposal.title}\n${proposal.target_count} clients ciblés.\nMessage: "${proposal.proposed_message.substring(0, 80)}..."`,
            target_user_ids: targetUserIds,
            link: "/ai-agent",
          }),
        });
        console.log("[Easy-Claw] WhatsApp notifications sent to", targetUserIds.length, "users");
      } catch (whatsappErr) {
        console.warn("[Easy-Claw] WhatsApp notification failed:", whatsappErr);
      }

      console.log("[Easy-Claw] Notifications sent to", targetUserIds.length, "admins/supervisors");
    }

    return new Response(JSON.stringify({
      success: true,
      proposal_id: savedProposal.id,
      title: proposal.title,
      target_count: proposal.target_count,
      notified: targetUserIds.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Easy-Claw] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Easy-Claw scheduler error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
