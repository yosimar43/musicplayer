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

  // Verificar si estamos en el browser
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  // Cargar valor inicial del localStorage
  let initialValue: T = defaultValue;
  if (isBrowser) {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        initialValue = deserializer(stored);
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando estado persistido "${key}":`, error);
    }
  }

  let value = $state<T>(initialValue);
  // ✅ CORREGIDO: isHydrated = true inmediatamente si cargamos del storage
  let isHydrated = $state(isBrowser);
  
  // Track del valor anterior para evitar guardados innecesarios
  let previousValue: T = initialValue;

  // Sincronizar con localStorage cuando cambia el valor
  $effect(() => {
    if (!isBrowser || !isHydrated) return;
    
    const currentValue = value;

    // Solo guardar si el valor realmente cambió
    if (currentValue !== previousValue) {
      try {
        localStorage.setItem(key, serializer(currentValue));
        previousValue = currentValue;
        console.log(`💾 Estado "${key}" guardado:`, currentValue);
      } catch (error) {
        console.error(`❌ Error guardando estado "${key}":`, error);
      }
    }
  });

  // Sincronizar entre tabs/ventanas
  if (syncAcrossTabs && isBrowser) {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserializer(e.newValue);
          untrack(() => {
            value = newValue;
            previousValue = newValue;
          });
          console.log(`🔄 Estado "${key}" sincronizado desde otra tab`);
        } catch (error) {
          console.error(`❌ Error sincronizando estado "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    // Cleanup
    $effect(() => {
      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    });
  }

  function reset() {
    untrack(() => {
      value = defaultValue;
      previousValue = defaultValue;
    });
    if (isBrowser) {
      try {
        localStorage.removeItem(key);
        console.log(`🗑️ Estado "${key}" eliminado del localStorage`);
      } catch (error) {
        console.error(`❌ Error eliminando estado "${key}":`, error);
      }
    }
  }

  function update(updater: (current: T) => T) {
    value = updater(value);
  }

  return {
    get value() { return value; },
    set value(newValue: T) { value = newValue; },
    get isHydrated() { return isHydrated; },
    reset,
    update
  };
}
