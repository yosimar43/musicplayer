export type Theme = "dark" | "light" | "system";
export type ViewMode = "grid" | "list" | "compact";

class UIState {
  theme = $state<Theme>("dark");
  sidebarOpen = $state(true);
  miniPlayer = $state(false);
  viewMode = $state<ViewMode>("grid");
  showQueue = $state(false);
  showLyrics = $state(false);
  isFullscreen = $state(false);
  
  // Preferencias
  showArtwork = $state(true);
  animationsEnabled = $state(true);
  
  // Notificaciones
  notifications = $state<string[]>([]);
}

export const ui = new UIState();

/**
 * Cambia el tema
 */
export function setTheme(theme: Theme) {
  ui.theme = theme;
  
  // Aplicar al documento
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  
  // Guardar preferencia
  localStorage.setItem("theme", theme);
}

/**
 * Alterna la barra lateral
 */
export function toggleSidebar() {
  ui.sidebarOpen = !ui.sidebarOpen;
}

/**
 * Alterna el modo mini player
 */
export function toggleMiniPlayer() {
  ui.miniPlayer = !ui.miniPlayer;
}

/**
 * Cambia el modo de vista
 */
export function setViewMode(mode: ViewMode) {
  ui.viewMode = mode;
  localStorage.setItem("viewMode", mode);
}

/**
 * Alterna la cola de reproducción
 */
export function toggleQueue() {
  ui.showQueue = !ui.showQueue;
}

/**
 * Alterna las letras
 */
export function toggleLyrics() {
  ui.showLyrics = !ui.showLyrics;
}

/**
 * Alterna pantalla completa
 */
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    ui.isFullscreen = true;
  } else {
    document.exitFullscreen();
    ui.isFullscreen = false;
  }
}

/**
 * Muestra una notificación
 */
export function notify(message: string, duration = 3000) {
  ui.notifications = [...ui.notifications, message];
  
  setTimeout(() => {
    ui.notifications = ui.notifications.filter(n => n !== message);
  }, duration);
}

/**
 * Carga las preferencias guardadas
 */
export function loadPreferences() {
  const savedTheme = localStorage.getItem("theme") as Theme | null;
  if (savedTheme) {
    setTheme(savedTheme);
  }
  
  const savedViewMode = localStorage.getItem("viewMode") as ViewMode | null;
  if (savedViewMode) {
    ui.viewMode = savedViewMode;
  }
  
  const savedAnimations = localStorage.getItem("animationsEnabled");
  if (savedAnimations !== null) {
    ui.animationsEnabled = savedAnimations === "true";
  }
}

/**
 * Guarda las preferencias
 */
export function savePreferences() {
  localStorage.setItem("theme", ui.theme);
  localStorage.setItem("viewMode", ui.viewMode);
  localStorage.setItem("animationsEnabled", String(ui.animationsEnabled));
}
