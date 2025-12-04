/**
 * Hook para gestionar el estado de UI con persistencia
 */

import { usePersistedState } from './usePersistedState.svelte';
import { uiStore, type Theme, type ViewMode } from '@/lib/stores/ui.store.svelte';

/**
 * Hook simplificado para UI state con persistencia automática
 */
export function useUI() {
  // Persistir preferencias de UI
  const persistedTheme = usePersistedState<Theme>({ key: 'ui-theme', defaultValue: 'dark' });
  const persistedViewMode = usePersistedState<ViewMode>({ key: 'ui-viewMode', defaultValue: 'grid' });
  const persistedAnimations = usePersistedState<boolean>({ key: 'ui-animationsEnabled', defaultValue: true });

  // Sincronizar con uiStore al cargar
  $effect(() => {
    uiStore.setTheme(persistedTheme.value);
  });

  $effect(() => {
    uiStore.setViewMode(persistedViewMode.value);
  });

  $effect(() => {
    uiStore.animationsEnabled = persistedAnimations.value;
  });

  return {
    // Preferencias persistidas
    get theme() { return persistedTheme.value; },
    set theme(value: Theme) {
      persistedTheme.value = value;
      uiStore.setTheme(value);
    },

    get viewMode() { return persistedViewMode.value; },
    set viewMode(value: ViewMode) {
      persistedViewMode.value = value;
      uiStore.setViewMode(value);
    },

    get animationsEnabled() { return persistedAnimations.value; },
    set animationsEnabled(value: boolean) {
      persistedAnimations.value = value;
      uiStore.animationsEnabled = value;
    },

    // Estado directo del store (no persistido)
    get sidebarOpen() { return uiStore.sidebarOpen; },
    get miniPlayer() { return uiStore.miniPlayer; },
    get showQueue() { return uiStore.showQueue; },
    get showLyrics() { return uiStore.showLyrics; },
    get isFullscreen() { return uiStore.isFullscreen; },
    get showArtwork() { return uiStore.showArtwork; },
    get notifications() { return uiStore.notifications; },
    get navbarHidden() { return uiStore.navbarHidden; }
  };
}
