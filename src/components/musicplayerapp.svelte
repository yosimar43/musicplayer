<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Slider } from "$lib/components/ui/slider";
  import { Progress } from "$lib/components/ui/progress";
  import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Volume2,
    VolumeX,
    Heart,
    Shuffle,
    Repeat,
  } from "lucide-svelte";
  import { 
    player, 
    togglePlay, 
    next, 
    previous, 
    setVolume, 
    toggleMute, 
    toggleShuffle, 
    toggleRepeat,
    seek 
  } from '@/lib/state';
  import { musicData } from '@/lib/stores/musicData.svelte';
  import type { ProcessedAlbumInfo, ProcessedTrackInfo } from '@/lib/types/lastfm';

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function handleVolumeChange(value: number[]) {
    setVolume(value[0]);
  }

  function handleProgressClick(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percentage = ((event.clientX - rect.left) / rect.width) * 100;
    seek(percentage);
  }

  let isLiked = $state(false);
  let volumeArray = $state([player.volume]);

  // Update volume when player.volume changes
  $effect(() => {
    volumeArray = [player.volume];
  });

  // Update player volume when slider changes
  $effect(() => {
    if (volumeArray[0] !== player.volume) {
      setVolume(volumeArray[0]);
    }
  });
  
  function toggleLike() {
    isLiked = !isLiked;
  }

  // Animación de aparición cuando cambia la canción
  let currentTrackId = $derived(player.current?.path || '');
  let previousTrackId = $state('');
  let isAnimating = $state(false);

  $effect(() => {
    if (currentTrackId && currentTrackId !== previousTrackId) {
      // Nueva canción cargada - activar animación
      isAnimating = true;
      setTimeout(() => {
        isAnimating = false;
      }, 1000);
    }
    previousTrackId = currentTrackId;
  });

  // Datos de Last.fm
  let albumInfo = $state<ProcessedAlbumInfo | null>(null);
  let trackInfo = $state<ProcessedTrackInfo | null>(null);
  let albumArtUrl = $state<string | null>(null);
  let showHoverCard = $state(false);

  // Cargar información de Last.fm cuando cambie la canción
  $effect(() => {
    const current = player.current;
    if (current?.artist && current?.title) {
      // Cargar info de la canción
      musicData.getTrack(current.artist, current.title).then(data => {
        trackInfo = data;
        if (data?.image) {
          albumArtUrl = data.image;
        }
      });

      // Cargar info del álbum si existe
      if (current.album) {
        musicData.getAlbum(current.artist, current.album).then(data => {
          albumInfo = data;
          if (data?.image && !albumArtUrl) {
            albumArtUrl = data.image;
          }
        });
      }
    } else {
      trackInfo = null;
      albumInfo = null;
      albumArtUrl = null;
    }
  });
</script>

