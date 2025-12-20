/**
 * Hook para gestionar el estado de UI con persistencia y efectos DOM
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

  // Effect para aplicar tema al DOM cuando cambia
  $effect(() => {
    if (typeof document === 'undefined') return;
    
    const theme = persistedTheme.value;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });

  /**
   * Cambia el tema y aplica al DOM
   */
  function setTheme(theme: Theme) {
    persistedTheme.value = theme;
    uiStore.setTheme(theme);
  }

  /**
   * Alterna pantalla completa con manejo de DOM
   */
  async function toggleFullscreen() {
    if (typeof document === 'undefined') return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        uiStore.setFullscreen(true);
      } else {
        await document.exitFullscreen();
        uiStore.setFullscreen(false);
      }
    } catch (error) {
      console.error('❌ Error toggling fullscreen:', error);
    }
  }

  /**
   * Muestra una notificación temporal
   */
  function notify(message: string, duration = 3000) {
    uiStore.addNotification(message);
    
    setTimeout(() => {
      uiStore.removeNotification(message);
    }, duration);
  }

  return {
    // Preferencias persistidas
    get theme() { return persistedTheme.value; },
    setTheme,

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
    toggleSidebar: () => uiStore.toggleSidebar(),
    
    get miniPlayer() { return uiStore.miniPlayer; },
    toggleMiniPlayer: () => uiStore.toggleMiniPlayer(),
    
    get showQueue() { return uiStore.showQueue; },
    toggleQueue: () => uiStore.toggleQueue(),
    
    get showLyrics() { return uiStore.showLyrics; },
    toggleLyrics: () => uiStore.toggleLyrics(),
    
    get showSearchModal() { return uiStore.showSearchModal; },
    toggleSearchModal: () => uiStore.toggleSearchModal(),
    setSearchModal: (open: boolean) => uiStore.setSearchModal(open),
    
    get isFullscreen() { return uiStore.isFullscreen; },
    toggleFullscreen,
    
    get showArtwork() { return uiStore.showArtwork; },
    get notifications() { return uiStore.notifications; },
    notify,
    
    get navbarHidden() { return uiStore.navbarHidden; },
    setNavbarHidden: (hidden: boolean) => uiStore.setNavbarHidden(hidden)
  };
}
