<script lang="ts">
  import type { MusicFile } from '@/lib/types';
  import CarouselCard3D from './CarouselCard3D.svelte';
  import AlphabetNav from './AlphabetNav.svelte';
  import CurrentLetterIndicator from './CurrentLetterIndicator.svelte';

  interface Props {
    tracks: MusicFile[];
  }

  let { tracks }: Props = $props();

  let containerRef = $state<HTMLDivElement>();
  let currentLetterIndex = $state(0);
  
  // Control de navegación
  let isNavigating = $state(false);

  // Agrupar tracks por letra (memoizado)
  const letterGroups = $derived.by(() => {
    const grouped = new Map<string, MusicFile[]>();
    
    for (const track of tracks) {
      const firstChar = (track.title || track.path).charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      
      if (!grouped.has(letter)) {
        grouped.set(letter, []);
      }
      grouped.get(letter)!.push(track);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => {
        if (a[0] === '#') return 1;
        if (b[0] === '#') return -1;
        return a[0].localeCompare(b[0]);
      });
  });

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
      // Transición inmediata sin esperar carga
      navigateToSlide(index);
    }
  }
  
  // Navegar a un slide específico
  function navigateToSlide(targetIndex: number) {
    if (isNavigating || targetIndex < 0 || targetIndex >= letterGroups.length) return;
    if (targetIndex === currentLetterIndex) return;
    
    isNavigating = true;
    currentLetterIndex = targetIndex;
    
    // Tiempo reducido para navegación más fluida con precarga
    setTimeout(() => {
      isNavigating = false;
    }, 250);
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
    if (isNavigating) return;
    
    if (direction === 'top') {
      navigatePrev();
    } else {
      navigateNext();
    }
  }
</script>

<div class="carousel-3d-container" bind:this={containerRef}>
  <!-- Current Letter Indicator -->
  <CurrentLetterIndicator letter={currentLetter} />

  <!-- Alphabet Navigation -->
  <AlphabetNav
    letters={availableLetters}
    {currentLetter}
    {onLetterClick}
  />

  <!-- Slides wrapper con perspectiva 3D -->
  <div class="slides-wrapper">
    {#each letterGroups as [letter, letterTracks], index (letter)}
      {@const position = getPosition(index)}
      {@const isVisible = Math.abs(index - currentLetterIndex) <= 1}
      <CarouselCard3D 
        {letter} 
        tracks={letterTracks}
        {position}
        isFocus={position === 'focus'}
        isVisible={isVisible}
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
