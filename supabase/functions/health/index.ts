/**
 * HEALTH CHECK ENDPOINT
 * 
 * Endpoint de monitoring pour vérifier la santé de l'application
 * Utilisé par:
 * - Sentry Monitoring
 * - Uptime monitoring services
 * - Load balancers
 * - CI/CD pipelines
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: boolean;
    api: boolean;
  };
  uptime: number;
  environment: string;
}

const startTime = Date.now();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const checks = {
      database: false,
      api: true,
    };

    // Test database connection
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Simple query to test connection
        const { error } = await supabase
          .from("orders")
          .select("id")
          .limit(1);
        
        checks.database = !error;
      }
    } catch (error) {
      console.error("Database health check failed:", error);
      checks.database = false;
    }

    // Determine overall status
    let status: "healthy" | "degraded" | "unhealthy";
    if (checks.database && checks.api) {
      status = "healthy";
    } else if (checks.api) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    const healthCheck: HealthCheck = {
      status,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks,
      uptime: Date.now() - startTime,
      environment: Deno.env.get("ENVIRONMENT") || "production",
    };

    const statusCode = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return new Response(JSON.stringify(healthCheck, null, 2), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
