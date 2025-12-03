<script lang="ts">
  import { onMount } from "svelte";
  import { libraryStore } from "$lib/stores/library.store.svelte";
  import type { MusicFile } from "$lib/types";
  import {
    LibraryLoadingState,
    LibraryEmptyState,
    LibraryHeader,
    AlphabetNav,
    CurrentLetterIndicator,
    TracksGrid
  } from "$lib/components/library";

  // Estados de la biblioteca desde el store
  const allTracks = $derived(libraryStore.tracks);
  const isLoading = $derived(libraryStore.isLoading);
  const isScanning = $derived(libraryStore.isScanning);
  const scanProgress = $derived(libraryStore.scanProgress);
  const scanPercentage = $derived(libraryStore.scanPercentage);
  const totalTracks = $derived(libraryStore.totalTracks);

  // Estado derivado
  const hasNoTracks = $derived(allTracks.length === 0 && !isLoading && !isScanning);

  // 
  // LÓGICA DE ORDENAMIENTO Y NAVEGACIÓN (Reemplaza useLazyLoading)
  // 

  // Ordenar tracks: A-Z primero, luego # (números/símbolos) al final
  const sortedTracks = $derived([...allTracks].sort((a, b) => {
    const titleA = (a.title || "").toLowerCase();
    const titleB = (b.title || "").toLowerCase();
    
    const firstCharA = titleA[0] || "";
    const firstCharB = titleB[0] || "";
    
    const isLetterA = /[a-z]/i.test(firstCharA);
    const isLetterB = /[a-z]/i.test(firstCharB);
    
    // Si uno es letra y otro no, la letra va primero
    if (isLetterA && !isLetterB) return -1;
    if (!isLetterA && isLetterB) return 1;
    
    // Ambos son letras o ambos son símbolos/números: ordenar normalmente
    return titleA.localeCompare(titleB);
  }));

  // Obtener letras disponibles
  const availableLetters = $derived.by(() => {
    const letters = new Set<string>();
    for (const track of sortedTracks) {
      const firstChar = (track.title || "#")[0].toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
      letters.add(letter);
    }
    return Array.from(letters).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  });

  let currentLetter = $state("");
  let scrollContainer = $state<HTMLDivElement>();

  // Determinar letra del track para separadores
  const getTrackLetter = (track: MusicFile, index: number): string | null => {
    const firstChar = (track.title || "#")[0].toUpperCase();
    const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
    
    if (index === 0) return letter;
    
    const prevTrack = sortedTracks[index - 1];
    const prevFirstChar = (prevTrack?.title || "#")[0].toUpperCase();
    const prevLetter = /[A-Z]/.test(prevFirstChar) ? prevFirstChar : "#";
    
    return letter !== prevLetter ? letter : null;
  };

  // Scroll a una letra específica
  const scrollToLetter = (letter: string) => {
    if (!scrollContainer) return;
    
    // Buscamos el separador o el primer track con esa letra
    // TracksGrid pone data-letter en el wrapper del track si es el primero de la letra
    const target = scrollContainer.querySelector(`[data-letter="${letter}"]`);
    
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      currentLetter = letter;
    }
  };

  // Actualizar letra actual al hacer scroll
  const handleScroll = () => {
    if (!scrollContainer) return;
    
    const cards = scrollContainer.querySelectorAll("[data-letter]");
    
    let foundLetter = "";
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;
      
      // Si el elemento está cerca del top (con un margen)
      if (relativeTop <= 150) { 
        foundLetter = (card as HTMLElement).dataset.letter || "";
      } else {
        break; // Ya pasamos los elementos relevantes
      }
    }
    
    if (foundLetter && foundLetter !== currentLetter) {
      currentLetter = foundLetter;
    }
  };

  onMount(() => {
    if (availableLetters.length > 0 && !currentLetter) {
      currentLetter = availableLetters[0];
    }
  });
</script>

<LibraryHeader count={totalTracks} />
<div 
  class="page-container" 
  bind:this={scrollContainer} 
  onscroll={handleScroll}
>
  {#if isLoading || isScanning}
    <LibraryLoadingState 
      {isScanning} 
      {scanProgress} 
      {scanPercentage} 
    />
  {:else}
    
    <div class="content-wrapper">
      <TracksGrid 
        tracks={sortedTracks}
        isLoadingMore={false}
        hasMore={false}
        {getTrackLetter}
      />

      <AlphabetNav 
        letters={availableLetters}
        {currentLetter}
        onLetterClick={scrollToLetter}
      />
    </div>
    
  {/if}
</div>

<style>
  .page-container {
    width: 100%;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 60px;
    scroll-behavior: smooth;
    /* Ocultar scrollbar pero mantener funcionalidad */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }

  .page-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .content-wrapper {
    display: flex;
    width: 100%;
    max-width: 1200px;
    position: relative;
  }
</style>
