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
  class="group bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 {isCurrentTrack ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/20' : ''}"
  onclick={handlePlay}
>
  <Card.Content class="p-0">
    <div class="flex items-center gap-4 p-3">
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
          <span class="text-green-500 font-semibold text-lg animate-pulse">▶</span>
        {:else}
          <span class="text-gray-500 text-sm font-medium group-hover:text-purple-400 transition-colors tabular-nums">
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
      
      <!-- Actions (visible on hover) -->
      <TrackActions trackPath={track.path} />
      
      <!-- Metadata -->
      <TrackMetadata 
        genre={track.genre}
        year={track.year}
        duration={track.duration}
      />
    </div>
  </Card.Content>
</Card.Root>
