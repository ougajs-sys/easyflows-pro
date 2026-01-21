import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Health Check Endpoint
 * Returns the health status of the edge function
 */

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
    };
  };
}

const startTime = Date.now();

serve(async (req: Request) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const checks: HealthCheckResponse['checks'] = {};
    let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

    // Check 1: Basic function availability
    checks.function = { status: 'pass' };

    // Check 2: Environment variables
    try {
      const hasSupabaseUrl = !!Deno.env.get('SUPABASE_URL');
      const hasSupabaseKey = !!Deno.env.get('SUPABASE_ANON_KEY');
      
      checks.environment = {
        status: hasSupabaseUrl && hasSupabaseKey ? 'pass' : 'fail',
        message: hasSupabaseUrl && hasSupabaseKey 
          ? 'All required environment variables present'
          : 'Missing required environment variables',
      };
      
      if (!hasSupabaseUrl || !hasSupabaseKey) {
        overallStatus = 'unhealthy';
      }
    } catch (error) {
      checks.environment = {
        status: 'fail',
        message: `Environment check failed: ${error.message}`,
      };
      overallStatus = 'unhealthy';
    }

    // Check 3: Database connectivity (optional)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        
        checks.database = {
          status: response.ok ? 'pass' : 'fail',
          message: response.ok 
            ? 'Database connection successful'
            : `Database connection failed: ${response.status}`,
        };
        
        if (!response.ok) {
          overallStatus = 'unhealthy';
        }
      } else {
        checks.database = {
          status: 'fail',
          message: 'Database credentials not configured',
        };
      }
    } catch (error) {
      checks.database = {
        status: 'fail',
        message: `Database check failed: ${error.message}`,
      };
      // Don't mark as unhealthy for database check failures
      // as it might be a transient issue
    }

    // Check 4: Memory usage (Deno specific)
    try {
      const memoryUsage = Deno.memoryUsage();
      const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
      
      checks.memory = {
        status: memoryMB < 100 ? 'pass' : 'fail',
        message: `Heap used: ${memoryMB.toFixed(2)} MB`,
      };
    } catch (error) {
      checks.memory = {
        status: 'fail',
        message: `Memory check failed: ${error.message}`,
      };
    }

    const healthCheck: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: '1.0.0',
      checks,
    };

    return new Response(
      JSON.stringify(healthCheck, null, 2),
      {
        status: overallStatus === 'healthy' ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
