<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { libraryStore } from "$lib/stores/library.store.svelte";
  import { playerStore } from "$lib/stores/player.store.svelte";
  import type { MusicFile } from "$lib/types";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    LibraryHeader,
    LibraryHeaderSkeleton,
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

  <LibraryHeader count={totalTracks} tracks={allTracks} />

<div class="page-container">
  {#if isLoading || isScanning || allTracks.length === 0}
    <div class="transition-wrapper" transition:fade={{ duration: 300 }}>
      <CarouselSkeleton />
    </div>
  {:else}
    <div class="transition-wrapper" transition:fade={{ duration: 300 }}>
      <TracksCarousel3D tracks={allTracks} />
    </div>
  {/if}
</div>

<style>
  .page-container {
    width: 100%;
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    overflow: hidden;
  }

  .transition-wrapper {
    grid-column: 1;
    grid-row: 1;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    scroll-behavior: smooth;
    /* Ocultar scrollbar pero mantener funcionalidad */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }

  .transition-wrapper::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
</style>
