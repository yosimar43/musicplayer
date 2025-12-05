<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let { 
    glowLineRef = $bindable(), 
    glowSpotRef = $bindable(),
    isPlaying = false
  }: { 
    glowLineRef?: HTMLElement; 
    glowSpotRef?: HTMLElement;
    isPlaying?: boolean;
  } = $props();

  let glowLineElement = $state<HTMLElement>();
  let glowSpotElement = $state<HTMLElement>();
  let borderGlowRef = $state<HTMLElement>();
  
  let ctx: gsap.Context | null = null;
  let borderAnimation: gsap.core.Timeline | null = null;

  // Sincronizar referencias con props bindables
  $effect(() => {
    glowLineRef = glowLineElement;
    glowSpotRef = glowSpotElement;
  });

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {}, borderGlowRef);
    return () => {
      borderAnimation?.kill();
      ctx?.revert();
      ctx = null;
    };
  });

  // --- ANIMACIÓN DEL BORDE (cuando está reproduciendo) ---
  $effect(() => {
    if (!borderGlowRef || !ctx) return;

    // Detener animación previa
    borderAnimation?.kill();

    if (isPlaying) {
      console.log("🌈 Iniciando animación de brillo en borde");
      
      // Obtener el elemento rect dentro del SVG
      const rect = borderGlowRef.querySelector('rect');
      if (!rect) return;

      // Calcular el perímetro para animación continua
      const perimeter = (rect.getBBox().width + rect.getBBox().height) * 2;
      
      // Configurar dasharray para que el gradiente sea visible y se repita
      gsap.set(rect, {
        strokeDasharray: `${perimeter * 0.4} ${perimeter * 0.6}`,
        strokeDashoffset: 0
      });

      // Animar el offset para crear movimiento continuo y fluido
      borderAnimation = gsap.to(rect, {
        strokeDashoffset: -perimeter,
        duration: 5,
        ease: "none",
        repeat: -1
      });
    } else {
      // Fade out suave
      if (borderGlowRef) {
        gsap.to(borderGlowRef, {
          opacity: 0.3,
          duration: 0.6,
          ease: "power2.out"
        });
      }
    }
  });
</script>

<!-- Top Light Border (Reflection) -->
<div
  class="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent opacity-80"
></div>

<!-- Animated Border Glow - Brillo que se mueve por el borde -->
<svg 
  bind:this={borderGlowRef}
  class="absolute inset-0 pointer-events-none rounded-2xl overflow-visible"
  style="width: 100%; height: 100%; will-change: transform;"
>
  <defs>
    <linearGradient id="movingGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color: transparent; stop-opacity: 0" />
      <stop offset="20%" style="stop-color: rgb(34, 211, 238); stop-opacity: 0.8" />
      <stop offset="40%" style="stop-color: rgb(217, 119, 6); stop-opacity: 0.7" />
      <stop offset="60%" style="stop-color: rgb(217, 70, 239); stop-opacity: 0.8" />
      <stop offset="80%" style="stop-color: rgb(34, 211, 238); stop-opacity: 0.6" />
      <stop offset="100%" style="stop-color: transparent; stop-opacity: 0" />
    </linearGradient>
    
    <filter id="glowBlur">
      <feGaussianBlur stdDeviation="3" />
    </filter>
  </defs>
  
  <!-- Rectángulo del borde con gradiente animado -->
  <rect 
    x="0" 
    y="0" 
    width="100%" 
    height="100%" 
    rx="16"
    fill="none"
    stroke="url(#movingGlow)"
    stroke-width="3"
    filter="url(#glowBlur)"
    opacity="0.9"
  />
</svg>

<!-- Glow Line & Spot (Consolidated) -->
<div
  bind:this={glowLineElement}
  class="absolute top-px left-0 right-0 h-px blur-px pointer-events-none"
  style="background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.6), rgba(217, 119, 6, 0.4), rgba(217, 70, 239, 0.5), rgba(147, 51, 234, 0.4), transparent); opacity: 0.6;"
></div>

<div
  bind:this={glowSpotElement}
  class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 blur-[60px] pointer-events-none rounded-full"
  style="background: linear-gradient(to bottom, rgba(34, 211, 238, 0.15), rgba(217, 119, 6, 0.08), rgba(217, 70, 239, 0.1), rgba(147, 51, 234, 0.1)); opacity: 0.4;"
></div>
