import { API_CONFIG } from '../config/constants';
import { ApiError } from '../types/api.types';

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Calculates exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  // Add random jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponentialDelay + jitter);
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown, config: RetryConfig): boolean {
  if (error instanceof ApiError && error.statusCode) {
    return config.retryableStatusCodes.includes(error.statusCode);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Retry network errors
    return msg.includes('failed to fetch') ||
           msg.includes('network') ||
           msg.includes('networkerror') ||
           msg.includes('econnreset') ||
           msg.includes('econnrefused');
  }
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets the current auth JWT for API calls (non-demo mode only).
 * Lazily imports to avoid circular dependencies.
 */
async function getAuthToken(): Promise<string | null> {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return null;
  try {
    const { supabase } = await import('../lib/supabase');
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Wrapper de fetch con timeout configurable y retry automático
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = API_CONFIG.REQUEST_TIMEOUT,
  retryConfig: Partial<RetryConfig> = {},
  externalSignal?: AbortSignal
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  // Inject Authorization header if authenticated
  const token = await getAuthToken();
  if (token) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    options = { ...options, headers };
  }

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // If an external signal is provided, forward its abort to our controller
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new ApiError('Operation cancelled by user');
      }
      externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const error = new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorText
        );

        // Check if we should retry this status code
        if (isRetryableError(error, config) && attempt < config.maxRetries) {
          const delay = calculateBackoff(attempt, config);
          await sleep(delay);
          lastError = error;
          continue;
        }

        throw error;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);

      // User-initiated cancellation via external signal
      if (externalSignal?.aborted && error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Operation cancelled by user');
      }

      // Timeout error - don't retry for long-running operations
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          `Timeout: The server did not respond in ${timeout / 1000} seconds. ` +
          `AI-powered PDF processing can take up to 30 minutes. ` +
          `The workflow might still be completing in the background. ` +
          `Please check the status in n8n or contact your administrator if the problem persists.`
        );
      }

      // Check if error is retryable
      if (isRetryableError(error, config) && attempt < config.maxRetries) {
        const delay = calculateBackoff(attempt, config);
        await sleep(delay);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      // Network/Fetch errors (non-retryable or max retries reached)
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('failed to fetch') ||
          errorMsg.includes('network') ||
          errorMsg.includes('networkerror')) {
          const retryInfo = attempt > 0 ? ` (after ${attempt} retries)` : '';
          throw new ApiError(`Connection error${retryInfo}. Please check your internet connection or ensure n8n is accessible.`);
        }
      }

      throw error;
    }
  }

  // This should not be reached, but just in case
  throw lastError || new ApiError('Unknown error after retries');
}
