<script lang="ts">
  let { 
    glowLineRef = $bindable(), 
    glowSpotRef = $bindable() 
  }: { 
    glowLineRef?: HTMLElement; 
    glowSpotRef?: HTMLElement; 
  } = $props();

  let glowLineElement = $state<HTMLElement>();
  let glowSpotElement = $state<HTMLElement>();

  // Sincronizar referencias con props bindables
  $effect(() => {
    glowLineRef = glowLineElement;
    glowSpotRef = glowSpotElement;
  });
</script>

<!-- Top Light Border (Reflection) -->
<div
  class="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent opacity-80"
></div>

<!-- Glow Line & Spot (Consolidated) -->
<div
  bind:this={glowLineElement}
  class="absolute top-px left-0 right-0 h-px blur-px pointer-events-none"
  style="background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.6), rgba(147, 51, 234, 0.4), transparent); opacity: 0.6;"
></div>

<div
  bind:this={glowSpotElement}
  class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 blur-[60px] pointer-events-none rounded-full"
  style="background: linear-gradient(to bottom, rgba(34, 211, 238, 0.15), rgba(147, 51, 234, 0.1)); opacity: 0.4;"
></div>
