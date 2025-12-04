/**
 * Hook para persistir volumen del reproductor
 */

import { untrack } from 'svelte';
import { usePersistedState } from './usePersistedState.svelte';
import { playerStore } from '@/lib/stores/player.store.svelte';

export function usePlayerPersistence() {
  const persistedVolume = usePersistedState<number>({
    key: 'player-volume',
    defaultValue: 70
  });

  let isInitialized = false;

  // Cargar volumen persistido al store al inicio
  $effect(() => {
    if (!isInitialized) {
      untrack(() => {
        playerStore.setVolume(persistedVolume.value);
      });
      isInitialized = true;
    }
  });

  // Guardar cambios del store a localStorage
  $effect(() => {
    if (!isInitialized) return;
    const currentVolume = playerStore.volume;
    untrack(() => {
      if (currentVolume !== persistedVolume.value) {
        persistedVolume.value = currentVolume;
      }
    });
  });

  return {
    get volume() { return persistedVolume.value; }
  };
}
