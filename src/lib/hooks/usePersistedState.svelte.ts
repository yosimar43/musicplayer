/**
 * Hook para estado persistente en localStorage
 * Útil para guardar preferencias de usuario, filtros, etc.
 */

import { untrack } from 'svelte';

interface PersistedStateOptions<T> {
  key: string;
  defaultValue: T;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  syncAcrossTabs?: boolean;
}

export function usePersistedState<T>(options: PersistedStateOptions<T>) {
  const {
    key,
    defaultValue,
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    syncAcrossTabs = true
  } = options;

  // Cargar valor inicial del localStorage
  let initialValue: T;
  try {
    const stored = localStorage.getItem(key);
    initialValue = stored ? deserializer(stored) : defaultValue;
  } catch (error) {
    console.warn(`⚠️ Error cargando estado persistido "${key}":`, error);
    initialValue = defaultValue;
  }

  let value = $state<T>(initialValue);
  let isHydrated = $state(false);

  // Sincronizar con localStorage cuando cambia el valor
  $effect(() => {
    const currentValue = value;
    
    if (isHydrated) {
      try {
        localStorage.setItem(key, serializer(currentValue));
        console.log(`💾 Estado "${key}" guardado en localStorage`);
      } catch (error) {
        console.error(`❌ Error guardando estado "${key}":`, error);
      }
    }
  });

  // Sincronizar entre tabs/ventanas
  if (syncAcrossTabs && typeof window !== 'undefined') {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          untrack(() => {
            value = deserializer(e.newValue!);
          });
          console.log(`🔄 Estado "${key}" sincronizado desde otra tab`);
        } catch (error) {
          console.error(`❌ Error sincronizando estado "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    
    // Cleanup
    if (typeof document !== 'undefined') {
      const cleanup = () => window.removeEventListener('storage', handleStorage);
      document.addEventListener('astro:before-swap', cleanup);
    }
  }

  // Marcar como hidratado después del primer render
  $effect(() => {
    isHydrated = true;
  });

  function reset() {
    untrack(() => {
      value = defaultValue;
    });
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Estado "${key}" eliminado del localStorage`);
    } catch (error) {
      console.error(`❌ Error eliminando estado "${key}":`, error);
    }
  }

  function update(updater: (current: T) => T) {
    untrack(() => {
      value = updater(value);
    });
  }

  return {
    get value() { return value; },
    set value(newValue: T) { value = newValue; },
    get isHydrated() { return isHydrated; },
    reset,
    update
  };
}
