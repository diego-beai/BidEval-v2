import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify owner role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: member } = await adminClient
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only organization owners can export data' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orgId = member.organization_id;

    // Export org data
    const [
      { data: org },
      { data: members },
      { data: projects },
      { data: auditLog },
    ] = await Promise.all([
      adminClient.from('organizations').select('*').eq('id', orgId).single(),
      adminClient.from('organization_members').select('user_id, role, created_at').eq('organization_id', orgId),
      adminClient.from('projects').select('id, display_name, project_type, status, created_at, updated_at').eq('organization_id', orgId),
      adminClient.from('audit_log').select('action, resource_type, resource_id, user_email, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(1000),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      organization: org,
      members: members || [],
      projects: projects || [],
      audit_log_sample: auditLog || [],
    };

    // Log the export action
    await adminClient.rpc('log_audit', {
      p_action: 'data.export',
      p_resource_type: 'organization',
      p_resource_id: orgId,
      p_metadata: JSON.stringify({ exported_by: user.email }),
    });

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bideval-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
