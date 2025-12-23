<script lang="ts">
  import type { SpotifyTrackWithDownload } from '@/lib/hooks/useSpotifyTracks.svelte';
  import TrackItem from './TrackItem.svelte';
  import { onMount, tick } from 'svelte';

  interface Props {
    tracks: SpotifyTrackWithDownload[];
    itemHeight?: number;
    containerHeight?: number;
    onDownload?: (trackId: string) => void;
  }

  let {
    tracks,
    itemHeight = 110,
    containerHeight = 600,
    onDownload
  }: Props = $props();

  let containerRef = $state<HTMLElement>();
  let scrollTop = $state(0);
  let visibleRange = $state({ start: 0, end: 0 });

  // Calcular el rango visible basado en el scroll
  $effect(() => {
    if (!containerRef) return;

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 2, tracks.length); // +2 para buffer

    visibleRange = { start: Math.max(0, start - 1), end }; // -1 para buffer superior
  });

  function handleScroll(event: Event) {
    const target = event.target as HTMLElement;
    scrollTop = target.scrollTop;
  }

  // Total height del contenido
  const totalHeight = $derived(tracks.length * itemHeight);

  // Items visibles
  const visibleTracks = $derived(tracks.slice(visibleRange.start, visibleRange.end));

  // Offset para posicionar los items
  const offsetY = $derived(visibleRange.start * itemHeight);
</script>

<div
  bind:this={containerRef}
  class="virtual-list-container"
  style="height: {containerHeight}px;"
  onscroll={handleScroll}
>
  <div
    class="virtual-list-content"
    style="height: {totalHeight}px;"
  >
    <div
      class="virtual-list-visible"
      style="top: {offsetY}px;"
    >
      {#each visibleTracks as track, index (track.id || track.name)}
        {@const globalIndex = visibleRange.start + index}
        <div
          class="track-wrapper"
          style="height: {itemHeight}px;"
        >
          <TrackItem
            {track}
            showDownloadButton={true}
            onDownload={() => track.id && onDownload?.(track.id)}
          />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .virtual-list-container {
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--background-secondary);
  }

  .virtual-list-content {
    position: relative;
    width: 100%;
  }

  .virtual-list-visible {
    position: absolute;
    left: 0;
    right: 0;
    will-change: top;
  }

  .track-wrapper {
    width: 100%;
    box-sizing: border-box;
  }

  .track-wrapper:not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }

  /* Scrollbar styling */
  .virtual-list-container::-webkit-scrollbar {
 display:none
  }

  
</style>