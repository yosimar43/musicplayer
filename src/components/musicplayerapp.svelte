<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Slider } from "$lib/components/ui/slider";
  import {
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Heart, Shuffle, Repeat,
  } from "lucide-svelte";
  import { player, togglePlay, next, previous, toggleMute, toggleShuffle, toggleRepeat } from '@/lib/state';
  import { usePlayerUI } from '@/lib/hooks/usePlayerUI.svelte';

  // 🎧 Player UI hook (Svelte 5 runes) - Mantener reactividad sin destructurar
  let playerUI = usePlayerUI();

  // Mueve el manejador de keydown fuera del HTML para Svelte 5
  function handleProgressKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // currentTarget es el elemento que tiene el listener
      const el = e.currentTarget as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const fakeMouseEvent = new MouseEvent('click', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
      // Algunos manejadores esperan currentTarget, lo simulamos
      Object.defineProperty(fakeMouseEvent, 'currentTarget', {
        value: el,
        enumerable: true
      });
      playerUI.handleProgressClick(fakeMouseEvent as any);
    }
  }
</script>
<!-- Tailwind solo para estilos visuales -->
<div
  class="relative w-full rounded-2xl overflow-visible transition-all duration-500 ease-out {playerUI.isAnimating && player.current ? 'animate-song-change' : ''}"
