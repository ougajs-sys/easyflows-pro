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
    const [ordersResult, callersResult, productsResult, clientsResult, followupsResult, deliveryPersonsResult] = await Promise.all([
      supabase.from("orders").select("id, status, assigned_to, delivery_person_id, client_id, product_id, quantity, total_amount, created_at, delivery_address").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id, role").eq("role", "appelant"),
      supabase.from("products").select("id, name, stock, price, is_active"),
      supabase.from("clients").select("id, full_name, phone, segment, total_orders, total_spent").order("created_at", { ascending: false }).limit(200),
      supabase.from("follow_ups").select("id, client_id, order_id, status, scheduled_at, type").eq("status", "pending").limit(100),
      supabase.from("delivery_persons").select("id, user_id, status, is_active, zone, daily_deliveries").eq("is_active", true),
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
        name: userProfiles?.find(p => p.id === c.user_id)?.full_name || "Unknown"
      })) || [],
      delivery_persons: deliveryPersonsResult.data?.map(d => ({
        id: d.id,
        user_id: d.user_id,
        name: userProfiles?.find(p => p.id === d.user_id)?.full_name || "Unknown",
        status: d.status,
        zone: d.zone,
        daily_deliveries: d.daily_deliveries,
      })) || [],
      products: productsResult.data || [],
      clients: clientsResult.data || [],
      pending_followups: followupsResult.data || [],
    };

    // Get available delivery persons
    const availableDeliveryPersons = contextData.delivery_persons.filter(d => d.status === "available");
    
    const systemPrompt = `Tu es un assistant IA pour une plateforme de gestion de commandes et livraisons. Tu peux exécuter des actions sur la base de données.

CONTEXTE ACTUEL:
- ${contextData.orders.length} commandes (statuts: pending, confirmed, in_transit, delivered, cancelled, partial, reported)
- ${contextData.callers.length} appelants actifs: ${contextData.callers.map(c => c.name).join(", ")}
- ${contextData.delivery_persons.length} livreurs (${availableDeliveryPersons.length} disponibles): ${contextData.delivery_persons.map(d => `${d.name} (${d.status})`).join(", ")}
- ${contextData.products.length} produits en catalogue
- ${contextData.clients.length} clients enregistrés
- ${contextData.pending_followups.length} relances en attente

COMMANDES PAR STATUT:
${JSON.stringify(contextData.orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {} as Record<string, number>))}

LIVREURS DISPONIBLES:
${availableDeliveryPersons.length > 0 ? availableDeliveryPersons.map(d => `- ${d.name}: Zone ${d.zone || "non définie"}, ${d.daily_deliveries} livraisons aujourd'hui`).join("\n") : "Aucun livreur disponible actuellement"}

