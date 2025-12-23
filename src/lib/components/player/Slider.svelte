<script lang="ts">
  import { usePlayer } from '@/lib/hooks';
  
  let { duration }: { duration: number } = $props();
  const player = usePlayer();
  
  let isDragging = $state(false);
  let localValue = $state(0);

  // Sincronizar con el player cuando no se está arrastrando
  $effect(() => {
    if (!isDragging) {
      localValue = player.progress;
    }
  });

  function handleInput(e: Event) {
    isDragging = true;
    const target = e.target as HTMLInputElement;
    localValue = Number(target.value);
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const newValue = Number(target.value);
    
    // Solo usar seek - el hook maneja la actualización del store
    player.seek(newValue);
    
    isDragging = false;
  }
</script>

<div class="slider-container">
  <input 
    type="range" 
    min="0" 
    max="100" 
    step="0.1"
    value={localValue}
    oninput={handleInput}
    onchange={handleChange}
    class="slider-input"
    style="--progress: {localValue}%"
  />
</div>

<style>
  .slider-container {
    width: 100%;
    padding: 0 6px;
    height: 24px;
    display: flex;
    align-items: center;
  }

  .slider-input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    /* 3-color gradient: Indigo -> Sky Blue -> Cyan (matches app theme) */
    background: linear-gradient(to right, #e4ec51d1, #5ef838bb, #22d3eed2 var(--progress), rgba(255, 255, 255, 0.1) var(--progress));
    border-radius: 999px;
    outline: none;
    transition: height 0.2s ease;
  }

  /* Thumb - Webkit (Chrome, Safari, Edge) */
  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1), 0 0 10px rgba(34, 211, 238, 0.5);
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
  }

  /* Thumb - Firefox */
  .slider-input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: none;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1), 0 0 10px rgba(34, 211, 238, 0.5);
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
  }

  /* Hover Effects */
  .slider-container:hover .slider-input {
    height: 6px;
  }

  .slider-container:hover .slider-input::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  .slider-container:hover .slider-input::-moz-range-thumb {
    transform: scale(1.2);
  }

  /* Active/Dragging Effects */
  .slider-input:active::-webkit-slider-thumb {
    transform: scale(1.4);
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2), 0 0 15px rgba(34, 211, 238, 0.6);
  }

  .slider-input:active::-moz-range-thumb {
    transform: scale(1.4);
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.2), 0 0 15px rgba(34, 211, 238, 0.6);
  }
</style>
