import { API_CONFIG } from '../config/constants';
import { ApiError } from '../types/api.types';

/**
 * Wrapper de fetch con timeout configurable
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = API_CONFIG.REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏱️ Timeout reached:', {
        url,
        timeout: `${timeout / 1000}s`,
        message: 'The n8n server did not respond within the limit. AI processes can take up to 30 minutes.'
      });
      throw new ApiError(
        `Timeout: The server did not respond in ${timeout / 1000} seconds. ` +
        `AI-powered PDF processing can take up to 30 minutes. ` +
        `The workflow might still be completing in the background. ` +
        `Please check the status in n8n or contact your administrator if the problem persists.`
      );
    }

    // Network/Fetch errors
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('failed to fetch') ||
        errorMsg.includes('network') ||
        errorMsg.includes('networkerror')) {
        console.error('🌐 Connection error:', {
          url,
          error: error.message
        });
        throw new ApiError('Connection error. Please check your internet connection or ensure n8n is accessible.');
      }
    }

    throw error;
  }
}
