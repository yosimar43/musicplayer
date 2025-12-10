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
  
  // Solo cargar cuando es focus (elimina precarga agresiva)
  $effect(() => {
    if (isFocus) {
      // Cargar solo cuando recibe focus
      visibleTracksCount = Math.min(20, tracks.length);
    } else {
      // Resetear cuando pierde focus para liberar memoria
      visibleTracksCount = 20;
    }
  });
  
  // Lazy loading con IntersectionObserver (m\u00e1s eficiente)
  let loadMoreTriggerRef = $state<HTMLDivElement>();
  
  // Control de scroll al final (simplificado)
  const SCROLL_END_THRESHOLD = 5;
  
  // Resetear cuando la isla se vuelve focus
  $effect(() => {
    if (isFocus && gridRef) {
      // Resetear scroll al top
      gridRef.scrollTop = 0;
    }
  });
  
  // Matar animaciones GSAP cuando no está en focus (más eficiente que pausar/reanudar)
  $effect(() => {
    if (!gridRef) return;
    
    if (!isFocus) {
      // Matar todas las animaciones de este grid (no pausar)
      // MusicCard3D reiniciará automáticamente cuando vuelva a ser visible
      gsap.killTweensOf(gridRef.querySelectorAll('.card-wrapper, .music-card-3d'));
    }
    // Al volver a focus, los componentes MusicCard3D reinician sus animaciones automáticamente
  });
  
  // Detectar intento de scroll más allá de los bordes con wheel
  function handleWheel(event: WheelEvent) {
    if (!isFocus || !gridRef || !onScrollEnd) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gridRef;
    const maxScroll = scrollHeight - clientHeight;
    const hasScroll = scrollHeight > clientHeight;
    
    // Si NO hay scroll (contenido corto), permitir cambio directo
    if (!hasScroll || maxScroll <= 1) {
      if (event.deltaY > 0) {
        onScrollEnd('bottom');
      } else {
        onScrollEnd('top');
      }
      return;
    }
    
    // Con scroll normal: detectar bordes
    if (scrollTop >= maxScroll - SCROLL_END_THRESHOLD && event.deltaY > 0) {
      onScrollEnd('bottom');
    } else if (scrollTop <= SCROLL_END_THRESHOLD && event.deltaY < 0) {
      onScrollEnd('top');
    }
  }
  
  // IntersectionObserver para lazy loading (optimizado: +10 tracks a la vez)
  $effect(() => {
    if (!loadMoreTriggerRef || !isFocus || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // ✅ Usar requestIdleCallback para cargar en momentos idle (mejor performance)
          const loadMore = () => {
            // Incrementar de 10 en 10 (más conservador)
            visibleTracksCount = Math.min(visibleTracksCount + 10, tracks.length);
          };
          
          // Preferir requestIdleCallback si está disponible, sino usar requestAnimationFrame
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadMore, { timeout: 1000 });
          } else {
            requestAnimationFrame(loadMore);
          }
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '200px', // Reducido de 300px
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
    
    const handleWheelEvent = (e: WheelEvent) => handleWheel(e);
    
    if (isFocus) {
      gridRef.addEventListener('wheel', handleWheelEvent, { passive: true });
    }
    
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
    padding: 10px 0px;
    border-radius: 16px;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.5);
    backdrop-filter: blur(8px);
    transform-style: preserve-3d;
    /* Transición ultra-rápida: 0.1s en lugar de 0.2s, solo transform y opacity */
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
    will-change: auto; /* ✅ Remover will-change cuando está en focus */
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
    padding-bottom: 100px;
    width: 100%;
    height: calc(100% - 72px);
    justify-content: center;
    align-items:center ;
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
