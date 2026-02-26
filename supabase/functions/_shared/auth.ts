import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export interface AuthContext {
  userId: string;
  orgId: string;
  email?: string;
}

/**
 * Validates Bearer JWT or X-API-Key header.
 * Returns auth context or throws.
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization');
  const apiKey = req.headers.get('X-API-Key');

  if (authHeader?.startsWith('Bearer ')) {
    return authenticateJWT(authHeader.slice(7));
  }

  if (apiKey) {
    return authenticateApiKey(apiKey);
  }

  throw new Error('Missing authentication. Provide Authorization: Bearer <JWT> or X-API-Key header.');
}

async function authenticateJWT(token: string): Promise<AuthContext> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid or expired JWT token');
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    throw new Error('User does not belong to any organization');
  }

  return {
    userId: user.id,
    orgId: membership.organization_id,
    email: user.email,
  };
}

async function authenticateApiKey(key: string): Promise<AuthContext> {
  if (!key.startsWith('beval_')) {
    throw new Error('Invalid API key format');
  }

  // SHA-256 hash the key
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, organization_id, permissions, rate_limit_per_hour, is_active, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !apiKeyRecord) {
    throw new Error('Invalid API key');
  }

  if (!apiKeyRecord.is_active) {
    throw new Error('API key is deactivated');
  }

  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    throw new Error('API key has expired');
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyRecord.id);

  return {
    userId: apiKeyRecord.id, // API key ID as user proxy
    orgId: apiKeyRecord.organization_id,
  };
}
