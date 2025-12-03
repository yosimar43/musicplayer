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

</script>

<LibraryHeader count={totalTracks} />
<div 
  class="page-container" 
 
>
  
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
