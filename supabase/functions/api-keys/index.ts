import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/auth.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const auth = await authenticateRequest(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin/owner role
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.orgId)
      .maybeSingle();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return errorResponse('Insufficient permissions. Admin or owner role required.', 403);
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET — list API keys
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, permissions, rate_limit_per_hour, is_active, last_used_at, expires_at, created_at')
        .eq('organization_id', auth.orgId)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ data });
    }

    // POST — create API key
    if (method === 'POST') {
      const body = await req.json();
      const { name, permissions, rate_limit_per_hour, expires_at } = body;

      if (!name) return errorResponse('Name is required');

      // Generate key: beval_ + 32 random hex bytes
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const keyHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const fullKey = `beval_${keyHex}`;
      const keyPrefix = fullKey.substring(0, 12);

      // SHA-256 hash for storage
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fullKey));
      const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          organization_id: auth.orgId,
          name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          permissions: permissions || ['read'],
          rate_limit_per_hour: rate_limit_per_hour || 100,
          expires_at: expires_at || null,
          is_active: true,
        })
        .select('id, name, key_prefix, created_at')
        .single();

      if (error) return errorResponse(error.message, 500);

      // Return the full key ONLY on creation
      return jsonResponse({ data: { ...data, key: fullKey } }, 201);
    }

    // DELETE — revoke API key
    if (method === 'DELETE') {
      const keyId = url.searchParams.get('id');
      if (!keyId) return errorResponse('Key ID required');

      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('organization_id', auth.orgId);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Authentication failed', 401);
  }
});
