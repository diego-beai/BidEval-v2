import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Rate limiter using rate_limit_counters table.
 * Returns true if request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  keyId: string,
  maxPerHour: number = 100
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const windowKey = `api:${keyId}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3600000); // 1 hour ago

  // Get current counter
  const { data: counter } = await supabase
    .from('rate_limit_counters')
    .select('count, window_start')
    .eq('key', windowKey)
    .maybeSingle();

  if (!counter || new Date(counter.window_start) < windowStart) {
    // New window — reset counter
    await supabase
      .from('rate_limit_counters')
      .upsert({
        key: windowKey,
        count: 1,
        window_start: now.toISOString(),
      });
    return { allowed: true, remaining: maxPerHour - 1 };
  }

  if (counter.count >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter
  await supabase
    .from('rate_limit_counters')
    .update({ count: counter.count + 1 })
    .eq('key', windowKey);

  return { allowed: true, remaining: maxPerHour - counter.count - 1 };
}
