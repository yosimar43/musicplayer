<script lang="ts">
  import { Music } from "lucide-svelte";
  import { gsap } from "gsap";

  let { isLoadingLibrary, handleLogoClick, tracksLength } = $props();

  let logoRef: HTMLElement;

  // Reactor Idle Animation (Logo)
  // Core breathing
  gsap.to(".reactor-core", {
    scale: 1.05,
    boxShadow: "0 0 25px rgba(34, 211, 238, 0.6)",
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  // Ring rotation
  gsap.to(".reactor-ring", {
    rotation: 360,
    duration: 12,
    repeat: -1,
    ease: "none",
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
      class="reactor-ring absolute inset-0 border-2 border-cyan-400/40 rounded-full border-t-cyan-300"
    ></div>

    <!-- Reactor Core -->
    <div
      class="reactor-core relative w-7 h-7 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-full
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
    <h1
      class="text-lg font-bold text-white tracking-tight leading-none drop-shadow-sm"
    >
      Music Player
    </h1>
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