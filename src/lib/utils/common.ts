/**
 * 🛠️ Utilidades comunes del proyecto
 * Helpers reutilizables para toda la aplicación
 */

/**
 * Formatea milisegundos a formato MM:SS
 */
export function formatDuration(ms: number): string {
  if (!ms || isNaN(ms)) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formatea segundos a formato MM:SS
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Obtiene el color según el nivel de popularidad (0-100)
 */
export function getPopularityColor(popularity: number): string {
  if (popularity >= 80) return 'text-green-400';
  if (popularity >= 60) return 'text-yellow-400';
  if (popularity >= 40) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Obtiene el color de fondo según el nivel de popularidad (0-100)
 */
export function getPopularityBgColor(popularity: number): string {
  if (popularity >= 70) return '#22c55e'; // green-500
  if (popularity >= 40) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function para optimizar eventos frecuentes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Valida si una URL es válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrae el nombre del artista desde una lista de artistas
 */
export function formatArtists(artists: string[], maxCount = 2): string {
  if (artists.length === 0) return 'Artista Desconocido';
  if (artists.length <= maxCount) return artists.join(', ');
  return `${artists.slice(0, maxCount).join(', ')} y ${artists.length - maxCount} más`;
}

/**
 * Genera una clave única para cache basada en múltiples parámetros
 */
export function generateCacheKey(...params: string[]): string {
  return params.map(p => p.toLowerCase().trim()).join('::');
}

/**
 * Manejo seguro de errores para mensajes de usuario
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error desconocido';
}

/**
 * Espera un tiempo específico (útil para delays en async)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp: Restringe un valor entre un mínimo y máximo
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
