<script lang="ts">
  import gsap from 'gsap';
  import { usePlayer } from '@/lib/hooks';
  import { onMount } from 'svelte';
  
  let { duration }: { duration: number } = $props();
  const player = usePlayer();
  let thumbRef = $state<HTMLElement>();
  let trackRef = $state<HTMLElement>();
  let fillRef = $state<HTMLElement>();
  let isDragging = $state(false);
  let quickToThumb: gsap.QuickToFunc | null = null;
  let quickToFill: gsap.QuickToFunc | null = null;
  
  // Derived progress for when NOT dragging
  const progressPercent = $derived(player.progress);
  
  onMount(() => {
    if (thumbRef && fillRef) {
        quickToThumb = gsap.quickTo(thumbRef, "left", {
            duration: 0.1,
            ease: "power1.out",
            unit: "%"
        });
        quickToFill = gsap.quickTo(fillRef, "width", {
            duration: 0.1,
            ease: "power1.out",
            unit: "%"
        });
    }
    
    return () => {
        quickToThumb = null;
        quickToFill = null;
    };
  });
  
  $effect(() => {
      if (!isDragging && quickToThumb && quickToFill) {
          quickToThumb(progressPercent);
          quickToFill(progressPercent);
      }
  });
  
  function handlePointerDown(e: PointerEvent) {
    if (!trackRef) return;
    isDragging = true;
    trackRef.setPointerCapture(e.pointerId);
    
    const rect = trackRef.getBoundingClientRect();
    
    function updatePosition(moveEvent: PointerEvent) {
      const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const percent100 = percent * 100;
      
      // Ultra-fast update sem garbage collection
      quickToThumb?.(percent100);
      quickToFill?.(percent100);
      
      // Optional: update player time immediately or on release?
      // For smooth scrubbing, we can seek.
      // But we should probably throttle it.
      // For now, let's just update visual and seek on up.
    }
    
    function stopDrag(upEvent: PointerEvent) {
      isDragging = false;
      trackRef?.releasePointerCapture(upEvent.pointerId);
      trackRef?.removeEventListener('pointermove', updatePosition);
      trackRef?.removeEventListener('pointerup', stopDrag);
      
      // Final seek
      const percent = Math.max(0, Math.min(1, (upEvent.clientX - rect.left) / rect.width));
      player.seek(percent * 100);
    }
    
    trackRef.addEventListener('pointermove', updatePosition);
    trackRef.addEventListener('pointerup', stopDrag);
    
    // Initial click jump
    updatePosition(e);
  }
</script>

<div 
    bind:this={trackRef}
    class="slider-track-container"
    onpointerdown={handlePointerDown}
>
  <div class="slider-track">
      <div bind:this={fillRef} class="slider-fill" style="width: {progressPercent}%"></div>
      <div 
        bind:this={thumbRef}
        class="slider-thumb"
        role="slider"
        tabindex="0"
        aria-valuenow={progressPercent}
        style="left: {progressPercent}%"
      ></div>
  </div>
</div>

<style>
    .slider-track-container {
        width: 100%;
        height: 12px;
        display: flex;
        align-items: center;
        cursor: pointer;
        position: relative;
        touch-action: none;
    }
    .slider-track {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        position: relative;
    }
    .slider-fill {
        height: 100%;
        background: white;
        border-radius: 2px;
        pointer-events: none;
        will-change: width;
    }
    .slider-thumb {
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none; /* Container handles events */
        will-change: left;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }
    .slider-track-container:hover .slider-thumb {
        transform: translate(-50%, -50%) scale(1.2);
    }
</style>
