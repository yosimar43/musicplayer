export type Theme = "dark" | "light" | "system";
export type ViewMode = "grid" | "list" | "compact";

class UIStore {
  theme = $state<Theme>("dark");
  sidebarOpen = $state(true);
  miniPlayer = $state(false);
  viewMode = $state<ViewMode>("grid");
  showQueue = $state(false);
  showLyrics = $state(false);
  isFullscreen = $state(false);

  // Navbar auto-hide
  navbarHidden = $state(true);
  navbarElement = $state<HTMLElement | null>(null);
  navbarCleanup = $state<(() => void) | null>(null);

  // Preferencias
  showArtwork = $state(true);
  animationsEnabled = $state(true);

  // Notificaciones
  notifications = $state<string[]>([]);
}

export const uiStore = new UIStore();

/**
 * Cambia el tema
 */
export function setTheme(theme: Theme) {
  uiStore.theme = theme;

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
  uiStore.sidebarOpen = !uiStore.sidebarOpen;
}

/**
 * Alterna el modo mini player
 */
export function toggleMiniPlayer() {
  uiStore.miniPlayer = !uiStore.miniPlayer;
}

/**
 * Cambia el modo de vista
 */
export function setViewMode(mode: ViewMode) {
  uiStore.viewMode = mode;
  localStorage.setItem("viewMode", mode);
}

/**
 * Alterna la cola de reproducción
 */
export function toggleQueue() {
  uiStore.showQueue = !uiStore.showQueue;
}

/**
 * Alterna las letras
 */
export function toggleLyrics() {
  uiStore.showLyrics = !uiStore.showLyrics;
}

/**
 * Alterna pantalla completa
 */
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    uiStore.isFullscreen = true;
  } else {
    document.exitFullscreen();
    uiStore.isFullscreen = false;
  }
}

/**
 * Configura el auto-hide del navbar
 */
export function setupNavbarAutoHide(element: HTMLElement, activationDistance = 150) {
  uiStore.navbarElement = element;
  uiStore.navbarHidden = true; // Start hidden

  function handleMouseMove(event: MouseEvent) {
    if (!uiStore.navbarElement) return;

    const rect = uiStore.navbarElement.getBoundingClientRect();
    const mouseY = event.clientY;
    const distanceFromNav = mouseY - rect.bottom;

    // Show if mouse is within activation distance below the navbar
    uiStore.navbarHidden = mouseY > rect.bottom + activationDistance;
  }

  window.addEventListener('mousemove', handleMouseMove);

  uiStore.navbarCleanup = () => {
    window.removeEventListener('mousemove', handleMouseMove);
  };
}

/**
 * Limpia el auto-hide del navbar
 */
export function cleanupNavbarAutoHide() {
  if (uiStore.navbarCleanup) {
    uiStore.navbarCleanup();
    uiStore.navbarCleanup = null;
    uiStore.navbarElement = null;
  }
}

/**
 * Muestra una notificación
 */
export function notify(message: string, duration = 3000) {
  uiStore.notifications = [...uiStore.notifications, message];

  setTimeout(() => {
    uiStore.notifications = uiStore.notifications.filter(n => n !== message);
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
    uiStore.viewMode = savedViewMode;
  }

  const savedAnimations = localStorage.getItem("animationsEnabled");
  if (savedAnimations !== null) {
    uiStore.animationsEnabled = savedAnimations === "true";
  }
}

/**
 * Guarda las preferencias
 */
export function savePreferences() {
  localStorage.setItem("theme", uiStore.theme);
  localStorage.setItem("viewMode", uiStore.viewMode);
  localStorage.setItem("animationsEnabled", String(uiStore.animationsEnabled));
}