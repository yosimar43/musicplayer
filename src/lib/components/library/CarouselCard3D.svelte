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
  
  // ✅ CACHE PERSISTENTE: Memorizar visibleTracksCount per slide
  // Evita resetear el loader cuando vuelves al slide
  const slideKey = `carousel_${letter}_count`;
  let visibleTracksCount = $state(0);
  
  // Cargar del cache en mount
  $effect(() => {
    if (visibleTracksCount === 0 && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(slideKey);
      if (cached) {
        visibleTracksCount = parseInt(cached);
      }
    }
  });
  
  const VISIBLE_THRESHOLD = 20; // Focus: mostrar hasta 20 tracks (reducido de 30 para evitar jank)
  const BACK_THRESHOLD = 3;      // Back: solo 3 placeholders
  
  // ✅ OPTIMIZACIÓN 3: Debounce cambios de posición
  let lastPositionUpdate = $state(0);
  const POSITION_DEBOUNCE = 150; // ms
  let pendingPositionUpdate = $state(false);
  
  // ✅ Guardar en cache cuando cambia visibleTracksCount
  $effect(() => {
    if (visibleTracksCount > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem(slideKey, visibleTracksCount.toString());
    }
  });
  
  const visibleTracks = $derived.by(() => {
    if (position === 'focus') {
      // ✅ Mostrar contenido inmediatamente usando VISIBLE_THRESHOLD como fallback
      // si visibleTracksCount aún es 0 (esperando debounce)
      const count = visibleTracksCount > 0 ? visibleTracksCount : VISIBLE_THRESHOLD;
      return tracks.slice(0, count);
    } else {
      return tracks.slice(0, BACK_THRESHOLD);
    }
  });
  
  const hasMore = $derived(position === 'focus' && visibleTracksCount < tracks.length);
  
  // ✅ OPTIMIZACIÓN 1: content-visibility auto (omitir cálculos en back)
  // Matar animaciones GSAP cuando no es focus
  $effect(() => {
    if (position === 'focus' && gridRef) {
      gridRef.scrollTop = 0;
    }
    
    // ✅ Matar todas las animaciones GSAP en slides back
    if (position !== 'focus' && gridRef) {
      gsap.killTweensOf(gridRef.querySelectorAll('.card-wrapper, .music-card-3d, .player-circle-wrapper'));
    }
  });
  
  // ✅ OPTIMIZACIÓN 4: Defer rendering - cargar visible solo en focus
  // Pero REUTILIZAR cache si el slide ya fue visitado
  $effect(() => {
    const cachedCount = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem(slideKey) || '0') : 0;
    
    // Debounce cambios de posición
    const now = Date.now();
    if (now - lastPositionUpdate < POSITION_DEBOUNCE) {
      if (!pendingPositionUpdate) {
        pendingPositionUpdate = true;
        setTimeout(() => {
          if (position === 'focus') {
            // ✅ Si hay cache: usar cached count (SIN LOADER)
            // Si no hay cache: cargar inicial 30
            if (visibleTracksCount === 0) {
              visibleTracksCount = Math.min(cachedCount || VISIBLE_THRESHOLD, tracks.length);
            }
          }
          // No resetear en back
          pendingPositionUpdate = false;
          lastPositionUpdate = Date.now();
        }, POSITION_DEBOUNCE);
      }
    } else {
      if (position === 'focus') {
        if (visibleTracksCount === 0) {
          visibleTracksCount = Math.min(cachedCount || VISIBLE_THRESHOLD, tracks.length);
        }
      }
      lastPositionUpdate = now;
    }
  });
  
  // ✅ Detectar intento de scroll más allá de los bordes con wheel (optimizado)
  function handleWheel(event: WheelEvent) {
    if (position !== 'focus' || !gridRef || !onScrollEnd) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gridRef;
    const maxScroll = scrollHeight - clientHeight;
    const hasScroll = scrollHeight > clientHeight;
    
    // ✅ Umbral de fuerza para evitar disparos accidentales (especialmente hacia atrás/arriba)
    const SCROLL_FORCE_THRESHOLD = 30;
    
    // Si NO hay scroll (contenido corto), permitir cambio directo pero con fuerza
    if (!hasScroll || maxScroll <= 1) {
      if (event.deltaY > SCROLL_FORCE_THRESHOLD) {
        onScrollEnd('bottom');
      } else if (event.deltaY < -SCROLL_FORCE_THRESHOLD) {
        onScrollEnd('top');
      }
      return;
    }
    
    // Con scroll normal: detectar bordes con fuerza
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
  
  // ✅ OPTIMIZACIÓN 5: Lazy loading silencioso - NO muestra loader en primer scroll
  $effect(() => {
    if (position !== 'focus' || !loadMoreTriggerRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          isLoadingMore = true;
          
          const loadMore = () => {
            // Aumentar visible count en 10
            if (visibleTracksCount < tracks.length) {
              visibleTracksCount = Math.min(visibleTracksCount + 10, tracks.length);
              // Actualizar cache
              sessionStorage.setItem(slideKey, visibleTracksCount.toString());
            }
            isLoadingMore = false;
          };
          
          // Usar requestIdleCallback para no bloquear UI
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadMore, { timeout: 500 });
          } else {
            requestAnimationFrame(loadMore);
          }
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '100px', // Reducido para pre-cargar antes
        root: gridRef 
      }
    );
    
    observer.observe(loadMoreTriggerRef);
    
    return () => {
      observer.disconnect();
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
    
    <!-- ✅ Trigger para lazy loading SOLO si scrolleaste mucho (loader invisible) -->
    {#if hasMore && position === 'focus' && isLoadingMore}
      <div class="loading-trigger" bind:this={loadMoreTriggerRef}>
        <div class="loading-spinner"></div>
      </div>
    {:else if hasMore && position === 'focus'}
      <!-- Trigger invisible - solo para IntersectionObserver -->
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
    /* ✅ 5 columnas y mejor distribución */
    grid-template-columns: repeat(5, 1fr);
    gap: 15px 10px;
    
    /* ✅ Pegado a la derecha (más padding left) */
    padding: 20px;
    padding-left: 80px; /* Empujar contenido a la derecha */
    padding-right: 20px;
    
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

  .loading-trigger {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    padding: 20px;
    min-height: 60px;
  }

  /* ✅ Trigger invisible - solo para IntersectionObserver (NO afecta UI) */
  .loading-trigger-invisible {
    grid-column: 1 / -1;
    min-height: 1px;
    visibility: hidden;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(56, 189, 248, 0.2);
    border-top-color: rgba(56, 189, 248, 0.8);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
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
