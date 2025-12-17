import { untrack } from 'svelte';
import type { Track } from '$lib/types/music';

export type Theme = "dark" | "light" | "system";
export type ViewMode = "grid" | "list" | "compact";

class UIStore {
  // Estado UI Puro
  theme = $state<Theme>("dark");
  sidebarOpen = $state(true);
  miniPlayer = $state(false);
  viewMode = $state<ViewMode>("grid");
  showQueue = $state(false);
  showLyrics = $state(false);
  isFullscreen = $state(false);

  // Estado de Navbar (Solo estado, no lógica de detección)
  navbarHidden = $state(true);

  // Estado de drag
  isDragging = $state(false);

  // Estado para evitar enqueue múltiple durante drag
  isEnqueuedDuringDrag = $state(false);

  // Canción siendo arrastrada
  draggedTrack = $state<Track | null>(null);

  // Preferencias (se persistirán automáticamente via localStorage en componentes)
  showArtwork = $state(true);
  animationsEnabled = $state(true);

  // Notificaciones
  notifications = $state<string[]>([]);

  // --- Acciones ---

  /**
   * Cambia el tema (el hook debe manejar el efecto DOM)
   */
  setTheme(theme: Theme) {
    untrack(() => {
      this.theme = theme;
    });
  }

  /**
   * Alterna la barra lateral
   */
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * Alterna el modo mini player
   */
  toggleMiniPlayer() {
    this.miniPlayer = !this.miniPlayer;
  }

  /**
   * Cambia el modo de vista
   */
  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
  }

  /**
   * Alterna la cola de reproducción
   */
  toggleQueue() {
    this.showQueue = !this.showQueue;
  }

  /**
   * Alterna las letras
   */
  toggleLyrics() {
    this.showLyrics = !this.showLyrics;
  }

  /**
   * Establece estado de pantalla completa (el hook debe manejar la lógica DOM)
   */
  setFullscreen(isFullscreen: boolean) {
    untrack(() => {
      this.isFullscreen = isFullscreen;
    });
  }

  /**
   * Establece la visibilidad del navbar
   */
  setNavbarHidden(hidden: boolean) {
    untrack(() => {
      this.navbarHidden = hidden;
    });
  }

  /**
   * Establece el estado de drag
   */
  setDragging(isDragging: boolean) {
    untrack(() => {
      this.isDragging = isDragging;
    });
  }

  /**
   * Establece si se ha encolado durante el drag actual
   */
  setEnqueuedDuringDrag(enqueued: boolean) {
    untrack(() => {
      this.isEnqueuedDuringDrag = enqueued;
    });
  }

  /**
   * Establece la canción siendo arrastrada
   */
  setDraggedTrack(track: Track | null) {
    untrack(() => {
      this.draggedTrack = track;
    });
  }

  /**
   * Muestra una notificación (setTimeout debe manejarse en hook)
   */
  addNotification(message: string) {
    untrack(() => {
      this.notifications = [...this.notifications, message];
    });
  }

  /**
   * Elimina una notificación
   */
  removeNotification(message: string) {
    untrack(() => {
      this.notifications = this.notifications.filter(n => n !== message);
    });
  }
}

export const uiStore = new UIStore();
