/**
 * 🎯 INNER LIST SCROLL HOOK
 * 
 * Scroll interno personalizado para listas de tracks
 * Funciona INDEPENDIENTE del scroll externo de slides
 * 
 * CARACTERÍSTICAS:
 * ✅ Scroll simulado sin scrollbar
 * ✅ Animaciones GSAP fluidas
 * ✅ Inercia natural
 * ✅ Lazy loading automático
 * ✅ Prevención de scroll bleed
 * ✅ Prioridad sobre scroll externo cuando está activo
 */

import gsap from 'gsap';
import { untrack } from 'svelte';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface InnerScrollState {
  scrollPosition: number; // Posición actual en px
  maxScroll: number; // Máximo scroll posible
  isScrolling: boolean;
  velocity: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

export interface InnerScrollConfig {
  inertiaDuration: number;
  dampingFactor: number;
  maxVelocity: number;
  lazyLoadThreshold: number; // % del scroll para cargar más (0-1)
}

const DEFAULT_CONFIG: InnerScrollConfig = {
  inertiaDuration: 0.8,
  dampingFactor: 0.9,
  maxVelocity: 5000,
  lazyLoadThreshold: 0.7
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseInnerListScrollReturn {
  // Estado reactivo
  readonly scrollPosition: number;
  readonly isScrolling: boolean;
  readonly canScrollUp: boolean;
  readonly canScrollDown: boolean;
  readonly progress: number; // 0-1
  
  // Métodos
  scrollTo: (position: number, animated?: boolean) => void;
  scrollBy: (delta: number, animated?: boolean) => void;
  resetScroll: () => void;
  updateBounds: () => void;
  
  // Handlers
  handleWheel: (e: WheelEvent) => boolean; // Retorna true si consumió el evento
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => boolean;
  handleTouchEnd: (e: TouchEvent) => void;
  
  // Callbacks
  onLazyLoad?: () => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
  
  // Lifecycle
  initialize: (containerEl: HTMLElement, contentEl: HTMLElement) => void;
  cleanup: () => void;
}

class InnerListScroll {
  private state = $state<InnerScrollState>({
    scrollPosition: 0,
    maxScroll: 0,
    isScrolling: false,
    velocity: 0,
    canScrollUp: false,
    canScrollDown: false
  });

  private config: InnerScrollConfig;
  
  // Referencias
  private containerElement: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private scrollAnimation: gsap.core.Tween | null = null;
  
  // Touch control
  private touchStartY = 0;
  private touchStartTime = 0;
  private touchLastY = 0;
  private touchLastTime = 0;
  private isTouching = false;
  
  // Callbacks
  public onLazyLoad?: () => void;
  public onScrollStart?: () => void;
  public onScrollEnd?: () => void;

  constructor(config: Partial<InnerScrollConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═════════════════════════════════════════════════════════════════════════

  get scrollPosition() { return this.state.scrollPosition; }
  get isScrolling() { return this.state.isScrolling; }
  get canScrollUp() { return this.state.canScrollUp; }
  get canScrollDown() { return this.state.canScrollDown; }
  
  get progress(): number {
    if (this.state.maxScroll === 0) return 0;
    return this.state.scrollPosition / this.state.maxScroll;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS
  // ═════════════════════════════════════════════════════════════════════════

  scrollTo(position: number, animated = true): void {
    const clampedPosition = Math.max(0, Math.min(position, this.state.maxScroll));
    
    if (clampedPosition === this.state.scrollPosition) return;

    this.cancelAnimation();

    if (!animated) {
      this.setScrollPosition(clampedPosition);
      this.applyTransform();
      return;
    }

    untrack(() => {
      this.state.isScrolling = true;
    });

    this.onScrollStart?.();

    this.scrollAnimation = gsap.to(this.state, {
      scrollPosition: clampedPosition,
      duration: 0.6,
      ease: 'power3.out',
      onUpdate: () => {
        this.applyTransform();
        this.updateBounds();
        this.checkLazyLoad();
      },
      onComplete: () => {
        untrack(() => {
          this.state.isScrolling = false;
        });
        this.onScrollEnd?.();
      }
    });
  }

  scrollBy(delta: number, animated = true): void {
    this.scrollTo(this.state.scrollPosition + delta, animated);
  }

  resetScroll(): void {
    this.cancelAnimation();
    this.setScrollPosition(0);
    this.applyTransform();
  }

  updateBounds(): void {
    if (!this.containerElement || !this.contentElement) return;

    const containerHeight = this.containerElement.clientHeight;
    const contentHeight = this.contentElement.scrollHeight;
    const maxScroll = Math.max(0, contentHeight - containerHeight);

    untrack(() => {
      this.state.maxScroll = maxScroll;
      this.state.canScrollUp = this.state.scrollPosition > 0;
      this.state.canScrollDown = this.state.scrollPosition < maxScroll;
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═════════════════════════════════════════════════════════════════════════

  handleWheel = (e: WheelEvent): boolean => {
    const delta = e.deltaY;
    
    // Verificar si podemos consumir el scroll
    const wouldScrollUp = delta < 0 && this.state.canScrollUp;
    const wouldScrollDown = delta > 0 && this.state.canScrollDown;
    
    if (!wouldScrollUp && !wouldScrollDown) {
      // No podemos scrollear en esta dirección, dejar pasar al scroll externo
      return false;
    }

    // Consumimos el evento
    e.preventDefault();
    e.stopPropagation();

    this.scrollBy(delta * 0.5, false); // Scroll directo sin animación
    
    return true; // Evento consumido
  };

  handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    this.touchStartY = touch.clientY;
    this.touchLastY = touch.clientY;
    this.touchStartTime = Date.now();
    this.touchLastTime = this.touchStartTime;
    this.isTouching = true;

    this.cancelAnimation();
  };

  handleTouchMove = (e: TouchEvent): boolean => {
    if (!this.isTouching) return false;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - this.touchLastY;
    
    // Verificar si podemos consumir el scroll
    const wouldScrollUp = deltaY > 0 && this.state.canScrollUp;
    const wouldScrollDown = deltaY < 0 && this.state.canScrollDown;
    
    if (!wouldScrollUp && !wouldScrollDown) {
      return false;
    }

    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();
    const deltaTime = currentTime - this.touchLastTime;

    if (deltaTime > 0) {
      untrack(() => {
        this.state.velocity = (deltaY / deltaTime) * 1000;
      });
    }

    this.scrollBy(-deltaY, false);

    this.touchLastY = currentY;
    this.touchLastTime = currentTime;

    return true;
  };

  handleTouchEnd = (e: TouchEvent): void => {
    if (!this.isTouching) return;

    this.isTouching = false;

    const velocity = this.state.velocity;
    
    // Aplicar inercia si hay velocidad significativa
    if (Math.abs(velocity) > 500) {
      this.applyInertia(velocity);
    }

    untrack(() => {
      this.state.velocity = 0;
    });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // MÉTODOS INTERNOS
  // ═════════════════════════════════════════════════════════════════════════

  private setScrollPosition(position: number): void {
    untrack(() => {
      this.state.scrollPosition = position;
    });
    this.updateBounds();
  }

  private applyTransform(): void {
    if (!this.contentElement) return;
    
    gsap.set(this.contentElement, {
      y: -this.state.scrollPosition,
      force3D: true
    });
  }

  private applyInertia(velocity: number): void {
    const dampedVelocity = velocity * this.config.dampingFactor;
    const clampedVelocity = Math.max(
      -this.config.maxVelocity,
      Math.min(dampedVelocity, this.config.maxVelocity)
    );

    // Calcular distancia basada en velocidad
    const distance = (clampedVelocity / 1000) * 300; // Ajustar multiplicador según necesidad
    const targetPosition = this.state.scrollPosition - distance;

    untrack(() => {
      this.state.isScrolling = true;
    });

    this.onScrollStart?.();

    this.scrollAnimation = gsap.to(this.state, {
      scrollPosition: Math.max(0, Math.min(targetPosition, this.state.maxScroll)),
      duration: this.config.inertiaDuration,
      ease: 'power3.out',
      onUpdate: () => {
        this.applyTransform();
        this.updateBounds();
        this.checkLazyLoad();
      },
      onComplete: () => {
        untrack(() => {
          this.state.isScrolling = false;
        });
        this.onScrollEnd?.();
      }
    });
  }

  private checkLazyLoad(): void {
    if (this.progress >= this.config.lazyLoadThreshold) {
      this.onLazyLoad?.();
    }
  }

  private cancelAnimation(): void {
    this.scrollAnimation?.kill();
    this.scrollAnimation = null;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════

  initialize(containerEl: HTMLElement, contentEl: HTMLElement): void {
    this.containerElement = containerEl;
    this.contentElement = contentEl;

    // Configurar estilos
    containerEl.style.overflow = 'hidden';
    containerEl.style.position = 'relative';
    
    contentEl.style.willChange = 'transform';

    // Calcular bounds iniciales
    this.updateBounds();

    // Agregar listeners
    containerEl.addEventListener('wheel', this.handleWheel as any, { passive: false });
    containerEl.addEventListener('touchstart', this.handleTouchStart as any, { passive: true });
    containerEl.addEventListener('touchmove', this.handleTouchMove as any, { passive: false });
    containerEl.addEventListener('touchend', this.handleTouchEnd as any, { passive: true });
  }

  cleanup(): void {
    if (!this.containerElement) return;

    this.containerElement.removeEventListener('wheel', this.handleWheel as any);
    this.containerElement.removeEventListener('touchstart', this.handleTouchStart as any);
    this.containerElement.removeEventListener('touchmove', this.handleTouchMove as any);
    this.containerElement.removeEventListener('touchend', this.handleTouchEnd as any);

    this.cancelAnimation();
    
    this.containerElement = null;
    this.contentElement = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function useInnerListScroll(
  config: Partial<InnerScrollConfig> = {}
): UseInnerListScrollReturn {
  const instance = new InnerListScroll(config);

  return {
    get scrollPosition() { return instance.scrollPosition; },
    get isScrolling() { return instance.isScrolling; },
    get canScrollUp() { return instance.canScrollUp; },
    get canScrollDown() { return instance.canScrollDown; },
    get progress() { return instance.progress; },
    
    scrollTo: (pos, anim) => instance.scrollTo(pos, anim),
    scrollBy: (delta, anim) => instance.scrollBy(delta, anim),
    resetScroll: () => instance.resetScroll(),
    updateBounds: () => instance.updateBounds(),
    
    handleWheel: instance.handleWheel,
    handleTouchStart: instance.handleTouchStart,
    handleTouchMove: instance.handleTouchMove,
    handleTouchEnd: instance.handleTouchEnd,
    
    get onLazyLoad() { return instance.onLazyLoad; },
    set onLazyLoad(cb) { instance.onLazyLoad = cb; },
    get onScrollStart() { return instance.onScrollStart; },
    set onScrollStart(cb) { instance.onScrollStart = cb; },
    get onScrollEnd() { return instance.onScrollEnd; },
    set onScrollEnd(cb) { instance.onScrollEnd = cb; },
    
    initialize: (c, co) => instance.initialize(c, co),
    cleanup: () => instance.cleanup()
  };
}
