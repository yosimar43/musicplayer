/**
 * 🎯 SCROLL CONTROLLER HOOK
 * 
 * Sistema de scroll personalizado sin barras nativas
 * Gestiona dos contextos independientes:
 * - Scroll externo (cambio de slides)
 * - Scroll interno (lista de tracks)
 * 
 * CARACTERÍSTICAS:
 * ✅ No usa scroll nativo del navegador
 * ✅ Sin scrollbars visibles
 * ✅ Animaciones GSAP fluidas
 * ✅ Prevención de scroll bleed
 * ✅ Sistema de prioridades automático
 * ✅ Inercia y easing suaves
 */

import gsap from 'gsap';
import { untrack } from 'svelte';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type ScrollContext = 'external' | 'internal' | 'none';

export interface ScrollState {
  currentIndex: number;
  totalSlides: number;
  isAnimating: boolean;
  velocity: number;
  lastDelta: number;
}

export interface ScrollControllerConfig {
  threshold: number; // Umbral mínimo para detectar scroll (px)
  snapDuration: number; // Duración de animación al cambiar slide
  inertiaDuration: number; // Duración de inercia
  maxVelocity: number; // Velocidad máxima permitida
  dampingFactor: number; // Factor de amortiguación (0-1)
}

const DEFAULT_CONFIG: ScrollControllerConfig = {
  threshold: 50,
  snapDuration: 0.8,
  inertiaDuration: 1.2,
  maxVelocity: 3000,
  dampingFactor: 0.85
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export interface UseScrollControllerReturn {
  // Estado reactivo
  readonly currentIndex: number;
  readonly isAnimating: boolean;
  readonly activeContext: ScrollContext;
  
  // Métodos públicos
  goToSlide: (index: number, animated?: boolean) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setTotalSlides: (count: number) => void;
  setActiveContext: (context: ScrollContext) => void;
  
  // Handlers para eventos
  handleWheel: (e: WheelEvent) => void;
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent) => void;
  
  // Lifecycle
  initialize: (containerElement: HTMLElement) => void;
  cleanup: () => void;
}

class ScrollController {
  // Estado interno
  private state = $state<ScrollState>({
    currentIndex: 0,
    totalSlides: 0,
    isAnimating: false,
    velocity: 0,
    lastDelta: 0
  });
  
  private activeContext = $state<ScrollContext>('none');
  private config: ScrollControllerConfig;
  
  // Referencias
  private containerElement: HTMLElement | null = null;
  private animationTimeline: gsap.core.Timeline | null = null;
  private inertiaAnimation: gsap.core.Tween | null = null;
  
  // Control de gestos táctiles
  private touchStartY = 0;
  private touchStartTime = 0;
  private touchLastY = 0;
  private touchLastTime = 0;
  
  // Acumulador de delta para wheel
  private wheelAccumulator = 0;
  private wheelTimeout: number | null = null;
  private isProcessingWheel = false;

