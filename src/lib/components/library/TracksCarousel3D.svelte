<script lang="ts">
  import type { MusicFile } from '@/lib/types';
  import { TrackGroupingService } from '@/lib/services/trackGrouping.service';
  import CarouselCard3D from './CarouselCard3D.svelte';
  import CurrentLetterIndicator from './CurrentLetterIndicator.svelte';
  import gsap from 'gsap';

  interface Props {
    tracks: MusicFile[];
  }

  let { tracks }: Props = $props();

  let containerRef = $state<HTMLDivElement>();
  let currentLetterIndex = $state(0);
  
  // ✅ Control de navegación + transiciones (reducir bloqueos)
  let isNavigating = $state(false);
  let isTransitioning = $state(false); // Track si está en mitad de transición CSS

  // Refs para slides para animaciones GSAP en wrap-around
  let slideRefs = $state(new Map<number, HTMLElement>());

  // Función para manejar refs de slides con cleanup
  function setSlideRef(index: number, el: HTMLElement | null) {
    if (el) {
      slideRefs.set(index, el);
    } else {
      slideRefs.delete(index);
    }
  }

  // Funciones helper para posiciones
  function getTransformForPosition(pos: 'focus' | 'back-top' | 'back-bottom'): string {
    switch (pos) {
      case 'focus': return 'translate3d(0, 0, 0) scale(1)';
      case 'back-top': return 'translate3d(70px, -80px, -50px) scale(0.9)';
      case 'back-bottom': return 'translate3d(110px, 80px, -60px) scale(0.85)';
    }
  }

  function getOpacityForPosition(pos: 'focus' | 'back-top' | 'back-bottom'): number {
    switch (pos) {
      case 'focus': return 1;
      case 'back-top': return 0.6;
      case 'back-bottom': return 0.3;
    }
  }

  // Agrupar tracks por letra usando el servicio
  const letterGroups = $derived(TrackGroupingService.groupByLetter(tracks));

  const availableLetters = $derived(letterGroups.map(([letter]) => letter));
  const currentLetter = $derived(letterGroups[currentLetterIndex]?.[0] || '');


  // Calcular posiciones para cada slide
  function getPosition(slideIndex: number): 'focus' | 'back-top' | 'back-bottom' {
    const offset = (slideIndex - currentLetterIndex + letterGroups.length) % letterGroups.length;
    
    if (offset === 0) return 'focus';
    if (offset === 1) return 'back-top';
    return 'back-bottom';
  }

  // Navegar a letra específica
  function onLetterClick(letter: string) {
    const index = letterGroups.findIndex(([l]) => l === letter);
    if (index !== -1 && index !== currentLetterIndex) {
      navigateToSlide(index);
    }
  }
  
  // ✅ Navegar a un slide específico (optimizado: cambio de índice durante transición)
  function navigateToSlide(targetIndex: number) {
    if (isNavigating || targetIndex < 0 || targetIndex >= letterGroups.length) return;
    if (targetIndex === currentLetterIndex) return;
    
    isNavigating = true;
    isTransitioning = true;
    
    const isWrap = Math.abs(targetIndex - currentLetterIndex) > 1;
    
    if (isWrap) {
      // ✅ Animar SOLO los 3 slides relevantes (focus, back-top, back-bottom) para reducir trabajo del compositor
      slideRefs.forEach((el, i) => {
        const offset = Math.abs((i - targetIndex + letterGroups.length) % letterGroups.length);
        if (offset > 1) return; // ❌ No animar slides invisibles
        
        let pos: 'focus' | 'back-top' | 'back-bottom';
        if (offset === 0) pos = 'focus';
        else if (offset === 1) pos = 'back-top';
        else pos = 'back-bottom';
        
        gsap.to(el, {
          transform: getTransformForPosition(pos),
          opacity: getOpacityForPosition(pos),
          duration: 0.1,
          ease: 'power2.out',
          overwrite: 'auto',
          force3D: true // ✅ Fuerza GPU para reducir jank
        });
      });
      
      // ✅ Cambiar índice después de la animación (corrección silenciosa)
      gsap.delayedCall(0.1, () => {
        currentLetterIndex = targetIndex;
        isNavigating = false;
        isTransitioning = false;
      });
    } else {
      // ✅ Normal: cambiar índice ANTES de que terminen las animaciones
      currentLetterIndex = targetIndex;
      
      // Esperar a que la transición GSAP termine + pequeño buffer
      setTimeout(() => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            isNavigating = false;
            isTransitioning = false;
          }, { timeout: 200 });
        } else {
          requestAnimationFrame(() => {
            isNavigating = false;
            isTransitioning = false;
          });
        }
      }, 100); // Esperar a que terminen las transiciones GSAP (0.1s) + buffer reducido
    }
  }
  
  // Navegar al siguiente/anterior slide (circular)
  function navigateNext() {
    const nextIndex = currentLetterIndex + 1;
    if (nextIndex < letterGroups.length) {
      navigateToSlide(nextIndex);
    } else {
      navigateToSlide(0);
    }
  }
  
  function navigatePrev() {
    const prevIndex = currentLetterIndex - 1;
    if (prevIndex >= 0) {
      navigateToSlide(prevIndex);
    } else {
      navigateToSlide(letterGroups.length - 1);
    }
  }
  
  // Manejar scroll al final de una slide
  function handleSlideScrollEnd(direction: 'top' | 'bottom') {
    if (isNavigating && !isTransitioning) return; // ✅ Permitir inputs justo al final de la animación
    
    if (direction === 'top') {
      navigatePrev();
    } else {
      navigateNext();
    }
  }
</script>

<div class="carousel-3d-container" bind:this={containerRef}>
  <!-- Current Letter Indicator -->

  <!-- ✅ Slides wrapper con perspectiva 3D -->
  <div class="slides-wrapper" class:is-transitioning={isTransitioning}>
    {#each letterGroups as [letter, letterTracks], index (letter)}
      {@const position = getPosition(index)}
      {@const isVisible = Math.min(
        Math.abs(index - currentLetterIndex),
        letterGroups.length - Math.abs(index - currentLetterIndex)
      ) <= 1}
      <CarouselCard3D 
        {letter} 
        tracks={letterTracks}
        {position}
        isFocus={position === 'focus'}
        isVisible={isVisible}
        isTransitioning={isTransitioning}
        ref={(el) => setSlideRef(index, el)}
        onScrollEnd={position === 'focus' ? handleSlideScrollEnd : undefined}
      />
    {/each}
  </div>
</div>

<style>
  .carousel-3d-container {
    position: relative;
    width: 100%;
    max-width: 1200px;
    height: calc(100vh - 180px);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .slides-wrapper {
    position: relative;
    width: 100%;
    max-width: 900px;
    height: 100%;
    transform-style: preserve-3d;
    perspective: 1200px;
    /* ✅ Desactivar pointer-events durante transición para evitar clics accidentales */
    transition: pointer-events 0.15s ease-in-out;
  }
  
  .slides-wrapper.is-transitioning {
    pointer-events: none;
    will-change: transform; /* ✅ Micro-optimización: ayudar al compositor solo durante transición */
  }

  @media (max-width: 768px) {
    .carousel-3d-container {
      height: calc(100vh - 150px);
      padding: 10px;
    }
  }

  @media (max-width: 480px) {
    .carousel-3d-container {
      height: calc(100vh - 130px);
      padding: 5px;
    }
  }
</style>
