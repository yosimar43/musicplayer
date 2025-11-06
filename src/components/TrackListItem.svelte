<script lang="ts">
  import { player, setQueue } from '@/lib/state';
  import { createAlbumArtLoader } from '@/lib/hooks/useAlbumArt.svelte';
  import * as Card from "$lib/components/ui/card";
  import TrackAlbumArt from './TrackAlbumArt.svelte';
  import TrackInfo from './TrackInfo.svelte';
  import TrackMetadata from './TrackMetadata.svelte';
  import TrackActions from './TrackActions.svelte';
  
  interface Props {
    track: any;
    index: number;
    allTracks: any[];
  }
  
  let { track, index, allTracks }: Props = $props();
  
  // Usar hook personalizado para cargar imagen del álbum
  const albumArt = createAlbumArtLoader(track.artist, track.title, track.album);
  
  // Estados derivados
  const isCurrentTrack = $derived(player.current?.path === track.path);
  const isPlaying = $derived(player.isPlaying && isCurrentTrack);
  
  function handlePlay() {
    setQueue(allTracks, index);
  }
</script>

<Card.Root 
  class="group backdrop-blur-xl bg-sky-900/60 border-sky-700/50 hover:bg-sky-800/70 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-[0_6px_20px_rgba(6,182,212,0.2)] hover:scale-[1.01] {isCurrentTrack ? 'bg-cyan-500/20 border-cyan-400/60 shadow-[0_6px_20px_rgba(6,182,212,0.25)]' : ''}"
  onclick={handlePlay}
>
  <Card.Content class="p-0">
    <div class="flex items-center gap-3 px-4 py-3 md:py-4">
      <!-- Album Art -->
      <TrackAlbumArt 
        imageUrl={albumArt.url}
        isLoading={albumArt.isLoading}
        {isPlaying}
        albumTitle={track.album || track.title}
      />
      
      <!-- Track Number -->
      <div class="shrink-0 w-8 text-center">
        {#if isPlaying}
          <span class="text-cyan-300 font-semibold text-sm animate-pulse">▶</span>
        {:else}
          <span class="text-sky-300 text-xs md:text-sm font-medium group-hover:text-cyan-300 transition-colors tabular-nums">
            {index + 1}
          </span>
        {/if}
      </div>
      
      <!-- Track Info -->
      <TrackInfo 
        title={track.title}
        artist={track.artist}
        album={track.album}
        {isCurrentTrack}
      />
      
      <div class="ml-auto flex items-center gap-3">
        <!-- Metadata -->
        <TrackMetadata 
          genre={track.genre}
          year={track.year}
          duration={track.duration}
        />
        
        <!-- Actions (visible on hover) -->
        <TrackActions trackPath={track.path} />
      </div>
    </div>
  </Card.Content>
</Card.Root>
