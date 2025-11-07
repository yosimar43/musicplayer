<script lang="ts">
  import { onMount } from 'svelte';
  import { animate, stagger } from 'animejs';
  
  interface Props {
    icon: any;
    value: string | number;
    label: string;
    color?: 'cyan' | 'blue' | 'purple' | 'violet';
    index?: number;
  }
  
  let { icon, value, label, color = 'cyan', index = 0 }: Props = $props();
  
  let cardRef: HTMLDivElement;
  let iconRef: HTMLDivElement;
  
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/30 shadow-cyan-500/20',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30 shadow-blue-500/20',
    purple: 'from-purple-500/20 to-blue-500/20 border-purple-400/30 shadow-purple-500/20',
    violet: 'from-violet-500/20 to-purple-500/20 border-violet-400/30 shadow-violet-500/20'
  };
  
  onMount(() => {
    // Animación de entrada con stagger
    animate(cardRef, {
      opacity: [0, 1],
      translateY: [40, 0],
      scale: [0.9, 1],
      duration: 800,
      delay: index * 100 + 300,
      ease: 'outElastic(1, 0.8)'
    });
    
    // Animación continua del ícono
    animate(iconRef, {
      translateY: [0, -5, 0],
      rotate: [0, 5, -5, 0],
      duration: 3000,
      delay: index * 200,
      loop: true,
      ease: 'inOut(2)'
    });
    
    // Hover animations
    cardRef.addEventListener('mouseenter', () => {
      animate(cardRef, {
        scale: 1.05,
        duration: 400,
        ease: 'out(2)'
      });
      
      animate(iconRef, {
        rotate: 360,
        scale: [1, 1.2, 1],
        duration: 600,
        ease: 'outElastic(1, 0.5)'
      });
    });
    
    cardRef.addEventListener('mouseleave', () => {
      animate(cardRef, {
        scale: 1,
        duration: 400,
        ease: 'out(2)'
      });
    });
  });
</script>

<div
  bind:this={cardRef}
  class="stats-card group relative overflow-hidden rounded-2xl bg-linear-to-br {colorClasses[color]} backdrop-blur-xl border p-6 shadow-2xl cursor-pointer"
  style="will-change: transform; transform: translateZ(0);"
>
  <!-- Glow effect -->
  <div class="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
  
  <div class="relative z-10 flex items-center gap-4">
    <div bind:this={iconRef} class="icon-wrapper p-3 rounded-xl bg-linear-to-br from-cyan-400/20 to-blue-500/20 backdrop-blur-sm">
      {#if icon}
        {@const Icon = icon}
        <Icon class="text-cyan-300" size={28} />
      {/if}
    </div>
    
    <div class="flex-1">
      <div class="text-3xl font-bold text-white mb-1">
        {value}
      </div>
      <div class="text-cyan-200/70 text-sm font-medium">
        {label}
      </div>
    </div>
  </div>
  
  <!-- Animated border glow -->
  <div class="absolute inset-0 rounded-2xl bg-linear-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
</div>

<style>
  .stats-card {
    backface-visibility: hidden;
    perspective: 1000px;
  }
  
  .icon-wrapper {
    will-change: transform;
  }
</style>
