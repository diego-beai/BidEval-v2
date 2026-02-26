import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/auth.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const auth = await authenticateRequest(req);
    const { allowed, remaining } = await checkRateLimit(auth.userId);
    if (!allowed) return errorResponse('Rate limit exceeded', 429);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const method = req.method;

    // GET — get scoring/ranking for a project
    if (method === 'GET') {
      const projectId = url.searchParams.get('project_id');
      if (!projectId) return errorResponse('project_id query parameter required');

      // Verify project belongs to org
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('organization_id', auth.orgId)
        .maybeSingle();

      if (!project) return errorResponse('Project not found', 404);

      const { data, error } = await supabase
        .from('ranking_proveedores')
        .select('*')
        .eq('project_id', projectId)
        .order('overall_score', { ascending: false });

      if (error) return errorResponse(error.message, 500);

      return jsonResponse({
        data,
        meta: { project_id: projectId, total: data?.length || 0, rate_limit_remaining: remaining },
      });
    }

    // POST — trigger scoring evaluation
    if (method === 'POST') {
      const body = await req.json();
      const { project_id, provider_name } = body;

      if (!project_id) return errorResponse('project_id is required');

      // Verify project belongs to org
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('organization_id', auth.orgId)
        .maybeSingle();

      if (!project) return errorResponse('Project not found', 404);

      // Trigger n8n scoring webhook
      const n8nUrl = Deno.env.get('N8N_SCORING_URL');
      if (!n8nUrl) return errorResponse('Scoring service not configured', 503);

      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id,
          provider_name: provider_name || '',
          recalculate_all: !provider_name,
          user_email: auth.email || '',
          source: 'api',
        }),
      });

      if (!response.ok) {
        return errorResponse('Scoring evaluation failed', 502);
      }

      return jsonResponse({ status: 'evaluation_triggered', project_id });
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Error', 401);
  }
});
