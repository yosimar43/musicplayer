<script lang="ts">
  import { player, setQueue } from '@/lib/state';
  import { createAlbumArtLoader } from '@/lib/hooks/useAlbumArt.svelte';
  import * as Card from "$lib/components/ui/card";
  import TrackAlbumArt from './TrackAlbumArt.svelte';
  import TrackInfo from './TrackInfo.svelte';
  import TrackMetadata from './TrackMetadata.svelte';
  import TrackActions from './TrackActions.svelte';
  import { Play } from 'lucide-svelte';
  
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

<!-- 🎵 Track Item con Glassmorphism Moderno -->
<Card.Root 
  class="group relative backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/15 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.02] hover:-translate-y-1 {isCurrentTrack ? 'border-cyan-400/60 shadow-2xl shadow-cyan-500/30' : ''}"
  style={isCurrentTrack ? "background: linear-gradient(to right, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));" : ""}
  onclick={handlePlay}
>
  <!-- Resplandor Animado cuando está reproduciendo -->
  {#if isCurrentTrack}
    <div class="absolute inset-0 animate-pulse pointer-events-none" style="background: linear-gradient(to right, rgba(34, 211, 238, 0.1), rgba(96, 165, 250, 0.1), rgba(34, 211, 238, 0.1));"></div>
  {/if}

  <Card.Content class="p-0 relative z-10">
    <div class="flex items-center gap-4 px-5 py-4">
      <!-- Album Art con hover effect -->
      <div class="relative group-hover:scale-110 transition-transform duration-300">
        <TrackAlbumArt 
          imageUrl={albumArt.url}
          isLoading={albumArt.isLoading}
          {isPlaying}
          albumTitle={track.album || track.title}
        />
      </div>
      
      <!-- Track Number con Play Icon en Hover -->
      <div class="shrink-0 w-10 text-center relative">
        {#if isPlaying}
          <div class="flex items-center justify-center">
            <span class="text-cyan-300 font-bold text-base animate-pulse drop-shadow-lg">▶</span>
          </div>
        {:else}
          <div class="relative">
            <!-- Número visible por defecto -->
            <span class="group-hover:opacity-0 transition-opacity text-slate-300 text-sm font-bold tabular-nums">
              {index + 1}
            </span>
            <!-- Play icon visible en hover -->
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <div class="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-400/50 transform scale-0 group-hover:scale-100 transition-transform duration-300">
                <Play size={14} fill="white" class="text-white ml-0.5" />
              </div>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Track Info -->
      <TrackInfo 
        title={track.title}
        artist={track.artist}
        album={track.album}
        {isCurrentTrack}
      />
      
      <div class="ml-auto flex items-center gap-4">
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

<style>
  /* 🎨 Animación de Resplandor */
  @keyframes glowPulse {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }
</style>
