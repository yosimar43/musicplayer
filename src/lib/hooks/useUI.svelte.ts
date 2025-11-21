/**
 * Hook para gestionar el estado de UI
 * Encapsula notificaciones, preferencias y estado de UI
 */

import { usePersistedState } from './usePersistedState.svelte';
import { uiStore, setTheme, setViewMode, type Theme, type ViewMode } from '@/lib/stores/ui.store.svelte';

export interface UseUIReturn {
  theme: Theme;
  viewMode: ViewMode;
  animationsEnabled: boolean;
  sidebarOpen: boolean;
  miniPlayer: boolean;
  showQueue: boolean;
  showLyrics: boolean;
  isFullscreen: boolean;
  showArtwork: boolean;
  notifications: string[];
  navbarHidden: boolean;
}

/**
 * Hook mejorado para UI state con persistencia automática
 * Ahora usa usePersistedState para theme, viewMode y animationsEnabled
 */
export function useUI(): UseUIReturn {
  // ✅ Persistir theme con usePersistedState
  const persistedTheme = usePersistedState<Theme>({
    key: 'ui-theme',
    defaultValue: 'dark',
    syncAcrossTabs: true
  });

  // ✅ Persistir viewMode con usePersistedState
  const persistedViewMode = usePersistedState<ViewMode>({
    key: 'ui-viewMode',
    defaultValue: 'grid',
    syncAcrossTabs: true
  });

  // ✅ Persistir animationsEnabled con usePersistedState
  const persistedAnimations = usePersistedState<boolean>({
    key: 'ui-animationsEnabled',
    defaultValue: true,
    syncAcrossTabs: true
  });

  // Sincronizar con uiStore cuando cambian valores persistidos
  $effect(() => {
    if (persistedTheme.isHydrated) {
      setTheme(persistedTheme.value);
    }
  });

  $effect(() => {
    if (persistedViewMode.isHydrated) {
      setViewMode(persistedViewMode.value);
    }
  });

  $effect(() => {
    if (persistedAnimations.isHydrated) {
      uiStore.animationsEnabled = persistedAnimations.value;
    }
  });

  // Valores reactivos del store (no persistidos)
  const sidebarOpen = $derived(uiStore.sidebarOpen);
  const miniPlayer = $derived(uiStore.miniPlayer);
  const showQueue = $derived(uiStore.showQueue);
  const showLyrics = $derived(uiStore.showLyrics);
  const isFullscreen = $derived(uiStore.isFullscreen);
  const showArtwork = $derived(uiStore.showArtwork);
  const notifications = $derived(uiStore.notifications);
  const navbarHidden = $derived(uiStore.navbarHidden);

  return {
    // Estado reactivo con getters/setters para preferencias persistidas
    get theme() { return persistedTheme.value; },
    set theme(value: Theme) {
      persistedTheme.value = value;
      setTheme(value);
    },

    get viewMode() { return persistedViewMode.value; },
    set viewMode(value: ViewMode) {
      persistedViewMode.value = value;
      setViewMode(value);
    },

    get animationsEnabled() { return persistedAnimations.value; },
    set animationsEnabled(value: boolean) {
      persistedAnimations.value = value;
      uiStore.animationsEnabled = value;
    },

    // Estado reactivo directo del store (no persistido)
    get sidebarOpen() { return sidebarOpen; },
    get miniPlayer() { return miniPlayer; },
    get showQueue() { return showQueue; },
    get showLyrics() { return showLyrics; },
    get isFullscreen() { return isFullscreen; },
    get showArtwork() { return showArtwork; },
    get notifications() { return notifications; },
    get navbarHidden() { return navbarHidden; }
  };
}
