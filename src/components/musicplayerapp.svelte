<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Slider } from "$lib/components/ui/slider";
  import { Progress } from "$lib/components/ui/progress";
  import { Separator } from "$lib/components/ui/separator";
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

  let isPlaying = false;
  let isMuted = false;
  let isLiked = false;
  let isShuffle = false;
  let isRepeat = false;
  let currentTime = 0;
  let duration = 240; // 4 minutes in seconds
  let volume = [70];

  function togglePlay() {
    isPlaying = !isPlaying;
  }

  function toggleMute() {
    isMuted = !isMuted;
  }

  function toggleLike() {
    isLiked = !isLiked;
  }

  function toggleShuffle() {
    isShuffle = !isShuffle;
  }

  function toggleRepeat() {
    isRepeat = !isRepeat;
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  $: progress = (currentTime / duration) * 100;
</script>

<div class="music-player">
  <div class="px-6 py-4">
    <!-- Main Player Row -->
    <div class="flex items-center justify-between gap-6">
      <!-- Left: Album Art & Song Info -->
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <div class="w-14 h-14 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg flex items-center justify-center shrink-0">
          <span class="text-white text-2xl">♪</span>
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-white font-semibold truncate">Heat Waves</h3>
          <p class="text-gray-400 text-sm truncate">Glass Animals - Dreamland</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-400 hover:text-red-400 shrink-0"
          onclick={toggleLike}
        >
          <Heart class={isLiked ? "fill-red-400 text-red-400" : ""} size={20} />
        </Button>
      </div>

      <!-- Center: Playback Controls -->
      <div class="flex flex-col items-center gap-2 flex-1 max-w-2xl">
        <div class="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white h-8 w-8"
            onclick={toggleShuffle}
          >
            <Shuffle class={isShuffle ? "text-white" : ""} size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white h-9 w-9"
          >
            <SkipBack size={20} />
          </Button>

          <Button
            size="icon"
            class="h-10 w-10 bg-white hover:bg-gray-200 text-black rounded-full shadow-lg"
            onclick={togglePlay}
          >
            {#if isPlaying}
              <Pause size={18} fill="currentColor" />
            {:else}
              <Play size={18} fill="currentColor" class="ml-0.5" />
            {/if}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white h-9 w-9"
          >
            <SkipForward size={20} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white h-8 w-8"
            onclick={toggleRepeat}
          >
            <Repeat class={isRepeat ? "text-white" : ""} size={16} />
          </Button>
        </div>

        <!-- Progress Bar -->
        <div class="flex items-center gap-3 w-full">
          <span class="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <div class="flex-1">
            <Progress value={progress} class="h-1 bg-gray-700" />
          </div>
          <span class="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>
      </div>

      <!-- Right: Volume & Additional Controls -->
      <div class="flex items-center gap-3 flex-1 justify-end">
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-400 hover:text-white h-9 w-9"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15V6"/>
            <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
            <path d="M12 12H3"/>
            <path d="M16 6H3"/>
            <path d="M12 18H3"/>
          </svg>
        </Button>

        <div class="flex items-center gap-2 w-32">
          <Button
            variant="ghost"
            size="icon"
            class="text-gray-400 hover:text-white h-9 w-9 shrink-0"
            onclick={toggleMute}
          >
            {#if isMuted || volume[0] === 0}
              <VolumeX size={18} />
            {:else}
              <Volume2 size={18} />
            {/if}
          </Button>
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
    animation: fadeInUp 0.6s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
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
    z-index: -1;
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
    z-index: -1;
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

  /* Button animations */
  .music-player :global(button) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .music-player :global(button:hover) {
    transform: scale(1.1);
  }

  .music-player :global(button:active) {
    transform: scale(0.95);
  }

  /* Play button special animation */
  .music-player :global(button.rounded-full) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 14px 0 rgba(255, 255, 255, 0.3);
  }

  .music-player :global(button.rounded-full:hover) {
    transform: scale(1.15);
    box-shadow: 0 6px 20px 0 rgba(255, 255, 255, 0.4);
  }

  .music-player :global(button.rounded-full:active) {
    transform: scale(1.05);
  }

  /* Pulse animation for playing state */
  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 4px 14px 0 rgba(255, 255, 255, 0.3);
    }
    50% {
      box-shadow: 0 6px 20px 0 rgba(255, 255, 255, 0.5);
    }
  }

  /* Icon animations */
  .music-player :global(svg) {
    transition: all 0.2s ease-in-out;
  }

  .music-player :global(button:hover svg) {
    filter: drop-shadow(0 0 8px currentColor);
  }

  /* Progress bar animation */
  .music-player :global([role="progressbar"]) {
    transition: all 0.3s ease;
  }

  /* Slider thumb animation */
  .music-player :global(input[type="range"]::-webkit-slider-thumb) {
    transition: all 0.2s ease;
  }

  .music-player :global(input[type="range"]:hover::-webkit-slider-thumb) {
    transform: scale(1.2);
  }

  /* Album art rotation on hover */
  .music-player :global(.w-14.h-14) {
    transition: transform 0.5s ease;
  }

  .music-player :global(.w-14.h-14:hover) {
    transform: rotate(5deg) scale(1.05);
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
