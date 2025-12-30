import { clsx, type ClassValue } from 'clsx';

/**
 * Utilidad para combinar classNames de forma condicional
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
