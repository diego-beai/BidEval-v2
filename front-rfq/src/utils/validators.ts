import { API_CONFIG } from '../config/constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida un archivo antes de subirlo
 */
export function validateFile(file: File): ValidationResult {
  // Check file type
  if (!API_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Solo se permiten archivos PDF'
    };
  }

  // Check file extension
  const hasValidExtension = API_CONFIG.ALLOWED_EXTENSIONS.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'El archivo debe tener extensión .pdf'
    };
  }

  // Check file size
  if (file.size > API_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = API_CONFIG.MAX_FILE_SIZE / 1024 / 1024;
    return {
      valid: false,
      error: `El archivo debe ser menor a ${maxSizeMB}MB`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'El archivo está vacío'
    };
  }

  return { valid: true };
}
