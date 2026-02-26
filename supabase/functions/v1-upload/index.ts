import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/auth.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const auth = await authenticateRequest(req);
    const { allowed } = await checkRateLimit(auth.userId, 20); // Lower limit for uploads
    if (!allowed) return errorResponse('Rate limit exceeded', 429);

    const body = await req.json();
    const { project_id, file_base64, filename, provider_name, evaluation_type } = body;

    if (!project_id || !file_base64 || !filename) {
      return errorResponse('project_id, file_base64, and filename are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project belongs to org
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('organization_id', auth.orgId)
      .maybeSingle();

    if (!project) return errorResponse('Project not found', 404);

    // Trigger n8n upload webhook
    const n8nUrl = Deno.env.get('N8N_UPLOAD_URL');
    if (!n8nUrl) return errorResponse('Upload service not configured', 503);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id,
        file_base64,
        filename,
        provider_name: provider_name || '',
        evaluation_type: evaluation_type || '',
        user_email: auth.email || '',
        source: 'api',
      }),
    });

    if (!response.ok) {
      return errorResponse('Upload processing failed', 502);
    }

    const result = await response.json().catch(() => ({}));
    return jsonResponse({ status: 'upload_processing', project_id, ...result });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Error', 401);
  }
});
