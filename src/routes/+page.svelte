<script lang="ts">
  import { onMount } from "svelte";
  import { libraryStore } from "$lib/stores/library.store.svelte";
  import { useLazyLoading } from "$lib/hooks";
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

  // Hook de lazy loading con scroll infinito circular
  const lazyLoading = useLazyLoading(() => allTracks, {
    itemsPerPage: 30,
    scrollThreshold: 300,
    infiniteLoop: true // ← Scroll infinito activado
  });

  // Ref para el contenedor de scroll
  let scrollContainer: HTMLDivElement;

  // Handler de scroll que conecta con el hook
  const handleScroll = () => {
    lazyLoading.handleScroll();
  };

  onMount(() => {
    // Bind del container al hook
    if (scrollContainer) {
      lazyLoading.bindContainer(scrollContainer);
    }
    // Inicializar letra actual
    lazyLoading.initialize();
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
        tracks={lazyLoading.visibleTracks}
        isLoadingMore={lazyLoading.isLoadingMore}
        hasMore={lazyLoading.hasMoreTracks}
        getTrackLetter={lazyLoading.getTrackLetter}
      />

      <AlphabetNav 
        letters={lazyLoading.availableLetters}
        currentLetter={lazyLoading.currentLetter}
        onLetterClick={lazyLoading.scrollToLetter}
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
