import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIAction {
  action: string;
  params: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token for auth check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is supervisor or admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || !["superviseur", "administrateur"].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: "Access denied. Only supervisors and admins can use the AI agent." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instruction } = await req.json();
    if (!instruction) {
      return new Response(JSON.stringify({ error: "Instruction required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing instruction:", instruction);

    // Create instruction record
    const { data: instructionRecord, error: insertError } = await supabase
      .from("ai_instructions")
      .insert({
        instruction,
        instruction_type: "custom",
        status: "processing",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating instruction:", insertError);
      throw insertError;
    }

    // Get context data for AI
    const [ordersResult, callersResult, productsResult, clientsResult, followupsResult, deliveryPersonsResult, campaignsResult] = await Promise.all([
      supabase.from("orders").select("id, status, assigned_to, delivery_person_id, client_id, product_id, quantity, total_amount, created_at, delivery_address, clients(zone, full_name, segment)").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id, role").eq("role", "appelant").eq("confirmed", true),
      supabase.from("products").select("id, name, stock, price, is_active"),
      supabase.from("clients").select("id, full_name, phone, segment, total_orders, total_spent, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("follow_ups").select("id, client_id, order_id, status, scheduled_at, type").eq("status", "pending").limit(100),
      supabase.from("delivery_persons").select("id, user_id, status, is_active, zone, daily_deliveries").eq("is_active", true),
      supabase.from("campaigns").select("id, name, status, sent_count, total_recipients, sent_at, category").order("created_at", { ascending: false }).limit(20),
    ]);

    // Get caller and delivery person profiles
    const callerIds = callersResult.data?.map(c => c.user_id) || [];
    const deliveryUserIds = deliveryPersonsResult.data?.map(d => d.user_id) || [];
    const allUserIds = [...new Set([...callerIds, ...deliveryUserIds])];
    
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allUserIds);

    const contextData = {
      orders: ordersResult.data || [],
      callers: callersResult.data?.map(c => ({
        user_id: c.user_id,
        name: userProfiles?.find(p => p.id === c.user_id)?.full_name || "Appelant sans nom"
      })) || [],
      delivery_persons: deliveryPersonsResult.data?.map(d => ({
        id: d.id,
        user_id: d.user_id,
        name: userProfiles?.find(p => p.id === d.user_id)?.full_name || "Livreur sans nom",
        status: d.status,
        zone: d.zone,
        daily_deliveries: d.daily_deliveries,
      })) || [],
      products: productsResult.data || [],
      clients: clientsResult.data || [],
      pending_followups: followupsResult.data || [],
      campaigns: campaignsResult.data || [],
    };

    // Create lookup maps for name-to-id resolution
    const callerNameToId: Record<string, string> = {};
    const callerIdToName: Record<string, string> = {};
    contextData.callers.forEach(c => {
      callerNameToId[c.name.toLowerCase()] = c.user_id;
      callerIdToName[c.user_id] = c.name;
    });

    const deliveryNameToId: Record<string, string> = {};
    const deliveryIdToName: Record<string, string> = {};
    contextData.delivery_persons.forEach(d => {
      deliveryNameToId[d.name.toLowerCase()] = d.id;
      deliveryIdToName[d.id] = d.name;
    });

    // Calculate performance metrics
    const ordersByStatus = contextData.orders.reduce((acc, o) => { 
      acc[o.status] = (acc[o.status] || 0) + 1; 
      return acc; 
    }, {} as Record<string, number>);

    const deliveredOrders = ordersByStatus.delivered || 0;
    const totalOrders = contextData.orders.length;
    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
    
    const pendingOrders = ordersByStatus.pending || 0;
    const confirmedOrders = ordersByStatus.confirmed || 0;
    
    const lowStockProducts = contextData.products.filter(p => p.stock <= 10 && p.is_active);
    const criticalStockProducts = contextData.products.filter(p => p.stock <= 5 && p.is_active);
    
    // VIP and inactive clients
    const vipClients = contextData.clients.filter(c => c.segment === "vip");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get available delivery persons
    const availableDeliveryPersons = contextData.delivery_persons.filter(d => d.status === "available");
    
    const systemPrompt = `Tu es un assistant IA pour une boutique en ligne. Tu aides à gérer les commandes, les clients et l'équipe.

STYLE DE COMMUNICATION - TRÈS IMPORTANT:
- Parle simplement, comme à un collègue qui n'est pas technique
- Évite le jargon : pas de "KPI", "workflow", "optimisation", "processus"
- Commence TOUJOURS par le résultat ou la conclusion
- Donne des chiffres concrets : "8 sur 10" au lieu de "80%", "depuis une semaine" au lieu de "7 jours d'inactivité"
- Sois direct et humain : utilise "je", "tu", "on"
- Termine par une question ou une proposition d'action
- Si tu fais une action, dis simplement "C'est fait !" puis les détails

EXEMPLES DE BON STYLE:
❌ "Exécution de la requête de distribution initiée avec succès"
✅ "C'est fait ! J'ai réparti 15 commandes entre 3 appelants"

❌ "Analyse des KPIs de performance"
✅ "Voici comment va ta boutique"

❌ "Segment inactif détecté depuis 30 jours"
✅ "Ces clients n'ont pas commandé depuis un mois"

CONTEXTE ACTUEL DE LA BOUTIQUE:
- ${totalOrders} commandes récentes (${pendingOrders} en attente, ${confirmedOrders} confirmées, ${deliveredOrders} livrées)
- Taux de livraison : ${deliveryRate}% (${deliveredOrders} sur ${totalOrders})
- ${contextData.callers.length} appelants actifs
- ${contextData.delivery_persons.length} livreurs (${availableDeliveryPersons.length} disponibles)
- ${contextData.products.length} produits (${lowStockProducts.length} en stock bas, ${criticalStockProducts.length} critiques)
- ${contextData.clients.length} clients (${vipClients.length} VIP)
- ${contextData.pending_followups.length} relances en attente
- ${contextData.campaigns.length} campagnes récentes

APPELANTS ACTIFS:
${contextData.callers.length > 0 ? contextData.callers.map(c => `- ${c.name} (ID: ${c.user_id})`).join("\n") : "Aucun appelant actif"}

LIVREURS:
${contextData.delivery_persons.length > 0 ? contextData.delivery_persons.map(d => `- ${d.name} (statut: ${d.status === "available" ? "dispo" : d.status}, zone: ${d.zone || "non définie"}, ${d.daily_deliveries} livraisons aujourd'hui)`).join("\n") : "Aucun livreur configuré"}

PRODUITS EN STOCK BAS:
${lowStockProducts.length > 0 ? lowStockProducts.map(p => `- ${p.name}: ${p.stock} unités${p.stock <= 5 ? " ⚠️ CRITIQUE" : ""}`).join("\n") : "Tout va bien côté stock !"}

COMMANDES PAR STATUT:
${JSON.stringify(ordersByStatus)}

RÈGLES D'EXÉCUTION:
1. Pour distribuer des commandes aux appelants: utilise "distribute_orders"
2. Pour distribuer aux livreurs: utilise "distribute_to_delivery"
3. Pour créer des relances: utilise "create_followups"
4. Pour les alertes stock: utilise "stock_alerts"
5. Pour analyser les clients: utilise "client_analysis"
6. Pour proposer des campagnes marketing: utilise "analyze_marketing_opportunities" ou "generate_campaign"
7. Pour faire un diagnostic global: utilise "analyze_global_performance"
8. Utilise TOUJOURS les IDs UUID pour les assignations, pas les noms`;

    // Call Lovable AI with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: instruction },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "distribute_orders",
              description: "Répartit les commandes entre les appelants de manière équitable",
              parameters: {
                type: "object",
                properties: {
                  order_ids: { type: "array", items: { type: "string" }, description: "IDs des commandes à distribuer" },
                  caller_ids: { type: "array", items: { type: "string" }, description: "IDs des appelants" },
                  filter_status: { type: "string", description: "Filtrer par statut (pending, confirmed, etc.)" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "distribute_to_delivery",
              description: "Envoie les commandes confirmées aux livreurs disponibles",
              parameters: {
                type: "object",
                properties: {
                  order_ids: { type: "array", items: { type: "string" }, description: "IDs des commandes à distribuer" },
                  delivery_person_ids: { type: "array", items: { type: "string" }, description: "IDs des livreurs" },
                  zones: { type: "array", items: { type: "string" }, description: "Zones géographiques" },
                  only_available: { type: "boolean", description: "Seulement les livreurs disponibles" },
                  balance_by_workload: { type: "boolean", description: "Équilibrer selon la charge" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "create_followups",
              description: "Crée des relances automatiques pour les clients",
              parameters: {
                type: "object",
                properties: {
                  order_ids: { type: "array", items: { type: "string" }, description: "IDs des commandes" },
                  followup_type: { type: "string", enum: ["reminder", "partial_payment", "rescheduled", "retargeting"], description: "Type de relance" },
                  days_since_order: { type: "number", description: "Commandes de plus de X jours" },
                  filter_status: { type: "string", description: "Filtrer par statut" },
                },
                required: ["followup_type"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "stock_alerts",
              description: "Vérifie les niveaux de stock et crée des alertes si nécessaire",
              parameters: {
                type: "object",
                properties: {
                  threshold: { type: "number", description: "Seuil de stock bas" },
                  action: { type: "string", enum: ["list", "alert"], description: "Lister ou créer des alertes" },
                },
                required: ["threshold"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "client_analysis",
              description: "Analyse les clients par segment ou activité",
              parameters: {
                type: "object",
                properties: {
                  segment: { type: "string", enum: ["new", "regular", "vip", "inactive"], description: "Segment de clients" },
                  days_inactive: { type: "number", description: "Jours d'inactivité" },
                  min_orders: { type: "number", description: "Nombre minimum de commandes" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "analyze_marketing_opportunities",
              description: "Trouve des opportunités marketing: clients à relancer, campagnes à lancer",
              parameters: {
                type: "object",
                properties: {
                  focus: { type: "string", enum: ["inactive_clients", "vip_retention", "new_acquisition", "all"], description: "Type d'opportunité à chercher" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "generate_campaign",
              description: "Propose une campagne SMS personnalisée",
              parameters: {
                type: "object",
                properties: {
                  target_segment: { type: "string", description: "Segment cible (vip, inactive, new, all)" },
                  campaign_type: { type: "string", enum: ["reactivation", "promotion", "loyalty", "announcement"], description: "Type de campagne" },
                  include_message: { type: "boolean", description: "Générer un message SMS" },
                },
                required: ["target_segment", "campaign_type"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "analyze_global_performance",
              description: "Fait un diagnostic complet de la boutique avec score et recommandations",
              parameters: {
                type: "object",
                properties: {
                  include_team: { type: "boolean", description: "Inclure l'analyse de l'équipe" },
                  include_stock: { type: "boolean", description: "Inclure l'analyse du stock" },
                  include_clients: { type: "boolean", description: "Inclure l'analyse des clients" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "generate_action_plan",
              description: "Génère un plan d'action pour la journée ou la semaine",
              parameters: {
                type: "object",
                properties: {
                  period: { type: "string", enum: ["today", "week"], description: "Période du plan" },
                  priority_focus: { type: "string", enum: ["orders", "stock", "clients", "team", "all"], description: "Focus prioritaire" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "respond_text",
              description: "Répond avec un texte sans action particulière",
              parameters: {
                type: "object",
                properties: {
                  message: { type: "string", description: "Message de réponse" },
                },
                required: ["message"],
              },
            },
          },
        ],
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        await supabase.from("ai_instructions").update({ status: "failed", error_message: "Trop de demandes, réessaie dans quelques minutes" }).eq("id", instructionRecord.id);
        return new Response(JSON.stringify({ error: "Trop de demandes, réessaie dans quelques minutes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData));

    const message = aiData.choices?.[0]?.message;
    let resultMessage = "";
    let affectedCount = 0;
    const actions: AIAction[] = [];

    // Check for tool calls
    if (message?.tool_calls?.length > 0) {
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`Executing tool: ${functionName}`, args);
        actions.push({ action: functionName, params: args });

        switch (functionName) {
          case "distribute_orders": {
            let ordersToDistribute = contextData.orders;
            
            if (args.filter_status) {
              ordersToDistribute = ordersToDistribute.filter(o => o.status === args.filter_status);
            }
            
            if (args.order_ids?.length > 0) {
              ordersToDistribute = ordersToDistribute.filter(o => args.order_ids.includes(o.id));
            }
            
            // Filter unassigned orders
            ordersToDistribute = ordersToDistribute.filter(o => !o.assigned_to);
            
            // Resolve caller_ids
            let callerList = contextData.callers;
            if (args.caller_ids?.length > 0) {
              const resolvedIds = args.caller_ids.map((idOrName: string) => {
                if (idOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                  return idOrName;
                }
                return callerNameToId[idOrName.toLowerCase()] || idOrName;
              });
              callerList = contextData.callers.filter(c => resolvedIds.includes(c.user_id));
            }

            if (callerList.length === 0) {
              resultMessage = `Oups ! Je n'ai trouvé aucun appelant disponible. Il y a ${contextData.callers.length} appelant(s) enregistré(s): ${contextData.callers.map(c => c.name).join(", ") || "aucun"}`;
              break;
            }

            if (ordersToDistribute.length === 0) {
              resultMessage = "Tout est déjà assigné ! Il n'y a pas de commande en attente à distribuer.";
              break;
            }

            // Distribute orders evenly
            const distribution: Record<string, string[]> = {};
            callerList.forEach(c => { distribution[c.user_id] = []; });

            ordersToDistribute.forEach((order, index) => {
              const callerIndex = index % callerList.length;
              const callerId = callerList[callerIndex].user_id;
              distribution[callerId].push(order.id);
            });

            // Update orders
            for (const [callerId, orderIds] of Object.entries(distribution)) {
              if (orderIds.length > 0) {
                await supabase
                  .from("orders")
                  .update({ assigned_to: callerId })
                  .in("id", orderIds);

                for (const orderId of orderIds) {
                  await supabase.from("ai_execution_logs").insert({
                    instruction_id: instructionRecord.id,
                    action_type: "assign_order",
                    entity_type: "order",
                    entity_id: orderId,
                    details: { assigned_to: callerId },
                  });
                }
              }
            }

            affectedCount = ordersToDistribute.length;
            const distributionSummary = callerList.map(c => 
              `- ${c.name}: ${distribution[c.user_id].length} commandes`
            ).join("\n");
            
            resultMessage = `C'est fait ! J'ai réparti ${affectedCount} commandes entre ${callerList.length} appelants:\n\n${distributionSummary}\n\nChacun peut commencer à appeler !`;
            break;
          }

          case "distribute_to_delivery": {
            let ordersToDistribute = contextData.orders.filter(o => 
              o.status === "confirmed" && !o.delivery_person_id
            );
            
            if (args.order_ids?.length > 0) {
              ordersToDistribute = ordersToDistribute.filter(o => args.order_ids.includes(o.id));
            }

            if (args.zones?.length > 0) {
              ordersToDistribute = ordersToDistribute.filter(o => {
                const clientZone = (o as any).clients?.zone;
                return clientZone && args.zones.includes(clientZone);
              });
            }

            let deliveryPersons = contextData.delivery_persons;
            
            if (args.only_available !== false) {
              deliveryPersons = deliveryPersons.filter(d => d.status === "available");
            }
            
            if (args.delivery_person_ids?.length > 0) {
              const resolvedIds = args.delivery_person_ids.map((idOrName: string) => {
                if (idOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                  return idOrName;
                }
                return deliveryNameToId[idOrName.toLowerCase()] || idOrName;
              });
              deliveryPersons = deliveryPersons.filter(d => resolvedIds.includes(d.id));
            }

            if (deliveryPersons.length === 0) {
              resultMessage = "Aucun livreur disponible pour le moment. Vérifie que des livreurs sont en statut 'disponible'.";
              break;
            }

            if (ordersToDistribute.length === 0) {
              resultMessage = "Toutes les commandes confirmées sont déjà assignées à un livreur. Rien à faire !";
              break;
            }

            if (args.balance_by_workload !== false) {
              deliveryPersons.sort((a, b) => a.daily_deliveries - b.daily_deliveries);
            }

            const distribution: Record<string, { name: string; orderIds: string[] }> = {};
            deliveryPersons.forEach(d => { 
              distribution[d.id] = { name: d.name, orderIds: [] }; 
            });

            const currentCounts = deliveryPersons.map(d => ({ 
              id: d.id, 
              count: d.daily_deliveries 
            }));

            for (const order of ordersToDistribute) {
              currentCounts.sort((a, b) => a.count - b.count);
              const assignTo = currentCounts[0];
              
              distribution[assignTo.id].orderIds.push(order.id);
              assignTo.count++;
            }

            for (const [deliveryPersonId, data] of Object.entries(distribution)) {
              if (data.orderIds.length > 0) {
                await supabase
                  .from("orders")
                  .update({ 
                    delivery_person_id: deliveryPersonId,
                    status: "in_transit"
                  })
                  .in("id", data.orderIds);

                for (const orderId of data.orderIds) {
                  await supabase.from("ai_execution_logs").insert({
                    instruction_id: instructionRecord.id,
                    action_type: "assign_delivery",
                    entity_type: "order",
                    entity_id: orderId,
                    details: { 
                      delivery_person_id: deliveryPersonId,
                      delivery_person_name: data.name
                    },
                  });
                }
              }
            }

            affectedCount = ordersToDistribute.length;
            const deliverySummary = Object.entries(distribution)
              .filter(([_, data]) => data.orderIds.length > 0)
              .map(([_, data]) => `- ${data.name}: ${data.orderIds.length} commandes`)
              .join("\n");
            
            resultMessage = `C'est fait ! ${affectedCount} commandes sont parties en livraison:\n\n${deliverySummary}\n\nLes livreurs peuvent commencer leur tournée !`;
            break;
          }

          case "create_followups": {
            let ordersForFollowup = contextData.orders;
            
            if (args.filter_status) {
              ordersForFollowup = ordersForFollowup.filter(o => o.status === args.filter_status);
            }
            
            if (args.days_since_order) {
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - args.days_since_order);
              ordersForFollowup = ordersForFollowup.filter(o => new Date(o.created_at) < cutoffDate);
            }

            if (args.order_ids?.length > 0) {
              ordersForFollowup = ordersForFollowup.filter(o => args.order_ids.includes(o.id));
            }

            const existingFollowupOrderIds = new Set(contextData.pending_followups.map(f => f.order_id));
            ordersForFollowup = ordersForFollowup.filter(o => !existingFollowupOrderIds.has(o.id));

            if (ordersForFollowup.length === 0) {
              resultMessage = "Pas de nouvelles relances à créer - toutes les commandes concernées ont déjà une relance prévue.";
              break;
            }

            const scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + 1);

            const typeLabels: Record<string, string> = {
              reminder: "rappel",
              partial_payment: "paiement",
              rescheduled: "reprogrammation",
              retargeting: "relance commerciale"
            };

            const followupsToCreate = ordersForFollowup.map(order => ({
              client_id: order.client_id,
              order_id: order.id,
              type: args.followup_type,
              status: "pending",
              scheduled_at: scheduledAt.toISOString(),
              notes: `Relance automatique - Type: ${typeLabels[args.followup_type] || args.followup_type}`,
              created_by: user.id,
            }));

            const { data: createdFollowups, error: followupError } = await supabase
              .from("follow_ups")
              .insert(followupsToCreate)
              .select();

            if (followupError) {
              resultMessage = `Oups, problème lors de la création des relances: ${followupError.message}`;
              break;
            }

            affectedCount = createdFollowups?.length || 0;

            for (const followup of createdFollowups || []) {
              await supabase.from("ai_execution_logs").insert({
                instruction_id: instructionRecord.id,
                action_type: "create_followup",
                entity_type: "follow_up",
                entity_id: followup.id,
                details: { type: args.followup_type, order_id: followup.order_id },
              });
            }

            resultMessage = `C'est fait ! J'ai créé ${affectedCount} relances de type "${typeLabels[args.followup_type] || args.followup_type}".\n\nElles sont programmées pour demain. Tu les verras dans l'onglet Relances.`;
            break;
          }

          case "stock_alerts": {
            const threshold = args.threshold || 10;
            const lowStockProds = contextData.products.filter(p => p.stock <= threshold && p.is_active);

            if (lowStockProds.length === 0) {
              resultMessage = `Bonne nouvelle ! Tous les produits ont plus de ${threshold} unités en stock. Tout va bien !`;
              break;
            }

            if (args.action === "alert") {
              for (const product of lowStockProds) {
                await supabase.from("stock_alerts").insert({
                  product_id: product.id,
                  alert_type: "low_stock",
                  severity: product.stock <= threshold / 2 ? "critical" : "warning",
                  current_quantity: product.stock,
                  threshold: threshold,
                });

                await supabase.from("ai_execution_logs").insert({
                  instruction_id: instructionRecord.id,
                  action_type: "create_stock_alert",
                  entity_type: "product",
                  entity_id: product.id,
                  details: { stock: product.stock, threshold },
                });
              }
              affectedCount = lowStockProds.length;
              resultMessage = `J'ai créé ${affectedCount} alertes de stock:\n\n${lowStockProds.map(p => `- ${p.name}: ${p.stock} unités${p.stock <= threshold / 2 ? " ⚠️ URGENT" : ""}`).join("\n")}\n\nPense à réapprovisionner ces produits !`;
            } else {
              resultMessage = `Voici les produits à surveiller (moins de ${threshold} unités):\n\n${lowStockProds.map(p => `- ${p.name}: ${p.stock} unités${p.stock <= threshold / 2 ? " ⚠️ CRITIQUE" : ""}`).join("\n")}\n\nTu veux que je crée des alertes ?`;
            }
            break;
          }

          case "client_analysis": {
            let filteredClients = contextData.clients;
            
            if (args.segment) {
              filteredClients = filteredClients.filter(c => c.segment === args.segment);
            }
            
            if (args.min_orders) {
              filteredClients = filteredClients.filter(c => c.total_orders >= args.min_orders);
            }

            const segmentLabels: Record<string, string> = {
              new: "nouveaux",
              regular: "réguliers",
              vip: "VIP",
              inactive: "inactifs"
            };

            const summary = `J'ai trouvé ${filteredClients.length} clients${args.segment ? ` ${segmentLabels[args.segment] || args.segment}` : ""}${args.min_orders ? ` avec au moins ${args.min_orders} commandes` : ""}`;
            
            const topClients = filteredClients.slice(0, 10).map(c => 
              `- ${c.full_name}: ${c.total_orders} commandes, ${c.total_spent} DH`
            ).join("\n");

            resultMessage = `${summary}\n\nLes 10 premiers:\n${topClients}\n\nTu veux que je fasse quelque chose avec cette liste ?`;
            break;
          }

          case "analyze_marketing_opportunities": {
            const inactiveClients = contextData.clients.filter(c => {
              // Clients who haven't ordered in 30+ days (simplified check)
              return c.total_orders > 0 && c.segment !== "vip";
            });

            const vipClientsForRetention = vipClients.filter(c => c.total_orders >= 3);

            let opportunities = [];
            
            if (inactiveClients.length > 0) {
              opportunities.push(`📩 ${inactiveClients.length} clients à réactiver - ils ont déjà commandé mais plus récemment`);
            }
            
            if (vipClientsForRetention.length > 0) {
              opportunities.push(`⭐ ${vipClientsForRetention.length} clients VIP à chouchouter - une promo exclusive ?`);
            }
            
            if (pendingOrders > 5) {
              opportunities.push(`📞 ${pendingOrders} commandes en attente - une campagne de confirmation ?`);
            }

            if (opportunities.length === 0) {
              resultMessage = "Tout roule ! Je ne vois pas d'opportunité marketing urgente pour le moment. Tes clients sont actifs et les commandes avancent bien.";
            } else {
              resultMessage = `Voici ce que je vois comme opportunités:\n\n${opportunities.join("\n\n")}\n\nTu veux que je prépare une campagne ?`;
            }
            break;
          }

          case "generate_campaign": {
            const segment = args.target_segment;
            const campaignType = args.campaign_type;
            
            const segmentLabels: Record<string, string> = {
              vip: "clients VIP",
              inactive: "clients inactifs",
              new: "nouveaux clients",
              all: "tous les clients"
            };

            const typeLabels: Record<string, string> = {
              reactivation: "réactivation",
              promotion: "promotion",
              loyalty: "fidélité",
              announcement: "annonce"
            };

            const targetClients = segment === "vip" ? vipClients : 
                                  segment === "inactive" ? contextData.clients.filter(c => c.total_orders === 0) :
                                  segment === "new" ? contextData.clients.filter(c => c.segment === "new") :
                                  contextData.clients;

            const sampleMessages: Record<string, string> = {
              reactivation: `Bonjour {nom} ! Ça fait un moment... On a pensé à vous avec -15% sur votre prochaine commande. Code: RETOUR15`,
              promotion: `{nom}, offre flash ! -20% sur toute la boutique ce weekend. Profitez-en vite !`,
              loyalty: `Merci {nom} pour votre fidélité ! Voici un code cadeau: VIP10 pour -10% sur votre prochaine commande`,
              announcement: `{nom}, grande nouvelle ! Découvrez nos nouveaux produits. Livraison offerte cette semaine !`
            };

            resultMessage = `Voici ma proposition de campagne:\n\n📌 **Type**: ${typeLabels[campaignType] || campaignType}\n👥 **Cible**: ${targetClients.length} ${segmentLabels[segment] || segment}\n\n💬 **Message suggéré**:\n"${sampleMessages[campaignType] || sampleMessages.promotion}"\n\nTu veux que je crée cette campagne ?`;
            break;
          }

          case "analyze_global_performance": {
            // Calculate a simple score
            const deliveryScore = Math.min(deliveryRate, 100);
            const stockScore = criticalStockProducts.length === 0 ? 100 : 
                              criticalStockProducts.length <= 2 ? 70 : 40;
            const pendingScore = pendingOrders <= 5 ? 100 : 
                                pendingOrders <= 15 ? 70 : 40;
            
            const globalScore = Math.round((deliveryScore + stockScore + pendingScore) / 3);

            let scoreLabel = "";
            if (globalScore >= 80) scoreLabel = "Excellent !";
            else if (globalScore >= 60) scoreLabel = "Correct";
            else if (globalScore >= 40) scoreLabel = "À améliorer";
            else scoreLabel = "Attention requise";

            let recommendations = [];
            if (pendingOrders > 0) {
              recommendations.push(`- ${pendingOrders} commandes en attente à distribuer`);
            }
            if (criticalStockProducts.length > 0) {
              recommendations.push(`- ${criticalStockProducts.length} produits en stock critique à réapprovisionner`);
            }
            if (deliveryRate < 70) {
              recommendations.push(`- Taux de livraison bas (${deliveryRate}%) - vérifier les blocages`);
            }

            resultMessage = `📊 **Score Boutique: ${globalScore}/100** - ${scoreLabel}\n\n`;
            resultMessage += `**Ce qui va bien:**\n`;
            resultMessage += `- ${deliveredOrders} commandes livrées\n`;
            resultMessage += `- ${availableDeliveryPersons.length} livreurs disponibles\n`;
            resultMessage += `- ${vipClients.length} clients VIP fidèles\n\n`;
            
            if (recommendations.length > 0) {
              resultMessage += `**À améliorer:**\n${recommendations.join("\n")}\n\n`;
            }
            
            resultMessage += `Tu veux que je m'occupe d'un de ces points ?`;
            break;
          }

          case "generate_action_plan": {
            const period = args.period || "today";
            const periodLabel = period === "today" ? "aujourd'hui" : "cette semaine";

            let plan = [];
            let priority = 1;

            if (pendingOrders > 0) {
              plan.push(`${priority}. **Distribuer ${pendingOrders} commandes en attente** - Les appelants attendent du travail !`);
              priority++;
            }

            if (confirmedOrders > 0) {
              plan.push(`${priority}. **Envoyer ${confirmedOrders} commandes confirmées en livraison** - Les clients attendent !`);
              priority++;
            }

            if (criticalStockProducts.length > 0) {
              plan.push(`${priority}. **Réapprovisionner ${criticalStockProducts.length} produits** - ${criticalStockProducts.map(p => p.name).join(", ")}`);
              priority++;
            }

            if (contextData.pending_followups.length > 0) {
              plan.push(`${priority}. **Traiter ${contextData.pending_followups.length} relances en attente** - Des clients à rappeler`);
              priority++;
            }

            if (plan.length === 0) {
              resultMessage = `Super ! Tout est sous contrôle ${periodLabel}. Pas d'action urgente.\n\nProfites-en pour:\n- Analyser les performances de l'équipe\n- Préparer une campagne marketing\n- Former les nouveaux`;
            } else {
              resultMessage = `📋 **Plan d'action ${periodLabel}:**\n\n${plan.join("\n\n")}\n\nTu veux que je commence par le premier point ?`;
            }
            break;
          }

          case "respond_text":
            resultMessage = args.message || "Je n'ai pas compris, tu peux reformuler ?";
            break;
        }
      }
    } else if (message?.content) {
      resultMessage = message.content;
    } else {
      resultMessage = "Hmm, je n'ai pas compris. Tu peux reformuler ta demande ?";
    }

    // Update instruction record
    await supabase.from("ai_instructions").update({
      status: "completed",
      executed_at: new Date().toISOString(),
      result: { message: resultMessage, actions },
      affected_count: affectedCount,
    }).eq("id", instructionRecord.id);

    console.log("Instruction completed:", resultMessage);

    return new Response(JSON.stringify({
      success: true,
      message: resultMessage,
      affected_count: affectedCount,
      instruction_id: instructionRecord.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Agent error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Oups, quelque chose s'est mal passé" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
