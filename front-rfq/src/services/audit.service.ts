/**
 * Audit logging service for SOC2/ISO compliance.
 * Logs user actions to the audit_log table via RPC.
 * Silent fail — never blocks the user action.
 */

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export async function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (isDemoMode) return;

  try {
    const { supabase } = await import('../lib/supabase');
    if (!supabase) return;

    await (supabase as any).rpc('log_audit', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch {
    // Silent fail — audit logging must never block user actions
  }
}
