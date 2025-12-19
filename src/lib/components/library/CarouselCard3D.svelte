<script lang="ts">
  import type { MusicFile } from '@/lib/types';
  import { MusicCard3D, MusicCardPlaceholder } from '$lib/components/tracks';
  import LetterSeparator from './LetterSeparator.svelte';
  import gsap from 'gsap';
  import { fade } from 'svelte/transition';

  interface Props {
    letter: string;
    tracks: MusicFile[];
    position: 'focus' | 'back-top' | 'back-bottom';
    isFocus?: boolean;
    isVisible?: boolean;
    isTransitioning?: boolean; // ✅ Nuevo: para pausar renderizado durante transiciones
    onScrollEnd?: (direction: 'top' | 'bottom') => void;
  }

  let { 
    letter, 
    tracks, 
    position,
    isFocus = false,
    isVisible = true,
    isTransitioning = false,
    onScrollEnd
  }: Props = $props();

  let slideRef = $state<HTMLDivElement>();
  let gridRef = $state<HTMLDivElement>();
  let cardRefs = $state<Map<number, HTMLElement>>(new Map());
  
  // Estado para controlar animaciones de letras independientes
  let shouldAnimateLetter = $state(false);
  
  // Estado de carga progresiva con virtualización
  let visibleTracksCount = $state(0);
  let visibleCards = $state<Set<number>>(new Set()); // Cards actualmente visibles
  
  // Flag para controlar si ya se inicializó el scroll
  let scrollInitialized = $state(false);
  
  const VISIBLE_THRESHOLD = 8; // Focus: mostrar hasta 8 tracks inicialmente (más agresivo)
  const BACK_THRESHOLD = 2;      // Back: solo 2 placeholders
  const MAX_VISIBLE_CARDS = 12; // Máximo de cards renderizadas al mismo tiempo
  
  const visibleTracks = $derived.by(() => {
    if (position === 'focus') {
      // Solo tracks que están en visibleCards O los primeros VISIBLE_THRESHOLD
      const initialTracks = tracks.slice(0, Math.min(VISIBLE_THRESHOLD, tracks.length));
      const visibleIndices = Array.from(visibleCards).sort((a, b) => a - b);
      
      // Combinar iniciales con visibles, sin duplicados
      const allVisibleIndices = new Set([...initialTracks.map((_, i) => i), ...visibleIndices]);
      return Array.from(allVisibleIndices)
        .sort((a, b) => a - b)
        .slice(0, MAX_VISIBLE_CARDS)
        .map(i => tracks[i])
        .filter(Boolean);
    } else {
      return tracks.slice(0, BACK_THRESHOLD);
    }
  });
  
  const hasMore = $derived(position === 'focus' && visibleTracksCount < tracks.length);
  
  // Inicializar visibleTracksCount cuando el slide se vuelve focus
  $effect(() => {
    if (position === 'focus') {
      // Asegurar que siempre se muestren al menos VISIBLE_THRESHOLD tracks cuando se vuelve focus
      const minVisible = Math.min(VISIBLE_THRESHOLD, tracks.length);
      if (visibleTracksCount < minVisible) {
        visibleTracksCount = minVisible;
      }
      if (gridRef && !scrollInitialized) {
        gridRef.scrollTop = 0;
        scrollInitialized = true;
      }
    }
    
    // Matar animaciones GSAP en slides back (optimización crítica)
    if (position !== 'focus' && gridRef) {
      gsap.killTweensOf(gridRef.querySelectorAll('.card-wrapper, .music-card-3d, .player-circle-wrapper'));
      // Resetear contador de tracks visibles cuando deja de ser focus
      visibleTracksCount = 0;
      visibleCards.clear();
      // Reset scroll initialized when leaving focus
      scrollInitialized = false;
    }
  });
  
  // Controlar animaciones de letras independientes de la transición del slide
  $effect(() => {
    if (position === 'focus' && isVisible && !isTransitioning) {
      // Delay pequeño para asegurar que la transición del slide terminó
      const timer = setTimeout(() => {
        shouldAnimateLetter = true;
      }, 150); // Después de la transición CSS (0.1s) + buffer
      
      return () => clearTimeout(timer);
    } else {
      shouldAnimateLetter = false;
    }
  });
  
  // Detectar scroll más allá de los bordes
  function handleWheel(event: WheelEvent) {
    if (position !== 'focus' || !gridRef || !onScrollEnd) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gridRef;
    const maxScroll = scrollHeight - clientHeight;
    const hasScroll = scrollHeight > clientHeight;
    
    // Umbral reducido para mejor navegación
    const SCROLL_FORCE_THRESHOLD = 15; // Reducido de 30 a 15 para mejor UX
    
    // Si NO hay scroll (contenido corto), permitir cambio directo
    if (!hasScroll || maxScroll <= 1) {
      if (event.deltaY > SCROLL_FORCE_THRESHOLD) {
        onScrollEnd('bottom');
      } else if (event.deltaY < -SCROLL_FORCE_THRESHOLD) {
        onScrollEnd('top');
      }
      return;
    }
    
    // Con scroll: detectar bordes
    if (scrollTop >= maxScroll - SCROLL_END_THRESHOLD && event.deltaY > SCROLL_FORCE_THRESHOLD) {
      onScrollEnd('bottom');
    } else if (scrollTop <= SCROLL_END_THRESHOLD && event.deltaY < -SCROLL_FORCE_THRESHOLD) {
      onScrollEnd('top');
    }
  }
  // Lazy loading con IntersectionObserver
  let loadMoreTriggerRef = $state<HTMLDivElement>();
  const SCROLL_END_THRESHOLD = 5;
  let isLoadingMore = $state(false);
  let observer: IntersectionObserver | null = null;
  let cardObservers = $state<Map<number, IntersectionObserver>>(new Map()); // Para cada card
  
  // Función para observar una card específica
  function observeCard(index: number, element: HTMLElement) {
    if (cardObservers.has(index)) {
      cardObservers.get(index)?.disconnect();
    }
    
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleCards.add(index);
          } else {
            visibleCards.delete(index);
          }
          // Trigger reactivity
          visibleCards = new Set(visibleCards);
        });
      },
      {
        root: gridRef,
        rootMargin: '100px', // Pre-cargar 100px antes de entrar al viewport
        threshold: 0.1 // 10% visible para activar
      }
    );
    
    cardObserver.observe(element);
    cardObservers.set(index, cardObserver);
  }
  
  // Cleanup de observers de cards
  function cleanupCardObservers() {
    cardObservers.forEach(observer => observer.disconnect());
    cardObservers.clear();
    visibleCards.clear();
    cardRefs.clear();
  }
  
  // Action para setear refs de cards
  function cardRefAction(node: HTMLElement, index: number) {
    cardRefs.set(index, node);
    cardRefs = new Map(cardRefs); // Trigger reactivity
    
    return {
      destroy() {
        cardRefs.delete(index);
        cardRefs = new Map(cardRefs);
      }
    };
  }
  
  // Observar cards visibles
  $effect(() => {
    if (position !== 'focus') return;
    
    cardRefs.forEach((element, index) => {
      observeCard(index, element);
    });
  });
  
  // Lazy loading completamente invisible y optimizado
  $effect(() => {
    if (position !== 'focus' || !loadMoreTriggerRef) {
      // Cleanup observers si ya no es focus
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      cleanupCardObservers();
      return;
    }
    
    // Crear observer solo si no existe
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isLoadingMore && visibleTracksCount < tracks.length) {
            isLoadingMore = true;
            
            // requestIdleCallback para no bloquear UI
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                visibleTracksCount = Math.min(visibleTracksCount + 10, tracks.length);
                isLoadingMore = false;
              }, { timeout: 300 });
            } else {
              requestAnimationFrame(() => {
                visibleTracksCount = Math.min(visibleTracksCount + 10, tracks.length);
                isLoadingMore = false;
              });
            }
          }
        },
        { 
          threshold: 0.1, 
          rootMargin: '150px', // Pre-cargar con más anticipación
          root: gridRef 
        }
      );
    }
    
    observer.observe(loadMoreTriggerRef);
    
    return () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      cleanupCardObservers();
    };
  });
  
  // ✅ Actualizar listeners wheel SOLO en focus
  $effect(() => {
    if (!gridRef || position !== 'focus') return;
    
    const handleWheelEvent = (e: WheelEvent) => handleWheel(e);
    
    gridRef.addEventListener('wheel', handleWheelEvent, { passive: true });
    
    return () => {
      if (gridRef) {
        gridRef.removeEventListener('wheel', handleWheelEvent);
      }
    };
  });
