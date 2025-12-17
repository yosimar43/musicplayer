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
    border: 1px solid rgba(56, 189, 248, 0.3);
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
    border: 1px solid rgba(56, 189, 248, 0.4);
  }

  .play-button:hover {
    background: rgba(56, 189, 248, 0.35);
    transform: scale(1.05);
  }

  .play-button:active {
    transform: scale(0.95);
  }
</style>
