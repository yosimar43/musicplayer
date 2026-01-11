<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Track } from '@/lib/types';

  interface Props {
    tracks: Track[];
    itemHeight?: number;
    containerHeight?: number;
    onTrackSelect?: (track: Track) => void;
    selectedTrack?: Track | null;
  }

  let {
    tracks,
    itemHeight = 60,
    containerHeight = 400,
    onTrackSelect,
    selectedTrack
  }: Props = $props();

  let container: HTMLDivElement;
  let scrollTop = $state(0);
  let visibleRange = $state({ start: 0, end: 0 });

  // Calculate visible range based on scroll position
  $effect(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 2, tracks.length); // +2 for buffer

    visibleRange = { start: Math.max(0, start - 1), end }; // -1 for buffer
  });

  function handleScroll(event: Event) {
    const target = event.target as HTMLDivElement;
    scrollTop = target.scrollTop;
  }

  function getVisibleTracks() {
    return tracks.slice(visibleRange.start, visibleRange.end);
  }

  function getItemOffset(index: number) {
    return (index - visibleRange.start) * itemHeight;
  }

  function getTotalHeight() {
    return tracks.length * itemHeight;
  }
</script>

<div
  bind:this={container}
  class="virtualized-list"
  style="height: {containerHeight}px; overflow-y: auto;"
  onscroll={handleScroll}
>
  <div
    class="virtualized-content"
    style="height: {getTotalHeight()}px; position: relative;"
  >
    {#each getVisibleTracks() as track, index (track.path)}
      {@const globalIndex = visibleRange.start + index}
      <div
        class="track-item"
        class:selected={selectedTrack?.path === track.path}
        role="button"
        tabindex="0"
        style="position: absolute; top: {getItemOffset(globalIndex)}px; height: {itemHeight}px; width: 100%;"
        onclick={() => onTrackSelect?.(track)}
        onkeydown={(e) => e.key === 'Enter' && onTrackSelect?.(track)}
      >
        <div class="track-info">
          <div class="track-title">{track.title || 'Unknown Title'}</div>
          <div class="track-artist">{track.artist || 'Unknown Artist'}</div>
        </div>
        {#if track.albumArt}
          <img
            class="track-album-art"
            src={track.albumArt}
            alt="Album art"
            loading="lazy"
          />
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .virtualized-list {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .track-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #f3f4f6;
    transition: background-color 0.15s ease;
  }

  .track-item:hover {
    background-color: #f9fafb;
  }

  .track-item.selected {
    background-color: #dbeafe;
  }

  .track-info {
    flex: 1;
    min-width: 0;
  }

  .track-title {
    font-weight: 500;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-artist {
    font-size: 0.875rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-album-art {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    margin-left: 12px;
    flex-shrink: 0;
  }
</style>