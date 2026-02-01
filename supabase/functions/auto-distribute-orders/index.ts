import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const DISTRIBUTION_START_HOUR = 7;  // 7h00
const DISTRIBUTION_END_HOUR = 15;   // 15h45 (we check minutes too)
const DISTRIBUTION_END_MINUTE = 45;
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - consider user online if last_seen within this time

interface OnlineCaller {
  user_id: string;
  total_points: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check current time (UTC - adjust for your timezone if needed)
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Check if within distribution hours (7h00 - 15h45)
    const isWithinHours = 
      (currentHour >= DISTRIBUTION_START_HOUR && currentHour < DISTRIBUTION_END_HOUR) ||
      (currentHour === DISTRIBUTION_END_HOUR && currentMinute <= DISTRIBUTION_END_MINUTE);

    if (!isWithinHours) {
      console.log(`Outside distribution hours. Current time: ${currentHour}:${currentMinute} UTC`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Outside distribution hours (7h00-15h45)",
          skipped: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting automatic order distribution at ${now.toISOString()}`);

    // Step 1: Get online callers (appelants) from user_presence
    const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
    
    const { data: presenceData, error: presenceError } = await supabase
      .from("user_presence")
      .select("user_id, role, last_seen_at")
      .eq("role", "appelant")
      .gte("last_seen_at", onlineThreshold);

    if (presenceError) {
      console.error("Error fetching presence:", presenceError);
      throw presenceError;
    }

    if (!presenceData || presenceData.length === 0) {
      console.log("No online callers found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No online callers available",
          distributed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${presenceData.length} online callers`);

    // Step 2: Get caller scores for performance ranking
    const callerIds = presenceData.map(p => p.user_id);
    
    const { data: scoresData, error: scoresError } = await supabase
      .from("caller_scores")
      .select("user_id, total_points")
      .in("user_id", callerIds);

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
    }

    // Build online callers list with scores
    const scoresMap = new Map(scoresData?.map(s => [s.user_id, s.total_points || 0]) || []);
    
    const onlineCallers: OnlineCaller[] = presenceData.map(p => ({
      user_id: p.user_id,
      total_points: scoresMap.get(p.user_id) || 0,
    }));

    // Sort by points (highest first) for remainder distribution
    onlineCallers.sort((a, b) => b.total_points - a.total_points);

    // Step 3: Get pending orders that are not assigned
    const { data: pendingOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "pending")
      .is("assigned_to", null)
      .order("created_at", { ascending: true });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      throw ordersError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log("No pending orders to distribute");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pending orders to distribute",
          distributed: 0,
          onlineCallers: onlineCallers.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingOrders.length} pending orders to distribute among ${onlineCallers.length} callers`);

    // Step 4: Calculate distribution
    const totalOrders = pendingOrders.length;
    const numCallers = onlineCallers.length;
    const ordersPerCaller = Math.floor(totalOrders / numCallers);
    const remainder = totalOrders % numCallers;

    console.log(`Distribution: ${ordersPerCaller} orders per caller, ${remainder} remainder orders`);

    // Step 5: Distribute orders
    const assignments: { orderId: string; callerId: string }[] = [];
    let orderIndex = 0;

    // First, distribute equally
    for (const caller of onlineCallers) {
      for (let i = 0; i < ordersPerCaller && orderIndex < totalOrders; i++) {
        assignments.push({
          orderId: pendingOrders[orderIndex].id,
          callerId: caller.user_id,
        });
        orderIndex++;
      }
    }

    // Then, give remainder to top performer (first in sorted list)
    if (remainder > 0 && onlineCallers.length > 0) {
      const topPerformer = onlineCallers[0];
      console.log(`Assigning ${remainder} remainder orders to top performer: ${topPerformer.user_id} (${topPerformer.total_points} points)`);
      
      for (let i = 0; i < remainder && orderIndex < totalOrders; i++) {
        assignments.push({
          orderId: pendingOrders[orderIndex].id,
          callerId: topPerformer.user_id,
        });
        orderIndex++;
      }
    }

    // Step 6: Update orders in batch
    const updatePromises = assignments.map(({ orderId, callerId }) =>
      supabase
        .from("orders")
        .update({ assigned_to: callerId, updated_at: new Date().toISOString() })
        .eq("id", orderId)
    );

    await Promise.all(updatePromises);

    console.log(`Successfully assigned ${assignments.length} orders`);

    // Step 7: Create instruction log for traceability
    const { data: instruction, error: instructionError } = await supabase
      .from("ai_instructions")
      .insert({
        instruction: `Distribution automatique: ${assignments.length} commandes distribuées à ${numCallers} appelants`,
        instruction_type: "auto_distribution",
        status: "completed",
        executed_at: new Date().toISOString(),
        affected_count: assignments.length,
        created_by: "00000000-0000-0000-0000-000000000000", // System user
        result: {
          message: `${assignments.length} commandes distribuées`,
          distribution: {
            total_orders: totalOrders,
            callers_count: numCallers,
            orders_per_caller: ordersPerCaller,
            remainder: remainder,
            top_performer: onlineCallers[0]?.user_id,
          },
        },
      })
      .select("id")
      .single();

    if (instructionError) {
      console.error("Error logging instruction:", instructionError);
    }

    // Step 8: Log individual assignments
    if (instruction?.id) {
      const logEntries = assignments.map(({ orderId, callerId }) => ({
        instruction_id: instruction.id,
        action_type: "order_assignment",
        entity_type: "order",
        entity_id: orderId,
        details: { assigned_to: callerId },
      }));

      const { error: logError } = await supabase
        .from("ai_execution_logs")
        .insert(logEntries);

      if (logError) {
        console.error("Error logging executions:", logError);
      }
    }

    // Build summary by caller
    const summaryByCaller: Record<string, number> = {};
    for (const { callerId } of assignments) {
      summaryByCaller[callerId] = (summaryByCaller[callerId] || 0) + 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${assignments.length} commandes distribuées à ${numCallers} appelants`,
        distributed: assignments.length,
        onlineCallers: numCallers,
        ordersPerCaller,
        remainder,
        topPerformer: onlineCallers[0]?.user_id,
        summaryByCaller,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-distribute-orders:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