>
  <!-- Background con animaciones -->
  <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-2xl">
    <div class="absolute inset-0 z-0 border bg-linear-to-br from-sky-900/60 to-sky-950/80 backdrop-blur-2xl saturate-150 border-sky-400/20"></div>
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,211,238,0.25),transparent_60%)] pointer-events-none z-0 animate-pulse-glow"></div>

    {#if player.current}
      <div class="particles-container">
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
        <div class="particle particle-4"></div>
        <div class="particle particle-5"></div>
      </div>
    {/if}

    {#if !player.isPlaying}
      <div class="sound-wave opacity-20">
        <div class="wave wave-1"></div>
        <div class="wave wave-2"></div>
        <div class="wave wave-3"></div>
      </div>
    {/if}
  </div>

  <!-- Contenido principal -->
  <div class="relative z-10 px-6 py-3">
    <div class="flex items-center justify-between gap-8">
      <!-- Left -->
      <div class="flex items-center min-w-0 gap-4" style="flex: 0 0 30%;">
        <div class="relative inline-block" role="img" aria-label="Album artwork">
          {#if playerUI.albumArtUrl}
            <img
              src={playerUI.albumArtUrl}
              alt={player.current?.album || 'Album'}
              class="w-16 h-16 rounded-xl object-cover shadow-lg transition-all duration-500 {player.isPlaying ? 'animate-spin ring-2 ring-cyan-400 shadow-cyan-400/50' : ''}"
            />
          {:else}
            <div
              class="flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/40 text-white text-3xl transition-all duration-500 {player.isPlaying ? 'animate-spin ring-2 ring-cyan-400' : ''}"
            >
              ♪
            </div>
          {/if}
          {#if player.isPlaying}
            <div class="album-ripple"></div>
          {/if}
        </div>

        <div class="flex-1 min-w-0 animate-fade-in-slide">
          <h3 class="text-base font-semibold truncate text-sky-50">
            {player.current?.title || 'Selecciona una canción'}
          </h3>
          <p class="text-sm truncate text-sky-300">
            {player.current?.artist || 'Artista'}{#if player.current?.album} • {player.current.album}{/if}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 text-sky-300 hover:bg-red-500/20 hover:text-red-400"
          onclick={playerUI.toggleLike}
          aria-pressed={playerUI.isLiked}
        >
          <Heart class={playerUI.isLiked ? "fill-red-400 text-red-400 animate-heart-beat" : ""} size={18} />
        </Button>
      </div>

      <!-- Center -->
      <div class="flex flex-col items-center flex-1 gap-3">
        <div class="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            class="text-sky-300 hover:bg-cyan-500/20 hover:text-cyan-300"
            onclick={toggleShuffle}
            aria-pressed={player.isShuffle}
          >
            <Shuffle class={player.isShuffle ? "text-cyan-400" : ""} size={18} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-sky-200 hover:bg-white/10 hover:text-sky-50"
            onclick={previous}
            disabled={!player.hasPrevious}
          >
            <SkipBack size={22} />
          </Button>

          <Button
            size="icon"
            class="text-white transition-all rounded-full shadow-xl bg-linear-to-br from-cyan-400 to-blue-500 shadow-cyan-500/50 hover:scale-105 hover:from-cyan-300 hover:to-blue-400 active:scale-100"
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
            class="text-sky-200 hover:bg-white/10 hover:text-sky-50"
            onclick={next}
            disabled={!player.hasNext}
          >
            <SkipForward size={22} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-sky-300 hover:bg-cyan-500/20 hover:text-cyan-300"
            onclick={toggleRepeat}
            aria-pressed={player.repeatMode !== "off"}
          >
            <Repeat class={player.repeatMode !== "off" ? "text-cyan-400" : ""} size={18} />
          </Button>
        </div>

        <!-- Progress Bar -->
        <div class="flex items-center w-full max-w-2xl gap-3">
          <span class="w-12 text-xs text-right tabular-nums text-sky-300">{playerUI.formatTime(player.currentTime)}</span>
          <div
            class="flex-1 cursor-pointer group"
            onclick={playerUI.handleProgressClick}
            onkeydown={handleProgressKeydown}
            role="button"
            tabindex="0"
          >
            <div class="relative h-1.5 rounded-full bg-sky-800/50 transition-all group-hover:h-2">
              <div
                class="absolute top-0 left-0 h-full transition-all rounded-full shadow-lg bg-linear-to-r from-cyan-400 to-blue-500 shadow-cyan-500/30"
                style="width: {player.progress}%"
              >
                <div class="absolute right-0 w-3 h-3 transition-opacity -translate-y-1/2 bg-white rounded-full shadow-lg opacity-0 top-1/2 group-hover:opacity-100"></div>
              </div>
            </div>
          </div>
          <span class="w-12 text-xs tabular-nums text-sky-300">{playerUI.formatTime(player.current?.duration ?? 0)}</span>
        </div>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-4" style="flex: 0 0 30%; justify-content: flex-end;">
        <Button
          variant="ghost"
          size="icon"
          class="text-sky-300 hover:bg-cyan-500/20 hover:text-cyan-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15V6" />
            <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path d="M12 12H3" />
            <path d="M16 6H3" />
            <path d="M12 18H3" />
          </svg>
        </Button>

        <div class="flex min-w-[140px] items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            class="shrink-0 text-sky-300 hover:bg-white/10 hover:text-sky-50"
            onclick={toggleMute}
          >
            {#if player.isMuted || player.volume === 0}
              <VolumeX size={18} />
            {:else}
              <Volume2 size={18} />
            {/if}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            bind:value={player.volume}
            class="w-full h-1.5 bg-sky-800/50 rounded-full appearance-none cursor-pointer slider-thumb"
            style="background: linear-gradient(to right, rgb(34 211 238) 0%, rgb(34 211 238) {player.volume}%, rgb(56 189 248 / 0.5) {player.volume}%, rgb(56 189 248 / 0.5) 100%);"
          />
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Solo animaciones que requieren keyframes -->
<style>
  @keyframes pulseGlow {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.8;
    }
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

  @keyframes soundWave {
    0%, 100% {
      height: 10%;
    }
    50% {
      height: 60%;
    }
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

  .animate-pulse-glow {
    animation: pulseGlow 3s ease-in-out infinite;
  }

  :global(.animate-heart-beat) {
    animation: heartBeat 0.5s ease;
  }

  .animate-fade-in-slide {
    animation: fadeInSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-song-change {
    animation: songChange 1s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .particle {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34, 211, 238, 0.6), transparent);
    animation: floatParticle 4s infinite ease-in-out;
    opacity: 0;
  }

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
    background: linear-gradient(to top, rgba(34, 211, 238, 0.9), rgba(59, 130, 246, 0.9));
    border-radius: 4px 4px 0 0;
    animation: soundWave 1s ease-in-out infinite;
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
    border: 2px solid rgba(34, 211, 238, 0.7);
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

  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.5);
    transition: all 0.2s ease;
  }

  .slider-thumb::-webkit-slider-thumb:hover {
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.7);
    transform: scale(1.1);
  }

  .slider-thumb::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid rgba(34, 211, 238, 0.5);
    transition: all 0.2s ease;
  }

  .slider-thumb::-moz-range-thumb:hover {
    border-color: rgba(34, 211, 238, 0.7);
    transform: scale(1.1);
  }
</style>