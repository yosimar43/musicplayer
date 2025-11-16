/**
 * Hook para gestionar el estado de UI
 * Encapsula notificaciones, preferencias y estado de UI
 */

import { ui, loadPreferences, notify as notifyGlobal, setTheme, toggleSidebar } from '@/lib/state';
import type { Theme, ViewMode } from '@/lib/state/ui.svelte';

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
  const theme = $derived(ui.theme);
  const sidebarOpen = $derived(ui.sidebarOpen);
  const miniPlayer = $derived(ui.miniPlayer);
  const viewMode = $derived(ui.viewMode);
  const showQueue = $derived(ui.showQueue);
  const showLyrics = $derived(ui.showLyrics);
  const isFullscreen = $derived(ui.isFullscreen);
  const showArtwork = $derived(ui.showArtwork);
  const animationsEnabled = $derived(ui.animationsEnabled);
  const notifications = $derived(ui.notifications);

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

