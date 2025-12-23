<script lang="ts">
  import { useLibrary } from '@/lib/hooks';
  import { usePlayer } from '@/lib/hooks';
  import TrackCard from '../tracks/TrackCard.svelte';
  import { libraryStore } from '@/lib/stores/library.store.svelte';
  
  const library = useLibrary();
  const player = usePlayer();
  
  let scrollContainer = $state<HTMLElement>();
  
  const ITEM_HEIGHT = 80; // 70px card + 10px gap
  
  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;
    
    const visibleStart = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 5);
    const visibleEnd = visibleStart + Math.ceil(target.clientHeight / ITEM_HEIGHT) + 10;
    
    // Actualizar el store con el rango visible
    libraryStore.setVisibleRange(visibleStart, visibleEnd);
    
    // Trigger lazy enrichment para tracks visibles
    library.enrichVisibleTracks();
  }
  
  // Trigger enrichment cuando se monta el componente
  $effect(() => {
    if (library.tracks.length > 0) {
      library.enrichVisibleTracks();
    }
  });
</script>

<div 
  bind:this={scrollContainer}
  class="library-list"
  onscroll={handleScroll}
>
  <div class="virtual-spacer" style="height: {libraryStore.visibleStart * ITEM_HEIGHT}px"></div>
  
  {#each libraryStore.visibleTracks as track, i (track.path)}
    <div class="track-wrapper" style="height: {ITEM_HEIGHT}px">
        <TrackCard 
        {track} 
        index={libraryStore.visibleStart + i}
        visible={true}
        onclick={() => player.play(track)}
        />
    </div>
  {/each}
  
  <div class="virtual-spacer" style="height: {Math.max(0, (library.tracks.length - libraryStore.visibleEnd) * ITEM_HEIGHT)}px"></div>
</div>

<style>
    .library-list {
        height: 100%;
        width: 100%;
        overflow-y: auto;
        position: relative;
        padding: 20px;
        box-sizing: border-box;
    }
    .track-wrapper {
        padding-bottom: 10px;
        box-sizing: border-box;
    }
    .virtual-spacer {
        width: 100%;
    }
</style>
