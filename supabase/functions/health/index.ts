import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const start = Date.now();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // 1. Check Supabase DB connectivity
  try {
    const dbStart = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
    checks.database = error
      ? { status: 'unhealthy', error: error.message, latency_ms: Date.now() - dbStart }
      : { status: 'healthy', latency_ms: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'unhealthy', error: String(err) };
  }

  // 2. Check n8n connectivity
  try {
    const n8nStart = Date.now();
    const n8nUrl = Deno.env.get('N8N_BASE_URL') || 'https://n8n.beaienergy.com';
    const resp = await fetch(`${n8nUrl}/healthz`, { signal: AbortSignal.timeout(5000) });
    checks.n8n = resp.ok
      ? { status: 'healthy', latency_ms: Date.now() - n8nStart }
      : { status: 'degraded', error: `HTTP ${resp.status}`, latency_ms: Date.now() - n8nStart };
  } catch (err) {
    checks.n8n = { status: 'unhealthy', error: String(err) };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  return new Response(
    JSON.stringify({
      status: overallStatus,
      version: Deno.env.get('APP_VERSION') || 'unknown',
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - start,
      checks,
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
