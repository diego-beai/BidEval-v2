/**
 * Input sanitization utilities for defense-in-depth XSS prevention.
 *
 * React escapes output by default, but this sanitizer protects against:
 * - Stored XSS if data is used in non-React contexts (emails, PDFs, etc.)
 * - Future code that might use dangerouslySetInnerHTML
 */

/**
 * Sanitize user text input by stripping dangerous HTML patterns.
 * Preserves normal text including <, >, & characters when used literally.
 */
export function sanitizeText(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return input as string;

    return input
        // Strip <script>...</script> blocks
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Strip <iframe>...</iframe> blocks
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Strip <object>...</object> blocks
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        // Strip <embed> tags
        .replace(/<embed\b[^>]*\/?>/gi, '')
        // Strip <link> tags (can load external resources)
        .replace(/<link\b[^>]*\/?>/gi, '')
        // Strip inline event handlers (onclick, onerror, onload, etc.)
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
        // Strip javascript: URLs
        .replace(/javascript\s*:/gi, 'blocked:')
        // Strip data: URLs with script content
        .replace(/data\s*:\s*text\/html/gi, 'blocked:text/html')
        .trim();
}

/**
 * Sanitize an object's string fields recursively.
 * Only processes string values, leaves other types untouched.
 */
export function sanitizeFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
    const sanitized = { ...obj };
    for (const field of fields) {
        const value = sanitized[field];
        if (typeof value === 'string') {
            (sanitized as any)[field] = sanitizeText(value);
        }
    }
    return sanitized;
}
