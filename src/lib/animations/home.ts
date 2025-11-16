/**
 * 🎨 Timeline de animaciones para la página principal
 * Usa anime.js v4 con timeline limpio y reusable
 * Respeta prefers-reduced-motion
 */

import { animate, stagger } from 'animejs';

export interface HomeTimelineOptions {
  targets?: string;
  respectMotion?: boolean;
}

interface AnimationInstance {
  play: () => void;
  pause: () => void;
}

/**
 * Timeline principal de la página home
 * Orden de animación:
 * 1. Header (fade + slide down)
 * 2. Stats badges (slide from left, con stagger)
 * 3. Button (scale in)
 * 4. Icon glow (pulse suave)
 */
export const homeTimeline = (options: HomeTimelineOptions = {}): AnimationInstance => {
  const { targets = '.home-page', respectMotion = true } = options;

  // Verificar prefers-reduced-motion si está habilitado
  if (respectMotion && typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Retornar animación simple solo con fade-in
      const instance = animate(`${targets} *`, {
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad'
      });
      
      return {
        play: () => instance.play(),
        pause: () => instance.pause()
      };
    }
  }

  // Crear animaciones secuenciales usando delays en lugar de setTimeout
  const headerAnim = animate(`${targets} .header`, {
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: 800,
    easing: 'easeOutCubic',
    delay: 0
  });

  // Stats con stagger: cada badge se anima con delay incremental + 200ms base
  const statsAnim = animate(`${targets} .stats .stat-badge`, {
    opacity: [0, 1],
    translateX: [-30, 0],
    duration: 600,
    easing: 'easeOutCubic',
    delay: (el, i) => 200 + (i * 80) // 200ms base + stagger de 80ms por elemento
  });

  const buttonAnim = animate(`${targets} .load-button`, {
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 600,
    easing: 'spring(1, 80, 10, 0)',
    delay: 400
  });

  const iconGlowAnim = animate(`${targets} .icon-glow`, {
    opacity: [0.6, 1, 0.6],
    duration: 2000,
    easing: 'easeInOutQuad',
    loop: true,
    delay: 600
  });

  // Iniciar todas las animaciones (los delays están configurados)
  headerAnim.play();
  statsAnim.play();
  buttonAnim.play();
  iconGlowAnim.play();

  return {
    play: () => {
      headerAnim.play();
      statsAnim.play();
      buttonAnim.play();
      iconGlowAnim.play();
    },
    pause: () => {
      headerAnim.pause();
      statsAnim.pause();
      buttonAnim.pause();
      iconGlowAnim.pause();
    }
  };
};

/**
 * Timeline para tracks cuando se cargan
 * Stagger fade + slide up
 */
export const tracksTimeline = (targets: string = '.tracks .track-item'): AnimationInstance => {
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const instance = animate(targets, {
        opacity: [0, 1],
        duration: 200
      });
      
      return {
        play: () => instance.play(),
        pause: () => instance.pause()
      };
    }
  }

  const instance = animate(targets, {
    opacity: [0, 1],
    translateY: [15, 0],
    duration: 600,
    delay: stagger(60),
    easing: 'easeOutCubic'
  });

  return {
    play: () => instance.play(),
    pause: () => instance.pause()
  };
};

/**
 * Limpia todas las animaciones de un contenedor
 * Nota: anime.js v4 no tiene remove directo, las animaciones se limpian automáticamente
 */
export const cleanupAnimations = (targets: string) => {
  // En anime.js v4, las animaciones se limpian automáticamente cuando el elemento se elimina
  // Si necesitamos cancelar manualmente, podemos usar pause() en todas las instancias
  if (typeof document !== 'undefined') {
    const elements = document.querySelectorAll(targets);
    elements.forEach((el) => {
      // Las animaciones se cancelan automáticamente al eliminar elementos
      // No hay necesidad de limpieza manual en anime.js v4
    });
  }
};

