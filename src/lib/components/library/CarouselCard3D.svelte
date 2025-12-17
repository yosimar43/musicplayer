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
  
  // Estado de carga progresiva
  let visibleTracksCount = $state(0);
  
  const VISIBLE_THRESHOLD = 20; // Focus: mostrar hasta 20 tracks inicialmente
  const BACK_THRESHOLD = 3;      // Back: solo 3 placeholders
  
  const visibleTracks = $derived.by(() => {
    if (position === 'focus') {
      const count = visibleTracksCount > 0 ? visibleTracksCount : VISIBLE_THRESHOLD;
      return tracks.slice(0, count);
    } else {
      return tracks.slice(0, BACK_THRESHOLD);
    }
  });
  
  const hasMore = $derived(position === 'focus' && visibleTracksCount < tracks.length);
  
  // Inicializar visibleTracksCount cuando el slide se vuelve focus
  $effect(() => {
    if (position === 'focus') {
      if (visibleTracksCount === 0) {
        visibleTracksCount = Math.min(VISIBLE_THRESHOLD, tracks.length);
      }
      if (gridRef) {
        gridRef.scrollTop = 0;
      }
    }
    
    // Matar animaciones GSAP en slides back (optimización crítica)
    if (position !== 'focus' && gridRef) {
      gsap.killTweensOf(gridRef.querySelectorAll('.card-wrapper, .music-card-3d, .player-circle-wrapper'));
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
  
  // Lazy loading completamente invisible y optimizado
  $effect(() => {
    if (position !== 'focus' || !loadMoreTriggerRef) {
      // Cleanup observer si ya no es focus
      if (observer) {
        observer.disconnect();
        observer = null;
      }
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
    <LetterSeparator {letter} />
  </div>

  <!-- Grid scrolleable con scroll nativo optimizado -->
  <div class="tracks-grid" bind:this={gridRef} class:is-paused={position !== 'focus'}>
    {#each visibleTracks as track, i (track.path)}
      <div class="card-wrapper">
        {#if position === 'focus'}
          <!-- ✅ Solo renderizar MusicCard3D en focus -->
          <!-- ✅ OPTIMIZACIÓN: Durante transición, solo renderizar los primeros 12 tracks reales -->
          <!-- El resto como placeholders para evitar bloqueo del hilo principal -->
          {#if isTransitioning && i > 12}
            <div class="transition-container" transition:fade={{ duration: 200 }}>
              <MusicCardPlaceholder />
            </div>
          {:else}
            <!-- ✅ Pasar immediate={true} a los primeros 12 para que se inicialicen rápido -->
            <!-- El resto se inicializará solo cuando sea visible (lazy hydration) -->
            <div class="transition-container" in:fade={{ duration: 300 }}>
              <MusicCard3D {track} immediate={i <= 12} />
            </div>
          {/if}
        {:else}
          <!-- ✅ Placeholders en slides back (lightweight) -->
          <MusicCardPlaceholder />
        {/if}
      </div>
    {/each}
    
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
