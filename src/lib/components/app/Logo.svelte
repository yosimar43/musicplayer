<script lang="ts">
  import { Music } from "lucide-svelte";
  import { gsap } from "gsap";
  import { onMount } from "svelte";
  import ShinyText from "@/lib/components/ui/ShinyText.svelte";

  let { isLoadingLibrary, handleLogoClick, tracksLength } = $props();

  let logoRef: HTMLElement;
  let reactorCoreRef: HTMLDivElement;
  let reactorRingRef: HTMLDivElement;
  
  // ✅ GSAP Context para cleanup automático
  let ctx: gsap.Context | null = null;
  let coreTimeline: gsap.core.Tween | null = null;
  let ringTimeline: gsap.core.Tween | null = null;
  let loadingTimeline: gsap.core.Timeline | null = null;
  let isInitialized = $state(false);

  // Efecto para animación de loading
  $effect(() => {
    if (!reactorCoreRef || !reactorRingRef || !isInitialized) return;
    
    if (isLoadingLibrary) {
      // Pausar animaciones idle
      coreTimeline?.pause();
      ringTimeline?.pause();
      
      // Matar loading timeline anterior si existe
      loadingTimeline?.kill();
      
      // Iniciar animación de carga
      loadingTimeline = gsap.timeline({ defaults: { overwrite: true } });
      loadingTimeline
        .to(reactorCoreRef, {
          scale: 1.5,
          boxShadow: "0 0 40px rgba(34, 211, 238, 0.9)",
          duration: 0.5,
          yoyo: true,
          repeat: -1,
          ease: "power2.inOut",
        }, 0)
        .to(reactorRingRef, {
          rotation: "+=360",
          duration: 1,
          repeat: -1,
          ease: "none",
        }, 0);
    } else {
      // Detener animación de carga
      loadingTimeline?.kill();
      loadingTimeline = null;
      
      // Restaurar estado y reanudar idle
      if (reactorCoreRef) {
        gsap.to(reactorCoreRef, {
          scale: 1,
          boxShadow: "0 0 15px rgba(34, 211, 238, 0.6)",
          duration: 0.3,
          overwrite: true
        });
      }
      
      // Reanudar animaciones idle
      coreTimeline?.resume();
      ringTimeline?.resume();
    }
  });

  onMount(() => {
    if (!reactorCoreRef || !reactorRingRef) return;
    
    // ✅ Crear contexto GSAP
    ctx = gsap.context(() => {
      // Inicializar propiedades
      gsap.set(reactorCoreRef, { scale: 1 });
      gsap.set(reactorRingRef, { rotation: 0 });
      
      // Core breathing animation
      coreTimeline = gsap.to(reactorCoreRef, {
        scale: 1.05,
        boxShadow: "0 0 25px rgba(34, 211, 238, 0.6)",
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Ring rotation animation
      ringTimeline = gsap.to(reactorRingRef, {
        rotation: 360,
        duration: 12,
        repeat: -1,
        ease: "none",
      });
      
      isInitialized = true;
    }, logoRef);
    
    // ✅ Cleanup completo
    return () => {
      coreTimeline?.kill();
      ringTimeline?.kill();
      loadingTimeline?.kill();
      coreTimeline = null;
      ringTimeline = null;
      loadingTimeline = null;
      ctx?.revert();
      ctx = null;
      isInitialized = false;
    };
  });
</script>

<!-- LEFT: LOGO & BRAND -->
<div bind:this={logoRef} class="flex items-center gap-4">
  <button
    onclick={handleLogoClick}
    disabled={isLoadingLibrary}
    class="group/logo relative w-12 h-12 flex items-center justify-center focus:outline-none"
    aria-label="Cargar biblioteca"
  >
    <!-- Reactor Ring -->
    <div
      bind:this={reactorRingRef}
      class="absolute inset-0 border-2 border-cyan-400/40 rounded-full border-t-cyan-300"
    ></div>

    <!-- Reactor Core -->
    <div
      bind:this={reactorCoreRef}
      class="relative w-7 h-7 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-full
                shadow-[0_0_15px_rgba(34,211,238,0.6)] flex items-center justify-center z-10
                group-hover/logo:scale-110 transition-transform duration-300"
    >
      {#if isLoadingLibrary}
        <div
          class="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"
        ></div>
      {:else}
        <Music class="w-3.5 h-3.5 text-white drop-shadow-md" />
      {/if}
    </div>

    <!-- Hover Glow -->
    <div
      class="absolute inset-0 bg-cyan-400/30 rounded-full blur-md opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500"
    ></div>
  </button>

  <div class="flex flex-col">
    <div class="mb-0.5">
      <ShinyText text="Music Player" />
    </div>
    {#if tracksLength > 0}
      <span
        class="text-[10px] font-medium text-cyan-300/90 uppercase tracking-widest"
      >
        {tracksLength} Tracks
      </span>
    {/if}
  </div>
</div>

<style>
  /* Quicksand ya está aplicada globalmente */
</style>