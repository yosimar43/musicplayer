<script lang="ts">
  import { SkipBack, SkipForward, Play, Pause } from 'lucide-svelte';

  let { 
    isPlaying, 
    onPlayPause, 
    onPrevious, 
    onNext 
  }: { 
    isPlaying: boolean; 
    onPlayPause: () => void; 
    onPrevious: () => void; 
    onNext: () => void 
  } = $props();
</script>

<div class="player-controls">
  <!-- Previous Button -->
  <button
    class="control-button"
    onclick={onPrevious}
    title="Anterior"
  >
    <div class="button-bg"></div>
    <div class="button-content">
      <SkipBack size={18} class="button-icon" />
    </div>
    <!-- Sparkles -->
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
  </button>

  <!-- Play/Pause Button -->
  <button
    class="control-button play-button"
    onclick={onPlayPause}
    title={isPlaying ? "Pausar" : "Reproducir"}
  >
    <div class="button-bg"></div>
    <div class="button-content">
      {#if isPlaying}
        <Pause size={20} class="button-icon" fill="currentColor" />
      {:else}
        <Play size={20} class="button-icon ml-0.5" fill="currentColor" />
      {/if}
    </div>
    <!-- Sparkles -->
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
  </button>

  <!-- Next Button -->
  <button
    class="control-button"
    onclick={onNext}
    title="Siguiente"
  >
    <div class="button-bg"></div>
    <div class="button-content">
      <SkipForward size={18} class="button-icon" />
    </div>
    <!-- Sparkles -->
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
    <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
    </svg>
  </button>
</div>

<style>
  /* Player Controls */
  .player-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  /* Control Button Style - Circular con anillo animado */
  .control-button {
    position: relative;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    transition: all 0.3s ease;
    cursor: pointer;
    user-select: none;
    outline: none;
    background: rgba(56, 189, 248, 0.15);
    backdrop-filter: blur(8px);
    border: none;
  }

  .control-button:focus-visible {
    outline: 2px solid rgba(56, 189, 248, 0.5);
    outline-offset: 2px;
  }

  /* Anillo animado en hover */
  .button-bg {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, rgba(103, 232, 249, 0.8), rgba(56, 189, 248, 0.6));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    animation: rotate-ring 2s linear infinite;
    animation-play-state: paused;
  }

  @keyframes rotate-ring {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .control-button:hover .button-bg {
    opacity: 1;
    animation-play-state: running;
  }

  /* Button Content */
  .button-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  /* Icon Styling */
  :global(.control-button .button-icon) {
    color: rgba(255, 255, 255, 0.95);
    transition: all 0.3s ease;
    filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.4));
  }

  .control-button:hover :global(.button-icon) {
    color: rgba(103, 232, 249, 1);
    filter: drop-shadow(0 0 10px rgba(103, 232, 249, 0.8));
    transform: scale(1.1);
  }

  .control-button:active {
    transform: scale(0.95);
  }

  /* Play Button Specifics */
  .play-button {
    width: 44px;
    height: 44px;
    background: rgba(56, 189, 248, 0.25);
    border: none;
  }

  .play-button:hover {
    background: rgba(56, 189, 248, 0.35);
    transform: scale(1.05);
  }

  .play-button:active {
    transform: scale(0.95);
  }

  /* Sparkles Effect (adapted from ShinyText) */
  .sparkle {
    position: absolute;
    z-index: 3;
    width: 8px;
    aspect-ratio: 1;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }

  .sparkle path {
    fill: rgba(103, 232, 249, 0.9);
  }

  .control-button:hover .sparkle {
    animation: button-sparkle 0.75s calc((var(--delay-step) * var(--d)) * 1s) both;
  }

  @keyframes button-sparkle {
    50% {
      transform: translate(-50%, -50%) scale(var(--s, 1));
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  /* Sparkle Positioning for buttons */
  .control-button .sparkle { --delay-step: 0.15; }
  .control-button:nth-child(1) .sparkle:nth-of-type(1) { top: 10%; left: 20%; --s: 1.1; --d: 1; }
  .control-button:nth-child(1) .sparkle:nth-of-type(2) { top: 90%; left: 80%; --s: 1.25; --d: 2; }
  .control-button:nth-child(1) .sparkle:nth-of-type(3) { top: 50%; left: 110%; --s: 0.9; --d: 3; }

  .control-button.play-button .sparkle:nth-of-type(1) { top: 5%; left: 15%; --s: 1.3; --d: 1; }
  .control-button.play-button .sparkle:nth-of-type(2) { top: 95%; left: 85%; --s: 1.4; --d: 2; }
  .control-button.play-button .sparkle:nth-of-type(3) { top: 20%; left: 105%; --s: 1.1; --d: 3; }
  .control-button.play-button .sparkle:nth-of-type(4) { top: 80%; left: -5%; --s: 0.9; --d: 4; }
  .control-button.play-button .sparkle:nth-of-type(5) { top: 50%; left: 50%; --s: 1.2; --d: 5; }

  .control-button:nth-child(3) .sparkle:nth-of-type(1) { top: 10%; left: 80%; --s: 1.1; --d: 1; }
  .control-button:nth-child(3) .sparkle:nth-of-type(2) { top: 90%; left: 20%; --s: 1.25; --d: 2; }
  .control-button:nth-child(3) .sparkle:nth-of-type(3) { top: 50%; left: -10%; --s: 0.9; --d: 3; }
</style>