<div class="music-player" class:player-animate={isAnimating && player.current}>
  <!-- Partículas decorativas animadas -->
  {#if player.current}
    <div class="particles-container">
      <div class="particle particle-1"></div>
      <div class="particle particle-2"></div>
      <div class="particle particle-3"></div>
      <div class="particle particle-4"></div>
      <div class="particle particle-5"></div>
    </div>
  {/if}

  <!-- Onda de sonido animada en el fondo -->
  {#if player.isPlaying}
    <div class="sound-wave">
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
      <div class="wave wave-3"></div>
    </div>
  {/if}

  <div class="px-6 py-3 relative z-10">
    <!-- Main Player Row -->
    <div class="flex items-center justify-between gap-8">
      <!-- Left: Album Art & Song Info -->
      <div class="flex items-center gap-4 min-w-0" style="flex: 0 0 30%;">
        <div class="album-art-wrapper" 
             role="img"
             aria-label="Album artwork"
             onmouseenter={() => showHoverCard = true}
             onmouseleave={() => showHoverCard = false}>
          <!-- Album Art -->
          {#if albumArtUrl}
            <img 
              src={albumArtUrl} 
              alt={player.current?.album || 'Album'}
              class="w-16 h-16 rounded-xl shadow-lg object-cover album-art"
              class:playing={player.isPlaying}
            />
          {:else}
            <div class="w-16 h-16 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg flex items-center justify-center shrink-0 album-art" class:playing={player.isPlaying}>
              <span class="text-white text-3xl">♪</span>
            </div>
          {/if}
          
          <!-- Ripple effect cuando está reproduciendo -->
          {#if player.isPlaying}
            <div class="album-ripple"></div>
          {/if}

          <!-- Hover Card con información de Last.fm -->
          {#if showHoverCard && (trackInfo || albumInfo)}
            <div class="hover-card">
              <div class="hover-card-content">
                <!-- Header -->
                <div class="mb-3">
                  <h4 class="text-white font-bold text-sm mb-1">
                    {trackInfo?.name || player.current?.title || 'Sin título'}
                  </h4>
                  <p class="text-gray-300 text-xs">
                    {trackInfo?.artist || player.current?.artist || 'Artista desconocido'}
                  </p>
                </div>

                <!-- Stats -->
                {#if trackInfo || albumInfo}
                  <div class="space-y-2 mb-3">
                    {#if trackInfo?.playcount || albumInfo?.playcount}
                      <div class="flex items-center gap-2 text-xs">
                        <span class="text-gray-400">▶️</span>
                        <span class="text-gray-300">
                          {(trackInfo?.playcount || albumInfo?.playcount || 0).toLocaleString()} plays
                        </span>
                      </div>
                    {/if}
                    {#if trackInfo?.listeners || albumInfo?.listeners}
                      <div class="flex items-center gap-2 text-xs">
                        <span class="text-gray-400">👥</span>
                        <span class="text-gray-300">
                          {(trackInfo?.listeners || albumInfo?.listeners || 0).toLocaleString()} oyentes
                        </span>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Tags -->
                {#if trackInfo?.tags && trackInfo.tags.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each trackInfo.tags.slice(0, 3) as tag}
                      <span class="px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded-full text-xs">
                        {tag}
                      </span>
                    {/each}
                  </div>
                {:else if albumInfo?.tags && albumInfo.tags.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each albumInfo.tags.slice(0, 3) as tag}
                      <span class="px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded-full text-xs">
                        {tag}
                      </span>
                    {/each}
                  </div>
                {/if}

                <!-- Last.fm badge -->
                <div class="mt-3 pt-2 border-t border-white/10">
                  <p class="text-xs text-gray-400 flex items-center gap-1">
                    Powered by
                    <span class="text-red-400 font-semibold">Last.fm</span>
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </div>
        <div class="min-w-0 flex-1 song-info" class:animate-in={isAnimating}>
          <h3 class="text-white font-semibold truncate song-title text-base">
            {player.current?.title || 'Selecciona una canción'}
          </h3>
          <p class="text-gray-400 text-sm truncate song-artist">
            {player.current?.artist || 'Artista'}{#if player.current?.album} • {player.current.album}{/if}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-400 hover:text-red-400 hover:bg-white/10 shrink-0 h-8 w-8 transition-all"
          onclick={toggleLike}
        >
          <Heart class={isLiked ? "fill-red-400 text-red-400" : ""} size={18} />
        </Button>
      </div>

      <!-- Center: Playback Controls -->
      <div class="flex flex-col items-center gap-3 flex-1">
        <div class="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 transition-all"
            onclick={toggleShuffle}
          >
            <Shuffle class={player.isShuffle ? "text-purple-400" : ""} size={18} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9 transition-all"
            onclick={previous}
            disabled={!player.hasPrevious}
          >
            <SkipBack size={22} />
          </Button>

          <Button
            size="icon"
            class="h-12 w-12 bg-white hover:bg-gray-200 text-black rounded-full shadow-xl transition-all hover:scale-105 active:scale-100"
            onclick={togglePlay}
            disabled={!player.current}
          >
            {#if player.isPlaying}
              <Pause size={20} fill="currentColor" />
            {:else}
              <Play size={20} fill="currentColor" class="ml-0.5" />
            {/if}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-gray-300 hover:text-white hover:bg-white/10 h-9 w-9 transition-all"
            onclick={next}
            disabled={!player.hasNext}
          >
            <SkipForward size={22} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 transition-all"
            onclick={toggleRepeat}
          >
            <Repeat class={player.repeatMode !== "off" ? "text-purple-400" : ""} size={18} />
          </Button>
        </div>

        <!-- Progress Bar -->
        <div class="flex items-center gap-3 w-full max-w-2xl">
          <span class="text-xs text-gray-400 w-12 text-right tabular-nums">{formatTime(player.currentTime)}</span>
          <div 
            class="flex-1 cursor-pointer group" 
            onclick={handleProgressClick}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const fakeMouseEvent = new MouseEvent('click', {
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2
                });
                Object.defineProperty(fakeMouseEvent, 'currentTarget', {
                  value: e.currentTarget,
                  enumerable: true
                });
                handleProgressClick(fakeMouseEvent as any);
              }
            }}
            role="button"
            tabindex="0"
          >
            <div class="relative h-1.5 bg-gray-700/50 rounded-full overflow-hidden transition-all group-hover:h-2">
              <div 
                class="absolute top-0 left-0 h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style="width: {player.progress}%"
              >
                <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-lg transition-opacity"></div>
              </div>
            </div>
          </div>
          <span class="text-xs text-gray-400 w-12 tabular-nums">{formatTime(player.duration)}</span>
        </div>
      </div>

      <!-- Right: Volume & Additional Controls -->
      <div class="flex items-center gap-4" style="flex: 0 0 30%; justify-content: flex-end;">
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15V6"/>
            <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
            <path d="M12 12H3"/>
            <path d="M16 6H3"/>
            <path d="M12 18H3"/>
          </svg>
        </Button>

        <div class="flex items-center gap-2 min-w-[140px]">
          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 shrink-0 transition-all"
            onclick={toggleMute}
          >
            {#if player.isMuted || player.volume === 0}
              <VolumeX size={18} />
            {:else}
              <Volume2 size={18} />
            {/if}
          </Button>
          <div class="flex-1">
            <Slider type="multiple" bind:value={volumeArray} max={100} step={1} class="w-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .music-player {
    width: 100%;
    position: relative;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.5),
      0 10px 10px -5px rgba(0, 0, 0, 0.3);
    animation: slideUpInitial 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Animación inicial al cargar */
  @keyframes slideUpInitial {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Animación cuando cambia la canción */
  .music-player.player-animate {
    animation: songChange 1s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes songChange {
    0% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    15% {
      transform: translateY(-8px) scale(1.02);
      opacity: 0.9;
    }
    30% {
      transform: translateY(0) scale(0.98);
      opacity: 0.95;
    }
    50% {
      transform: translateY(0) scale(1.01);
      opacity: 1;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  /* Partículas decorativas */
  .particles-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 1;
  }

  .particle {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent);
    animation: floatParticle 4s infinite ease-in-out;
    opacity: 0;
  }

  .particle-1 {
    width: 8px;
    height: 8px;
    top: 20%;
    left: 10%;
    animation-delay: 0s;
    animation-duration: 5s;
  }

  .particle-2 {
    width: 12px;
    height: 12px;
    top: 60%;
    left: 80%;
    animation-delay: 1s;
    animation-duration: 6s;
  }

  .particle-3 {
    width: 6px;
    height: 6px;
    top: 40%;
    left: 30%;
    animation-delay: 2s;
    animation-duration: 4.5s;
  }

  .particle-4 {
    width: 10px;
    height: 10px;
    top: 70%;
    left: 60%;
    animation-delay: 1.5s;
    animation-duration: 5.5s;
  }

  .particle-5 {
    width: 8px;
    height: 8px;
    top: 30%;
    left: 90%;
    animation-delay: 0.5s;
    animation-duration: 5s;
  }

  @keyframes floatParticle {
    0%, 100% {
      transform: translate(0, 0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 0.6;
      transform: translate(0, 0) scale(1);
    }
    50% {
      opacity: 0.8;
      transform: translate(20px, -20px) scale(1.5);
    }
    90% {
      opacity: 0.4;
    }
    100% {
      transform: translate(40px, -40px) scale(0);
      opacity: 0;
    }
  }

  /* Ondas de sonido animadas */
  .sound-wave {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;
    padding: 0 20%;
    pointer-events: none;
    opacity: 0.1;
    z-index: 0;
  }

  .wave {
    width: 4px;
    background: linear-gradient(to top, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8));
    border-radius: 4px 4px 0 0;
    animation: soundWave 1s ease-in-out infinite;
  }

  .wave-1 {
    animation-delay: 0s;
  }

  .wave-2 {
    animation-delay: 0.2s;
  }

  .wave-3 {
    animation-delay: 0.4s;
  }

  @keyframes soundWave {
    0%, 100% {
      height: 10%;
    }
    50% {
      height: 60%;
    }
  }

  .music-player::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(55, 65, 81, 0.4) 0%,
      rgba(31, 41, 55, 0.6) 100%
    );
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    z-index: 0;
    transition: all 0.4s ease;
  }

  .music-player.player-animate::before {
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.2) 0%,
      rgba(236, 72, 153, 0.15) 50%,
      rgba(31, 41, 55, 0.6) 100%
    );
  }

  .music-player::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 30% 50%,
      rgba(168, 85, 247, 0.15) 0%,
      transparent 60%
    );
    pointer-events: none;
    z-index: 0;
    animation: pulseGlow 3s ease-in-out infinite;
  }

  @keyframes pulseGlow {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.8;
    }
  }

  /* Enhanced backdrop blur support */
  @supports (backdrop-filter: blur(40px)) or (-webkit-backdrop-filter: blur(40px)) {
    .music-player::before {
      background: linear-gradient(
        135deg,
        rgba(55, 65, 81, 0.3) 0%,
        rgba(31, 41, 55, 0.5) 100%
      );
    }
  }

  /* Enhance frosted glass effect */
  .music-player {
    background: rgba(31, 41, 55, 0.2);
  }

  /* Album art animations */
  .album-art-wrapper {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  .album-art {
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    z-index: 2;
  }

  .album-art.playing {
    animation: rotateAlbum 20s linear infinite;
    box-shadow: 
      0 0 0 2px rgba(168, 85, 247, 0.3),
      0 0 20px rgba(168, 85, 247, 0.4),
      0 4px 14px 0 rgba(0, 0, 0, 0.3);
  }

  .album-art-wrapper:hover .album-art {
    transform: scale(1.05);
    filter: brightness(1.1);
  }

  .album-art-wrapper:hover .album-art.playing {
    animation-play-state: paused;
  }

  @keyframes rotateAlbum {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Hover Card */
  .hover-card {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    z-index: 100;
    animation: hoverCardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }

  .hover-card::before {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: rgba(17, 24, 39, 0.95);
    border-right: 1px solid rgba(168, 85, 247, 0.3);
    border-bottom: 1px solid rgba(168, 85, 247, 0.3);
  }

  .hover-card-content {
    background: rgba(17, 24, 39, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.5),
      0 10px 10px -5px rgba(0, 0, 0, 0.3),
      0 0 40px rgba(168, 85, 247, 0.2);
  }

  @keyframes hoverCardIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  .album-ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 64px;
    height: 64px;
    margin-left: -32px;
    margin-top: -32px;
    border-radius: 12px;
    border: 2px solid rgba(168, 85, 247, 0.6);
    z-index: 1;
    animation: ripple 2s ease-out infinite;
  }

  @keyframes ripple {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Song info animations */
  .song-info {
    animation: fadeInSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .song-info.animate-in .song-title {
    animation: slideInTitle 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .song-info.animate-in .song-artist {
    animation: slideInArtist 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s backwards;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInTitle {
    0% {
      opacity: 0;
      transform: translateY(-10px);
      filter: blur(4px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }

  @keyframes slideInArtist {
    0% {
      opacity: 0;
      transform: translateY(-8px);
      filter: blur(3px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }

  .song-title {
    transition: all 0.3s ease;
  }

  .song-artist {
    transition: all 0.3s ease;
  }

  /* Button animations */
  .music-player :global(button) {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .music-player :global(button:not(:disabled):hover) {
    transform: scale(1.05);
  }

  .music-player :global(button:not(:disabled):active) {
    transform: scale(0.98);
  }

  .music-player :global(button:disabled) {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Play button special animation */
  .music-player :global(button.rounded-full) {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
  }

  .music-player :global(button.rounded-full:not(:disabled):hover) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.2);
  }

  .music-player :global(button.rounded-full:not(:disabled):active) {
    transform: scale(1.0);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.15);
  }

  /* Icon animations */
  .music-player :global(svg) {
    transition: all 0.2s ease-in-out;
  }

  .music-player :global(button:not(:disabled):hover svg) {
    filter: drop-shadow(0 0 3px currentColor);
  }

  /* Custom progress bar styles */
  .music-player :global([role="progressbar"]) {
    display: none; /* Ocultamos el componente Progress ya que usamos uno custom */
  }

  /* Slider thumb animation */
  .music-player :global(input[type="range"]::-webkit-slider-thumb) {
    transition: all 0.2s ease;
  }

  .music-player :global(input[type="range"]:hover::-webkit-slider-thumb) {
    transform: scale(1.2);
  }

  /* Slider custom styles */
  .music-player :global([data-slot="slider"]) {
    height: 4px;
  }

  .music-player :global([data-slot="slider-track"]) {
    background: rgba(255, 255, 255, 0.1);
    height: 4px;
  }

  .music-player :global([data-slot="slider-range"]) {
    background: rgba(255, 255, 255, 0.7);
  }

  .music-player :global([data-slot="slider-thumb"]) {
    width: 12px;
    height: 12px;
    background: white;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .music-player :global([data-slot="slider"]:hover [data-slot="slider-thumb"]) {
    width: 14px;
    height: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  /* Stagger animation for controls */
  .music-player :global(button:nth-child(1)) {
    animation: fadeIn 0.4s ease-out 0.1s backwards;
  }

  .music-player :global(button:nth-child(2)) {
    animation: fadeIn 0.4s ease-out 0.2s backwards;
  }

  .music-player :global(button:nth-child(3)) {
    animation: fadeIn 0.4s ease-out 0.3s backwards;
  }

  .music-player :global(button:nth-child(4)) {
    animation: fadeIn 0.4s ease-out 0.4s backwards;
  }

  .music-player :global(button:nth-child(5)) {
    animation: fadeIn 0.4s ease-out 0.5s backwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Heart animation */
  .music-player :global(.fill-red-400) {
    animation: heartBeat 0.5s ease;
  }

  @keyframes heartBeat {
    0%, 100% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.3);
    }
    50% {
      transform: scale(1.1);
    }
  }
</style>
