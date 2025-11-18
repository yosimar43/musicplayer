<script lang="ts">
  import { onMount } from 'svelte';

  let container: HTMLElement;
  let textElement: HTMLElement;

  onMount(() => {
    // Animaciones eliminadas - usando solo CSS transitions si es necesario
  });
</script>

<div
  bind:this={container}
  class="backdrop-blur-2xl bg-white/5 border border-white/30 shadow-2xl shadow-cyan-500/40 p-8 text-white rounded-2xl"
>
  <p bind:this={textElement} class="animated-text text-lg font-semibold">
    Bienvenido a tu Music Player
  </p>
  <slot />
</div>