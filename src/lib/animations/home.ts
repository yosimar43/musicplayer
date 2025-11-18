/**
 * 🎨 Timeline de animaciones para la página principal - Anime.js eliminado
 * Funciones placeholder para mantener compatibilidad
 * Respeta prefers-reduced-motion
 */

export interface HomeTimelineOptions {
  targets?: string;
  respectMotion?: boolean;
}

interface AnimationInstance {
  play: () => void;
  pause: () => void;
}

/**
 * Timeline principal de la página home - Placeholder (sin animación)
 * Orden de animación eliminado:
 * 1. Header (fade + slide down)
 * 2. Stats badges (slide from left, con stagger)
 * 3. Button (scale in)
 * 4. Icon glow (pulse suave)
 */
export const homeTimeline = (options: HomeTimelineOptions = {}): AnimationInstance => {
  // Animaciones eliminadas - usar CSS transitions si es necesario
  return {
    play: () => {},
    pause: () => {}
  };
};

/**
 * Timeline para tracks cuando se cargan - Placeholder (sin animación)
 * Stagger fade + slide up eliminado
 */
export const tracksTimeline = (targets: string = '.tracks .track-item'): AnimationInstance => {
  // Animaciones eliminadas - usar CSS transitions si es necesario
  return {
    play: () => {},
    pause: () => {}
  };
};

/**
 * Limpia todas las animaciones de un contenedor - Placeholder
 */
export const cleanupAnimations = (targets: string) => {
  // No hay animaciones que limpiar
};

