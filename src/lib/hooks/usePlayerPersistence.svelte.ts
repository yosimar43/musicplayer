/**
 * Hook para manejar la persistencia del volumen del reproductor
 * Sincroniza automáticamente con playerStore usando usePersistedState
 */

import { untrack } from 'svelte';
import { usePersistedState } from './usePersistedState.svelte';
import { playerStore } from '@/lib/stores/player.store.svelte';

const DEFAULT_VOLUME = 70;

export function usePlayerPersistence() {
    // Persistir volumen
    const persistedVolume = usePersistedState<number>({
        key: 'player-volume',
        defaultValue: DEFAULT_VOLUME
    });

    // ✅ CORREGIDO: Un solo effect que maneja la sincronización
    // 1. Al inicio: cargar volumen persistido al store
    // 2. Después: guardar cambios del store en persistencia
    
    let isInitialized = false;

    $effect(() => {
        if (!isInitialized && persistedVolume.isHydrated) {
            // Primera vez: cargar valor persistido al store
            untrack(() => {
                playerStore.setVolume(persistedVolume.value);
            });
            isInitialized = true;
            console.log('🔊 Volumen restaurado:', persistedVolume.value);
        }
    });

    // Guardar cambios del store a persistencia (unidireccional)
    $effect(() => {
        if (!isInitialized) return; // No guardar antes de inicializar
        
        const currentVolume = playerStore.volume;
        
        // Solo guardar si realmente cambió (evita loops)
        untrack(() => {
            if (currentVolume !== persistedVolume.value) {
                persistedVolume.value = currentVolume;
            }
        });
    });

    return {
        get volume() {
            return persistedVolume.value;
        }
    };
}