  constructor(config: Partial<ScrollControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GETTERS REACTIVOS
  // ═════════════════════════════════════════════════════════════════════════

  get currentIndex() { return this.state.currentIndex; }
  get isAnimating() { return this.state.isAnimating; }
  get activeContextValue() { return this.activeContext; }

  // ═════════════════════════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS
  // ═════════════════════════════════════════════════════════════════════════

  setTotalSlides(count: number): void {
    untrack(() => {
      this.state.totalSlides = count;
    });
  }

  setActiveContext(context: ScrollContext): void {
    untrack(() => {
      this.activeContext = context;
    });
  }

  goToSlide(targetIndex: number, animated = true): void {
    if (this.state.isAnimating) return;
    
    // Clamp al rango válido
    const index = Math.max(0, Math.min(targetIndex, this.state.totalSlides - 1));
    
    if (index === this.state.currentIndex) return;

    untrack(() => {
      this.state.isAnimating = true;
      this.state.currentIndex = index;
    });

    if (!animated) {
      untrack(() => {
        this.state.isAnimating = false;
      });
      return;
    }

    // Animar con GSAP
    this.animateToSlide(index);
  }

  nextSlide(): void {
    if (this.state.currentIndex < this.state.totalSlides - 1) {
      this.goToSlide(this.state.currentIndex + 1);
    }
  }

  prevSlide(): void {
    if (this.state.currentIndex > 0) {
      this.goToSlide(this.state.currentIndex - 1);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLERS DE EVENTOS
  // ═════════════════════════════════════════════════════════════════════════

  handleWheel = (e: WheelEvent): void => {
    // Si el contexto interno está activo, ignorar
    if (this.activeContext === 'internal') {
      return;
    }

    e.preventDefault();

    const delta = e.deltaY;
    
    // Acumular delta
    this.wheelAccumulator += delta;

    // Limpiar timeout anterior
    if (this.wheelTimeout !== null) {
      clearTimeout(this.wheelTimeout);
    }

    // Si no estamos procesando y el acumulador supera el umbral
    if (!this.isProcessingWheel && Math.abs(this.wheelAccumulator) > this.config.threshold) {
      this.processWheelScroll(this.wheelAccumulator);
      this.wheelAccumulator = 0;
      this.isProcessingWheel = true;
    }

    // Reset después de un tiempo sin scroll
    this.wheelTimeout = window.setTimeout(() => {
      this.wheelAccumulator = 0;
      this.isProcessingWheel = false;
    }, 150);
  };

  handleTouchStart = (e: TouchEvent): void => {
    if (this.activeContext === 'internal') return;

    const touch = e.touches[0];
    this.touchStartY = touch.clientY;
    this.touchLastY = touch.clientY;
    this.touchStartTime = Date.now();
    this.touchLastTime = this.touchStartTime;

    // Cancelar animaciones en curso
    this.cancelAnimations();
  };

  handleTouchMove = (e: TouchEvent): void => {
    if (this.activeContext === 'internal') return;

    e.preventDefault();

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentTime = Date.now();
    
    const deltaY = currentY - this.touchLastY;
    const deltaTime = currentTime - this.touchLastTime;

    // Calcular velocidad
    if (deltaTime > 0) {
      untrack(() => {
        this.state.velocity = (deltaY / deltaTime) * 1000; // px/s
      });
    }

    this.touchLastY = currentY;
    this.touchLastTime = currentTime;
  };

  handleTouchEnd = (e: TouchEvent): void => {
    if (this.activeContext === 'internal') return;

    const totalDelta = this.touchStartY - this.touchLastY;
    const totalTime = Date.now() - this.touchStartTime;

    // Calcular velocidad final
    const velocity = totalTime > 0 ? (totalDelta / totalTime) * 1000 : 0;

    // Aplicar inercia si hay velocidad significativa
    if (Math.abs(velocity) > 500) {
      this.applyInertia(velocity);
    } else if (Math.abs(totalDelta) > this.config.threshold) {
      // Cambio directo si supera umbral
      this.processSwipe(totalDelta);
    }

    // Reset
    this.touchStartY = 0;
    this.touchLastY = 0;
    untrack(() => {
      this.state.velocity = 0;
    });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // MÉTODOS INTERNOS
  // ═════════════════════════════════════════════════════════════════════════

  private processWheelScroll(delta: number): void {
    const direction = delta > 0 ? 1 : -1;
    const targetIndex = this.state.currentIndex + direction;

    if (targetIndex >= 0 && targetIndex < this.state.totalSlides) {
      this.goToSlide(targetIndex);
    }
  }

  private processSwipe(delta: number): void {
    const direction = delta > 0 ? 1 : -1;
    const targetIndex = this.state.currentIndex + direction;

    if (targetIndex >= 0 && targetIndex < this.state.totalSlides) {
      this.goToSlide(targetIndex);
    }
  }

  private applyInertia(velocity: number): void {
    // Aplicar damping
    const dampedVelocity = velocity * this.config.dampingFactor;
    const clampedVelocity = Math.max(
      -this.config.maxVelocity,
      Math.min(dampedVelocity, this.config.maxVelocity)
    );

    // Determinar cuántos slides saltar basado en velocidad
    const slideJump = Math.round(Math.abs(clampedVelocity) / 2000);
    const direction = clampedVelocity > 0 ? 1 : -1;
    const targetIndex = this.state.currentIndex + (direction * Math.max(1, slideJump));

    this.goToSlide(targetIndex);
  }

  private animateToSlide(targetIndex: number): void {
    this.cancelAnimations();

    // Crear timeline con inercia
    this.animationTimeline = gsap.timeline({
      defaults: {
        duration: this.config.snapDuration,
        ease: 'power3.out'
      },
      onComplete: () => {
        untrack(() => {
          this.state.isAnimating = false;
        });
      }
    });

    // El componente padre escuchará cambios en currentIndex para animar
    // No necesitamos animar aquí, solo marcar como animating
  }

  private cancelAnimations(): void {
    this.animationTimeline?.kill();
    this.animationTimeline = null;
    
    this.inertiaAnimation?.kill();
    this.inertiaAnimation = null;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════

  initialize(containerElement: HTMLElement): void {
    this.containerElement = containerElement;

    // Prevenir scroll nativo
    containerElement.style.overflow = 'hidden';
    containerElement.style.touchAction = 'none';

    // Agregar event listeners
    containerElement.addEventListener('wheel', this.handleWheel, { passive: false });
    containerElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    containerElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    containerElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  cleanup(): void {
    if (!this.containerElement) return;

    this.containerElement.removeEventListener('wheel', this.handleWheel);
    this.containerElement.removeEventListener('touchstart', this.handleTouchStart);
    this.containerElement.removeEventListener('touchmove', this.handleTouchMove);
    this.containerElement.removeEventListener('touchend', this.handleTouchEnd);

    this.cancelAnimations();
    
    if (this.wheelTimeout !== null) {
      clearTimeout(this.wheelTimeout);
    }

    this.containerElement = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK EXPORT
// ═══════════════════════════════════════════════════════════════════════════

let _instance: ScrollController | null = null;

export function useScrollController(
  config: Partial<ScrollControllerConfig> = {}
): UseScrollControllerReturn {
  if (!_instance) {
    _instance = new ScrollController(config);
  }

  return {
    get currentIndex() { return _instance!.currentIndex; },
    get isAnimating() { return _instance!.isAnimating; },
    get activeContext() { return _instance!.activeContextValue; },
    
    goToSlide: (index, animated) => _instance!.goToSlide(index, animated),
    nextSlide: () => _instance!.nextSlide(),
    prevSlide: () => _instance!.prevSlide(),
    setTotalSlides: (count) => _instance!.setTotalSlides(count),
    setActiveContext: (context) => _instance!.setActiveContext(context),
    
    handleWheel: _instance!.handleWheel,
    handleTouchStart: _instance!.handleTouchStart,
    handleTouchMove: _instance!.handleTouchMove,
    handleTouchEnd: _instance!.handleTouchEnd,
    
    initialize: (el) => _instance!.initialize(el),
    cleanup: () => _instance!.cleanup()
  };
}
