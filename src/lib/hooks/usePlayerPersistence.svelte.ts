/**
 * Hook para manejar la persistencia del volumen del reproductor
 * Sincroniza automáticamente con playerStore usando usePersistedState
 */

import { usePersistedState } from './usePersistedState.svelte';
import { playerStore } from '@/lib/stores/player.store.svelte';

const DEFAULT_VOLUME = 70;

export function usePlayerPersistence() {
    // Persistir volumen
    const persistedVolume = usePersistedState<number>({
        key: 'player-volume',
        defaultValue: DEFAULT_VOLUME
    });

    // Sync bidireccional: persisted → playerStore
    $effect(() => {
        playerStore.volume = persistedVolume.value;
    });

    // Sync bidireccional: playerStore → persisted
    $effect(() => {
        const currentVolume = playerStore.volume;
        if (currentVolume !== persistedVolume.value) {
            persistedVolume.value = currentVolume;
        }
    });

    return {
        // Exponer para lectura si es necesario
        get volume() {
            return persistedVolume.value;
        }
    };
}
