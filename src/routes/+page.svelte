<script lang="ts">
  import { onMount } from "svelte";
  import { libraryStore } from "$lib/stores/library.store.svelte";
  import { playerStore } from "$lib/stores/player.store.svelte";
  import type { MusicFile } from "$lib/types";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    LibraryLoadingState,
    LibraryEmptyState,
    LibraryHeader,
    LibraryHeaderSkeleton,
    AlphabetNav,
    CurrentLetterIndicator,
    TracksGrid,
    TracksCarousel3D,
    CarouselSkeleton
  } from "$lib/components/library";

  // Estados de la biblioteca desde el store
  const allTracks = $derived(libraryStore.tracks);
  const isLoading = $derived(libraryStore.isLoading);
  const isScanning = $derived(libraryStore.isScanning);
  const scanProgress = $derived(libraryStore.scanProgress);
  const scanPercentage = $derived(libraryStore.scanPercentage);
  const totalTracks = $derived(libraryStore.totalTracks);

  // Controlar cuándo mostrar contenido real vs skeleton
  const showContent = $derived(allTracks.length > 0 && !isLoading);

</script>

{#if showContent}
  <LibraryHeader count={totalTracks} tracks={allTracks} />
{:else if isLoading || isScanning}
  <LibraryHeaderSkeleton />
{/if}

<div class="page-container">
  {#if isLoading || isScanning}
    <CarouselSkeleton />
  {:else if allTracks.length === 0}
   <CarouselSkeleton />
  {:else}
    <TracksCarousel3D tracks={allTracks} />
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


</style>
