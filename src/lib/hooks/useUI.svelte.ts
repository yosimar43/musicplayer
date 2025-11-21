/**
 * Hook para gestionar el estado de UI
 * Encapsula notificaciones, preferencias y estado de UI
 */

import { uiStore, loadPreferences, notify as notifyGlobal, setTheme, toggleSidebar } from '@/lib/stores/ui.store';
import type { Theme, ViewMode } from '@/lib/stores/ui.store';

export interface UseUIReturn {
  // Estado reactivo
  theme: Theme;
  sidebarOpen: boolean;
  miniPlayer: boolean;
  viewMode: ViewMode;
  showQueue: boolean;
  showLyrics: boolean;
  isFullscreen: boolean;
  showArtwork: boolean;
  animationsEnabled: boolean;
  notifications: string[];
  
  // Métodos
  notify: (message: string, duration?: number) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  loadPreferences: () => void;
}

export function useUI(): UseUIReturn {
  // Valores derivados del estado global (reactivos)
  const theme = $derived(uiStore.theme);
  const sidebarOpen = $derived(uiStore.sidebarOpen);
  const miniPlayer = $derived(uiStore.miniPlayer);
  const viewMode = $derived(uiStore.viewMode);
  const showQueue = $derived(uiStore.showQueue);
  const showLyrics = $derived(uiStore.showLyrics);
  const isFullscreen = $derived(uiStore.isFullscreen);
  const showArtwork = $derived(uiStore.showArtwork);
  const animationsEnabled = $derived(uiStore.animationsEnabled);
  const notifications = $derived(uiStore.notifications);

  /**
   * Muestra una notificación
   */
  function notify(message: string, duration = 3000): void {
    notifyGlobal(message, duration);
  }

  return {
    // Estado reactivo
    get theme() { return theme; },
    get sidebarOpen() { return sidebarOpen; },
    get miniPlayer() { return miniPlayer; },
    get viewMode() { return viewMode; },
    get showQueue() { return showQueue; },
    get showLyrics() { return showLyrics; },
    get isFullscreen() { return isFullscreen; },
    get showArtwork() { return showArtwork; },
    get animationsEnabled() { return animationsEnabled; },
    get notifications() { return notifications; },
    
    // Métodos
    notify,
    setTheme,
    toggleSidebar,
    loadPreferences
  };
}

