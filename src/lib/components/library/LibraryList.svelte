<script lang="ts">
  import { useLibrary } from '@/lib/hooks';
  import { usePlayer } from '@/lib/hooks';
  import TrackCard from '../tracks/TrackCard.svelte';
  
  const library = useLibrary();
  const player = usePlayer();
  
  let scrollContainer = $state<HTMLElement>();
  let visibleStart = $state(0);
  let visibleEnd = $state(50);
  
  const ITEM_HEIGHT = 80; // 70px card + 10px gap
  
  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;
    
    visibleStart = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 5);
    visibleEnd = visibleStart + Math.ceil(target.clientHeight / ITEM_HEIGHT) + 10;
  }
  
  const visibleTracks = $derived(
    library.tracks.slice(visibleStart, visibleEnd)
  );
</script>

<div 
  bind:this={scrollContainer}
  class="library-list"
  onscroll={handleScroll}
>
  <div class="virtual-spacer" style="height: {visibleStart * ITEM_HEIGHT}px"></div>
  
  {#each visibleTracks as track, i (track.path)}
    <div class="track-wrapper" style="height: {ITEM_HEIGHT}px">
        <TrackCard 
        {track} 
        index={visibleStart + i}
        visible={true}
        onclick={() => player.play(track)}
        />
    </div>
  {/each}
  
  <div class="virtual-spacer" style="height: {Math.max(0, (library.tracks.length - visibleEnd) * ITEM_HEIGHT)}px"></div>
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
