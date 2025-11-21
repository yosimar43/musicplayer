<script lang="ts">
  import { Menu, X } from "lucide-svelte";

  let { isMobileMenuOpen, toggleMobileMenu, menuButtonRef = $bindable() } = $props();
</script>

<!-- MOBILE TOGGLE -->
<div class="md:hidden" bind:this={menuButtonRef}>
  <button
    onclick={toggleMobileMenu}
    class="p-2 text-slate-200 hover:text-white transition-colors relative"
  >
    {#if isMobileMenuOpen}
      <X class="w-6 h-6 animate-in fade-in zoom-in duration-200" />
    {:else}
      <Menu class="w-6 h-6 animate-in fade-in zoom-in duration-200" />
    {/if}
  </button>
</div>