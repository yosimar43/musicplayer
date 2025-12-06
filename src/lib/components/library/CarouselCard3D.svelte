<script lang="ts">
  import type { MusicFile } from '@/lib/types';
  import { MusicCard3D } from '$lib/components/tracks';
  import LetterSeparator from './LetterSeparator.svelte';
  import gsap from 'gsap';

  interface Props {
    letter: string;
    tracks: MusicFile[];
    position: 'focus' | 'back-top' | 'back-bottom';
    isFocus?: boolean;
    isVisible?: boolean;
    onScrollEnd?: (direction: 'top' | 'bottom') => void;
  }

  let { 
    letter, 
    tracks, 
    position,
    isFocus = false,
    isVisible = true,
    onScrollEnd
  }: Props = $props();

  let slideRef = $state<HTMLDivElement>();
  let gridRef = $state<HTMLDivElement>();
  
  // Lazy loading: renderizar solo primeros 20 tracks inicialmente
  let visibleTracksCount = $state(20);
  const visibleTracks = $derived(tracks.slice(0, visibleTracksCount));
  const hasMore = $derived(visibleTracksCount < tracks.length);
  
  // Precarga: cuando la isla es visible (adyacente), cargar más tracks
  $effect(() => {
    if (isVisible && !isFocus && visibleTracksCount < 40) {
      // Precargar hasta 40 tracks en islas adyacentes
      visibleTracksCount = Math.min(40, tracks.length);
    }
  });
  
  // Lazy loading con IntersectionObserver (m\u00e1s eficiente)
  let loadMoreTriggerRef = $state<HTMLDivElement>();
  
  // Control de scroll al final
  let lastScrollTop = 0;
  let wheelDeltaAccumulator = 0;
  let wheelTimeout: ReturnType<typeof setTimeout> | null = null;
  const SCROLL_END_THRESHOLD = 10;
  const WHEEL_THRESHOLD = 100; // Acumulación necesaria para cambiar
  const WHEEL_RESET_TIME = 150; // ms para resetear acumulador
  
  function handleScroll(event: Event) {
    if (!isFocus || !gridRef) return;
    
    const { scrollTop } = gridRef;
    lastScrollTop = scrollTop;
  }
  
  // Resetear cuando la isla se vuelve focus
  $effect(() => {
    if (isFocus) {
      // Cargar más tracks inmediatamente cuando recibe focus
      visibleTracksCount = Math.min(40, tracks.length);
      lastScrollTop = 0;
      wheelDeltaAccumulator = 0;
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
        wheelTimeout = null;
      }
      if (gridRef) {
        gridRef.scrollTop = 0;
      }
    }
  });
  
  // Pausar/reanudar animaciones GSAP cuando cambia el focus
  $effect(() => {
    if (!gridRef) return;
    
    // Obtener todos los elementos con animaciones GSAP
    const gsapElements = gridRef.querySelectorAll('[data-gsap-id]');
    
    if (!isFocus) {
      // Pausar todas las animaciones GSAP en este slide
      gsapElements.forEach((el) => {
        const tweens = gsap.getTweensOf(el);
        tweens.forEach((tween) => tween.pause());
      });
    } else {
      // Reanudar animaciones al volver a focus
      gsapElements.forEach((el) => {
        const tweens = gsap.getTweensOf(el);
        tweens.forEach((tween) => tween.resume());
      });
    }
  });
  
  // Detectar intento de scroll más allá de los bordes con wheel
  function handleWheel(event: WheelEvent) {
    if (!isFocus || !gridRef || !onScrollEnd) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gridRef;
    const maxScroll = scrollHeight - clientHeight;
    const hasScroll = scrollHeight > clientHeight;
    
    // Limpiar timeout anterior
    if (wheelTimeout) {
      clearTimeout(wheelTimeout);
    }
    
    // Si NO hay scroll (una sola canción o contenido corto)
    if (!hasScroll || maxScroll <= 1) {
      wheelDeltaAccumulator += event.deltaY;
      
      // Cambiar solo cuando se acumule suficiente scroll
      if (Math.abs(wheelDeltaAccumulator) >= WHEEL_THRESHOLD) {
        if (wheelDeltaAccumulator > 0) {
          onScrollEnd('bottom');
        } else {
          onScrollEnd('top');
        }
        wheelDeltaAccumulator = 0;
        return;
      }
      
      // Resetear acumulador después de un tiempo sin scroll
      wheelTimeout = setTimeout(() => {
        wheelDeltaAccumulator = 0;
      }, WHEEL_RESET_TIME);
      return;
    }
    
    // Con scroll normal: detectar bordes
    if (scrollTop >= maxScroll - SCROLL_END_THRESHOLD && event.deltaY > 0) {
      onScrollEnd('bottom');
    } else if (scrollTop <= SCROLL_END_THRESHOLD && event.deltaY < 0) {
      onScrollEnd('top');
    }
  }
  
  // IntersectionObserver para lazy loading (optimizado)
  $effect(() => {
    if (!loadMoreTriggerRef || !isFocus || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          visibleTracksCount = Math.min(visibleTracksCount + 20, tracks.length);
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '300px',
        root: gridRef 
      }
    );
    
    observer.observe(loadMoreTriggerRef);
    
    return () => {
      observer.disconnect();
    };
  });
  
  // Actualizar listeners cuando cambia isFocus
  $effect(() => {
    if (!gridRef) return;
    
    const handleScrollEvent = (e: Event) => handleScroll(e);
    const handleWheelEvent = (e: WheelEvent) => handleWheel(e);
    
    if (isFocus) {
      gridRef.addEventListener('scroll', handleScrollEvent, { passive: true });
      gridRef.addEventListener('wheel', handleWheelEvent, { passive: true });
    }
    
    return () => {
      if (gridRef) {
        gridRef.removeEventListener('scroll', handleScrollEvent);
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
  data-position={position}
>
  <!-- Letter Header -->
  <div class="slide-header">
    <LetterSeparator {letter} />
  </div>

  <!-- Grid scrolleable con scroll nativo optimizado -->
  <div class="tracks-grid" bind:this={gridRef} class:is-paused={!isFocus}>
    {#each visibleTracks as track (track.path)}
      <div class="card-wrapper">
        <MusicCard3D {track} />
      </div>
    {/each}
    
    <!-- Trigger para lazy loading -->
    {#if hasMore && isFocus}
      <div class="loading-trigger" bind:this={loadMoreTriggerRef}>
        <div class="loading-spinner"></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .carousel-slide {
    position: absolute;
    width: 100%;
    max-width: 900px;
    height: 100%;
    border-radius: 16px;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.5);
    backdrop-filter: blur(8px);
    transform-style: preserve-3d;
    will-change: transform, opacity;
    /* Transición rápida con precarga para navegación fluida */
    transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                scale 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .carousel-slide.is-focus {
    pointer-events: auto;
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
    opacity: 0.1;
  }

  .slide-header {
    padding: 5px;
   max-height: auto;
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(56, 189, 248, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tracks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 120px));
    gap: 12px 16px;
    padding: 20px;
    padding-bottom: 50px;
    width: 100%;
    height: calc(100% - 72px);
    justify-content: center;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scroll-behavior: smooth;
    
    /* Optimizaciones de scroll */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
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
    will-change: transform, opacity;
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
