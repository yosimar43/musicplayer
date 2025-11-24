import { untrack } from 'svelte';

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

  // Preferencias (se persistirán automáticamente via localStorage en componentes)
  showArtwork = $state(true);
  animationsEnabled = $state(true);

  // Notificaciones
  notifications = $state<string[]>([]);

  // --- Acciones ---

  /**
   * Cambia el tema
   */
  setTheme(theme: Theme) {
    this.theme = theme;
    // Efecto secundario en DOM permitido aquí o en un efecto en App.svelte
    if (typeof document !== 'undefined') {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
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
   * Alterna pantalla completa
   */
  toggleFullscreen() {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(err));
        this.isFullscreen = true;
      } else {
        document.exitFullscreen().catch(err => console.error(err));
        this.isFullscreen = false;
      }
    }
  }

  /**
   * Establece la visibilidad del navbar
   */
  setNavbarHidden(hidden: boolean) {
    this.navbarHidden = hidden;
  }

  /**
   * Muestra una notificación
   */
  notify(message: string, duration = 3000) {
    this.notifications = [...this.notifications, message];
    setTimeout(() => {
      // Usar filter es seguro en Svelte 5
      this.notifications = this.notifications.filter(n => n !== message);
    }, duration);
  }
}

export const uiStore = new UIStore();
