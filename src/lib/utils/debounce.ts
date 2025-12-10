/**
 * 🕐 Debounce utility
 * 
 * Retrasa la ejecución de una función hasta que hayan pasado N ms
 * sin nuevas invocaciones. Útil para búsquedas, redimensionado, scroll, etc.
 */

/**
 * Crea una función debounced que retrasa la invocación de `func`
 * hasta después de que hayan pasado `delay` ms sin nuevas llamadas
 * 
 * @param func - Función a ejecutar (con limpieza de timeout)
 * @param delay - Tiempo en ms a esperar antes de ejecutar
 * @returns Función debounced con método cancel()
 * 
 * @example
 * const search = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 * 
 * search('hello');
 * search('hello world'); // Solo este se ejecutará después de 300ms
 * 
 * // Para cancelar la ejecución pendiente
 * search.cancel();
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    // Cancelar el timeout anterior si existe
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Crear nuevo timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  } as T & { cancel: () => void };

  // Método para cancelar manualmente la ejecución pendiente
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Crea una función throttled que ejecuta `func` como máximo una vez cada `limit` ms
 * A diferencia de debounce, garantiza ejecución periódica durante llamadas continuas
 * 
 * @param func - Función a ejecutar
 * @param limit - Tiempo mínimo en ms entre ejecuciones
 * @returns Función throttled
 * 
 * @example
 * const onScroll = throttle(() => {
 *   console.log('Scroll position:', window.scrollY);
 * }, 100); // Como máximo cada 100ms
 * 
 * window.addEventListener('scroll', onScroll);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  } as T;
}
