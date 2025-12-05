<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat } from 'lucide-svelte';
  import { usePlayer } from '@/lib/hooks/usePlayer.svelte';

  const player = usePlayer();

  let containerRef = $state<HTMLDivElement>();
 
  // Animación de entrada
  onMount(() => {
    if (containerRef) {
      gsap.from(containerRef, {
        y: 100,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.5
      });
    }

    // Iniciar loop de visualización

   
  });

</script>

  <div bind:this={containerRef} class="floating-player">
  
  </div>

<style>
  .floating-player {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 1100px;
    height: 100px;
    
    /* Glassmorphism - Matching NavBar */
    background: rgba(30, 41, 59, 0.75);
    backdrop-filter: blur(40px) saturate(150%);
    border: 1.5px solid rgba(71, 85, 105, 0.4);
    border-radius: 20px;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 10px 40px rgba(34, 211, 238, 0.2),
      0 0 60px rgba(34, 211, 238, 0.15),
      0 0 100px rgba(147, 51, 234, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    
    display: grid;
    grid-template-columns: 200px 1fr 320px 80px;
    grid-template-rows: 1fr auto;
    gap: 16px;
    padding: 14px 24px;
    z-index: 1000;
    
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  /* Top Light Border (Reflection) - Matching NavBar */
  .floating-player::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.5), transparent);
    opacity: 0.9;
    pointer-events: none;
  }

  /* Glow Line - Matching NavBar */
  .floating-player::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.7), rgba(147, 51, 234, 0.5), transparent);
    opacity: 0.7;
    filter: blur(1px);
    pointer-events: none;
  }

  .floating-player:hover {
    transform: translateX(-50%) scale(1.015);
    background: rgba(30, 41, 59, 0.85);
    border-color: rgba(71, 85, 105, 0.5);
    box-shadow: 
      0 25px 70px rgba(0, 0, 0, 0.6),
      0 15px 50px rgba(34, 211, 238, 0.3),
      0 0 80px rgba(34, 211, 238, 0.2),
      0 0 120px rgba(147, 51, 234, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  }

  .floating-player:hover::after {
    opacity: 0.9;
  }
</style>