RÈGLES IMPORTANTES:
1. Pour distribuer des commandes aux appelants, utilise l'action "distribute_orders" avec les IDs des commandes et des appelants
2. Pour distribuer des commandes confirmées aux livreurs, utilise l'action "distribute_to_delivery" - priorise les livreurs disponibles avec le moins de livraisons
3. Pour créer des relances, utilise l'action "create_followups" avec les IDs des commandes/clients concernés
4. Pour les alertes stock, utilise l'action "stock_alerts" pour identifier les produits à faible stock
5. Pour le suivi clients, utilise "client_analysis" pour segmenter ou identifier des clients spécifiques
6. Confirme toujours ce que tu vas faire avant d'exécuter des actions massives`;

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
              description: "Distribue les commandes entre les appelants de manière équitable",
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
              description: "Distribue les commandes confirmées aux livreurs disponibles de manière équitable",
              parameters: {
                type: "object",
                properties: {
                  order_ids: { type: "array", items: { type: "string" }, description: "IDs des commandes confirmées à distribuer" },
                  delivery_person_ids: { type: "array", items: { type: "string" }, description: "IDs des livreurs (optionnel, sinon tous les disponibles)" },
                  only_available: { type: "boolean", description: "Distribuer uniquement aux livreurs disponibles (true par défaut)" },
                  balance_by_workload: { type: "boolean", description: "Équilibrer selon la charge de travail actuelle (true par défaut)" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "create_followups",
              description: "Crée des relances automatiques pour les clients ou commandes",
              parameters: {
                type: "object",
                properties: {
                  order_ids: { type: "array", items: { type: "string" }, description: "IDs des commandes pour lesquelles créer des relances" },
                  followup_type: { type: "string", enum: ["payment", "satisfaction", "rescheduled", "complaint"], description: "Type de relance" },
                  days_since_order: { type: "number", description: "Créer relances pour commandes de plus de X jours" },
                  filter_status: { type: "string", description: "Filtrer les commandes par statut" },
                },
                required: ["followup_type"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "stock_alerts",
              description: "Analyse et alerte sur les niveaux de stock",
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
              description: "Analyse les clients selon différents critères",
              parameters: {
                type: "object",
                properties: {
                  segment: { type: "string", enum: ["new", "regular", "vip", "inactive"], description: "Segment de clients" },
                  days_inactive: { type: "number", description: "Nombre de jours d'inactivité" },
                  min_orders: { type: "number", description: "Nombre minimum de commandes" },
                },
                required: [],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "respond_text",
              description: "Répondre avec un texte sans action",
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
        await supabase.from("ai_instructions").update({ status: "failed", error_message: "Limite de requêtes atteinte" }).eq("id", instructionRecord.id);
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }), {
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
            
            const callerList = args.caller_ids?.length > 0 
              ? contextData.callers.filter(c => args.caller_ids.includes(c.user_id))
              : contextData.callers;

            if (callerList.length === 0) {
              resultMessage = "Aucun appelant disponible pour la distribution.";
              break;
            }

            if (ordersToDistribute.length === 0) {
              resultMessage = "Aucune commande à distribuer (toutes déjà assignées ou aucune correspondant aux critères).";
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

                // Log each assignment
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
              `${c.name}: ${distribution[c.user_id].length} commandes`
            ).join("\n");
            
            resultMessage = `✅ ${affectedCount} commandes distribuées entre ${callerList.length} appelants:\n${distributionSummary}`;
            break;
          }

          case "distribute_to_delivery": {
            // Get confirmed orders without delivery person assigned
            let ordersToDistribute = contextData.orders.filter(o => 
              o.status === "confirmed" && !o.delivery_person_id
            );
            
            if (args.order_ids?.length > 0) {
              ordersToDistribute = ordersToDistribute.filter(o => args.order_ids.includes(o.id));
            }

            // Get available delivery persons
            let deliveryPersons = contextData.delivery_persons;
            
            if (args.only_available !== false) {
              deliveryPersons = deliveryPersons.filter(d => d.status === "available");
            }
            
            if (args.delivery_person_ids?.length > 0) {
              deliveryPersons = deliveryPersons.filter(d => args.delivery_person_ids.includes(d.id));
            }

            if (deliveryPersons.length === 0) {
              resultMessage = "❌ Aucun livreur disponible pour la distribution. Vérifiez que des livreurs sont en statut 'disponible'.";
              break;
            }

            if (ordersToDistribute.length === 0) {
              resultMessage = "✅ Aucune commande confirmée à distribuer (toutes déjà assignées ou aucune commande confirmée).";
              break;
            }

            // Sort delivery persons by workload (ascending) if balance requested
            if (args.balance_by_workload !== false) {
              deliveryPersons.sort((a, b) => a.daily_deliveries - b.daily_deliveries);
            }

            // Distribute orders evenly, prioritizing those with less workload
            const distribution: Record<string, { name: string; orderIds: string[] }> = {};
            deliveryPersons.forEach(d => { 
              distribution[d.id] = { name: d.name, orderIds: [] }; 
            });

            // Track current assignment counts for balanced distribution
            const currentCounts = deliveryPersons.map(d => ({ 
              id: d.id, 
              count: d.daily_deliveries 
            }));

            for (const order of ordersToDistribute) {
              // Find delivery person with least current assignments
              currentCounts.sort((a, b) => a.count - b.count);
              const assignTo = currentCounts[0];
              
              distribution[assignTo.id].orderIds.push(order.id);
              assignTo.count++;
            }

            // Update orders with delivery person assignments
            for (const [deliveryPersonId, data] of Object.entries(distribution)) {
              if (data.orderIds.length > 0) {
                await supabase
                  .from("orders")
                  .update({ 
                    delivery_person_id: deliveryPersonId,
                    status: "in_transit"
                  })
                  .in("id", data.orderIds);

                // Log each assignment
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
            
            resultMessage = `✅ ${affectedCount} commandes confirmées distribuées entre ${deliveryPersons.length} livreurs et passées "en transit":\n${deliverySummary}`;
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

            // Check for existing pending followups
            const existingFollowupOrderIds = new Set(contextData.pending_followups.map(f => f.order_id));
            ordersForFollowup = ordersForFollowup.filter(o => !existingFollowupOrderIds.has(o.id));

            if (ordersForFollowup.length === 0) {
              resultMessage = "Aucune commande nécessitant une relance (toutes ont déjà des relances en attente).";
              break;
            }

            const scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + 1); // Schedule for tomorrow

            const followupsToCreate = ordersForFollowup.map(order => ({
              client_id: order.client_id,
              order_id: order.id,
              type: args.followup_type,
              status: "pending",
              scheduled_at: scheduledAt.toISOString(),
              notes: `Relance automatique générée par l'Agent IA - Type: ${args.followup_type}`,
              created_by: user.id,
            }));

            const { data: createdFollowups, error: followupError } = await supabase
              .from("follow_ups")
              .insert(followupsToCreate)
              .select();

            if (followupError) {
              console.error("Error creating followups:", followupError);
              resultMessage = `Erreur lors de la création des relances: ${followupError.message}`;
              break;
            }

            affectedCount = createdFollowups?.length || 0;

            // Log each followup creation
            for (const followup of createdFollowups || []) {
              await supabase.from("ai_execution_logs").insert({
                instruction_id: instructionRecord.id,
                action_type: "create_followup",
                entity_type: "follow_up",
                entity_id: followup.id,
                details: { type: args.followup_type, order_id: followup.order_id },
              });
            }

            resultMessage = `✅ ${affectedCount} relances créées de type "${args.followup_type}" programmées pour demain.`;
            break;
          }

          case "stock_alerts": {
            const threshold = args.threshold || 10;
            const lowStockProducts = contextData.products.filter(p => p.stock <= threshold && p.is_active);

            if (lowStockProducts.length === 0) {
              resultMessage = `✅ Aucun produit avec un stock inférieur à ${threshold} unités.`;
              break;
            }

            if (args.action === "alert") {
              // Create stock alerts
              for (const product of lowStockProducts) {
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
              affectedCount = lowStockProducts.length;
              resultMessage = `⚠️ ${affectedCount} alertes de stock créées pour les produits suivants:\n${lowStockProducts.map(p => `- ${p.name}: ${p.stock} unités`).join("\n")}`;
            } else {
              resultMessage = `📦 Produits avec stock ≤ ${threshold}:\n${lowStockProducts.map(p => `- ${p.name}: ${p.stock} unités (${p.stock <= threshold / 2 ? "CRITIQUE" : "Attention"})`).join("\n")}`;
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

            const summary = `👥 ${filteredClients.length} clients trouvés${args.segment ? ` (segment: ${args.segment})` : ""}${args.min_orders ? ` avec ≥${args.min_orders} commandes` : ""}`;
            
            const topClients = filteredClients.slice(0, 10).map(c => 
              `- ${c.full_name}: ${c.total_orders} commandes, ${c.total_spent} DH`
            ).join("\n");

            resultMessage = `${summary}\n\nTop 10:\n${topClients}`;
            break;
          }

          case "respond_text":
            resultMessage = args.message || "Je n'ai pas compris votre demande.";
            break;
        }
      }
    } else if (message?.content) {
      resultMessage = message.content;
    } else {
      resultMessage = "Je n'ai pas pu traiter cette instruction. Veuillez reformuler.";
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
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