</script>

<div
  bind:this={slideRef}
  class="carousel-slide"
  class:is-focus={position === 'focus'}
  class:is-hidden={!isVisible}
  class:is-transitioning={!isFocus && isVisible}
  data-position={position}
>
  <!-- Letter Header -->
  <div class="slide-header">
    <LetterSeparator {letter} shouldAnimate={shouldAnimateLetter} />
  </div>

  <!-- Grid scrolleable con scroll nativo optimizado -->
  <div class="tracks-grid" bind:this={gridRef} class:is-paused={position !== 'focus'}>
    {#if position === 'focus'}
      <!-- Virtualización: renderizar todas las posiciones pero solo MusicCard3D para visibles -->
      {#each tracks as track, i (track.path)}
        <div class="card-wrapper" use:cardRefAction={i}>
          {#if visibleCards.has(i) || i < VISIBLE_THRESHOLD}
            <!-- ✅ Card visible: renderizar MusicCard3D -->
            <div in:fade={{ duration: 200 }}>
              <MusicCard3D {track} immediate={i <= 8} />
            </div>
          {:else}
            <!-- ✅ Card no visible: placeholder ligero -->
            <div transition:fade={{ duration: 150 }}>
              <MusicCardPlaceholder />
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <!-- ✅ Slides back: solo placeholders ligeros -->
      {#each tracks.slice(0, BACK_THRESHOLD) as track, i (track.path)}
        <div class="card-wrapper">
          <MusicCardPlaceholder />
        </div>
      {/each}
    {/if}
    
    <!-- Trigger invisible para lazy loading continuo -->
    {#if hasMore && position === 'focus'}
      <div class="loading-trigger-invisible" bind:this={loadMoreTriggerRef}></div>
    {/if}
  </div>
</div>

<style>
  .carousel-slide {
    position: absolute;
    width: 100%;
    max-width: 900px;
    height: 100%;
    padding: 10px 0px;
    border-radius: 16px;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.5);
    backdrop-filter: blur(8px);
    transform-style: preserve-3d;
    /* ✅ OPTIMIZACIÓN 1: content-visibility auto - omitir layout en slides no visibles */
    content-visibility: auto;
    contain-intrinsic-size: auto 600px;
    transition: transform 0.1s cubic-bezier(0.4, 0.0, 0.2, 1),
                opacity 0.1s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  /* ✅ will-change solo durante transiciones */
  .carousel-slide.is-transitioning {
    will-change: transform, opacity;
  }

  .carousel-slide.is-focus {
    pointer-events: auto;
    background: transparent;
    border-color: transparent;
    backdrop-filter: none;
    will-change: auto;
    content-visibility: visible; /* ✅ Forzar visible cuando es focus */
  }

  .carousel-slide:not(.is-focus) {
    pointer-events: none;
  }
  
  /* Ocultar slides no visibles (manteniéndolos montados para animaciones) */
  .carousel-slide.is-hidden {
    visibility: hidden;
    pointer-events: none;
  }
  
  /* Posiciones calculadas con CSS */
  .carousel-slide[data-position="focus"] {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
  
  .carousel-slide[data-position="back-top"] {
    transform: translate3d(70px, -80px, -50px) scale(0.9);
    opacity: 0.6;
  }
  
  .carousel-slide[data-position="back-bottom"] {
    transform: translate3d(110px, 80px, -60px) scale(0.85);
    opacity: 0.3; /* ✅ Aumentado de 0.1 para mejor transición al volver atrás */
  }

  .slide-header {
   max-height: auto;
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(56, 189, 248, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tracks-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 15px 10px;
    
    /* Padding balanceado */
    padding: 20px 20px 20px 40px;
    
    width: 100%;
    height: calc(100% - 72px);
    
    /* ✅ Centrar items en sus celdas */
    justify-items: center;
    align-items: start;
    
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scroll-behavior: smooth;
    
    /* Optimizaciones de scroll */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* Optimizar scroll performance */
    will-change: scroll-position;
    
    /* ✅ Optimizaciones para muchas cards */
    contain: layout style paint;
  }
  
  .tracks-grid::-webkit-scrollbar {
    display: none;
  }
  
  /* Pausar animaciones cuando no está en focus */
  .tracks-grid.is-paused {
    pointer-events: none;
  }
  
  .tracks-grid.is-paused * {
    animation-play-state: paused !important;
  }

  .card-wrapper {
    will-change: transform;
    /* ✅ Stack children for crossfade transitions */
    display: grid;
    grid-template-areas: "stack";
  }
  
  .card-wrapper > * {
    grid-area: stack;
    width: 100%;
  }

  /* Efecto honeycomb */
  .card-wrapper:nth-child(even) {
    margin-top: 25px;
  }

  /* Trigger invisible - solo para IntersectionObserver */
  .loading-trigger-invisible {
    grid-column: 1 / -1;
    min-height: 1px;
    visibility: hidden;
  }

  @media (max-width: 768px) {
    .tracks-grid {
      grid-template-columns: repeat(auto-fill, minmax(90px, 110px));
      gap: 10px 14px;
      padding: 16px;
    }
    
    .card-wrapper:nth-child(even) {
      margin-top: 20px;
    }
  }

  @media (max-width: 480px) {
    .tracks-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 100px));
      gap: 8px 12px;
      padding: 12px;
    }
    
    .card-wrapper:nth-child(even) {
      margin-top: 16px;
    }
  }
</style>
