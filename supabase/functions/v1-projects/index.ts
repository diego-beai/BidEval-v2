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
    const method = req.method;

    // GET — list projects for this org
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, display_name, description, project_type, status, created_at, updated_at')
        .eq('organization_id', auth.orgId)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(error.message, 500);

      return jsonResponse({
        data,
        meta: { total: data?.length || 0, rate_limit_remaining: remaining },
      });
    }

    // POST — create project
    if (method === 'POST') {
      const body = await req.json();
      const { display_name, description, project_type } = body;

      if (!display_name) return errorResponse('display_name is required');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          display_name,
          description: description || null,
          project_type: project_type || 'RFP',
          organization_id: auth.orgId,
          created_by: auth.userId,
          status: 'setup',
        })
        .select('id, display_name, project_type, status, created_at')
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ data }, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Error', 401);
  }
});
