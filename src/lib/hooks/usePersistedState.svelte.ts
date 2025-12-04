/**
 * Hook simple para estado persistente en localStorage
 */

interface PersistedStateOptions<T> {
  key: string;
  defaultValue: T;
}

export function usePersistedState<T>(options: PersistedStateOptions<T>) {
  const { key, defaultValue } = options;
  const isBrowser = typeof window !== 'undefined';

  // Cargar valor inicial
  let initialValue: T = defaultValue;
  if (isBrowser) {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        initialValue = JSON.parse(stored);
      }
    } catch {
      // Ignorar errores de parsing
    }
  }

  let value = $state<T>(initialValue);

  // Guardar en localStorage cuando cambia
  $effect(() => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignorar errores de storage lleno
    }
  });

  function reset() {
    value = defaultValue;
    if (isBrowser) {
      localStorage.removeItem(key);
    }
  }

  return {
    get value() { return value; },
    set value(newValue: T) { value = newValue; },
    get isHydrated() { return true; },
    reset
  };
}
