<script lang="ts">
  import { onMount } from 'svelte';
  import { animate } from 'animejs';
  
  let orb1: HTMLDivElement;
  let orb2: HTMLDivElement;
  let orb3: HTMLDivElement;
  let orb4: HTMLDivElement;
  
  onMount(() => {
    // Animación continua de los orbes con movimiento orgánico
    animate(orb1, {
      translateX: [0, 100, -50, 0],
      translateY: [0, -80, 60, 0],
      scale: [1, 1.3, 0.9, 1],
      opacity: [0.15, 0.25, 0.15],
      duration: 20000,
      loop: true,
      ease: 'inOut(2)'
    });
    
    animate(orb2, {
      translateX: [0, -120, 80, 0],
      translateY: [0, 100, -70, 0],
      scale: [1, 0.8, 1.2, 1],
      opacity: [0.2, 0.3, 0.15, 0.2],
      duration: 25000,
      loop: true,
      ease: 'inOut(2)'
    });
    
    animate(orb3, {
      translateX: [0, 50, -100, 0],
      translateY: [0, -50, 80, 0],
      scale: [1, 1.4, 0.7, 1],
      opacity: [0.1, 0.2, 0.1],
      duration: 30000,
      loop: true,
      ease: 'inOut(2)'
    });
    
    animate(orb4, {
      translateX: [0, -80, 120, 0],
      translateY: [0, 70, -90, 0],
      scale: [1, 0.9, 1.3, 1],
      opacity: [0.15, 0.25, 0.15],
      duration: 22000,
      loop: true,
      ease: 'inOut(2)'
    });
  });
</script>

<div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
  <!-- Gradiente base animado -->
  <div class="absolute inset-0 bg-linear-to-br from-sky-950 via-sky-900 to-black animate-gradient"></div>
  
  <!-- Orbes flotantes con blur -->
  <div
    bind:this={orb1}
    class="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]"
    style="will-change: transform, opacity;"
  ></div>
  
  <div
    bind:this={orb2}
    class="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px]"
    style="will-change: transform, opacity;"
  ></div>
  
  <div
    bind:this={orb3}
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]"
    style="will-change: transform, opacity;"
  ></div>
  
  <div
    bind:this={orb4}
    class="absolute top-1/3 right-1/4 w-72 h-72 bg-violet-500/15 rounded-full blur-[110px]"
    style="will-change: transform, opacity;"
  ></div>
  
  <!-- Noise texture overlay para profundidad -->
  <div class="absolute inset-0 opacity-[0.015] bg-noise mix-blend-overlay"></div>
</div>

<style>
  @keyframes gradient {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient 15s ease infinite;
  }
  
  .bg-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E");
  }
</style>
