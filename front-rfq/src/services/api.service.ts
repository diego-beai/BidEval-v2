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
      console.error('⏱️ Timeout alcanzado:', {
        url,
        timeout: `${timeout / 1000}s`,
        message: 'El servidor n8n no respondió a tiempo. El workflow podría estar procesándose en segundo plano.'
      });
      throw new ApiError(
        `Timeout: El servidor no respondió en ${timeout / 1000} segundos. ` +
        `El procesamiento podría estar completándose en segundo plano. ` +
        `Por favor, verifica n8n o intenta de nuevo.`
      );
    }

    // Network/Fetch errors
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('failed to fetch') ||
          errorMsg.includes('network') ||
          errorMsg.includes('networkerror')) {
        console.error('🌐 Error de conexión:', {
          url,
          error: error.message
        });
        throw new ApiError('Error de conexión. Verifica tu conexión a internet o que n8n esté accesible.');
      }
    }

    throw error;
  }
}
