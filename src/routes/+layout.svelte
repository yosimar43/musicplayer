<script>
  let { children } = $props();
  import "../styles/app.css";
  import MusicPlayerApp from "@/components/musicplayerapp.svelte";
  import Navbar from "@/components/Navbar.svelte";
  import { player } from '@/lib/state';

  // Mostrar reproductor solo si hay una canción
  let hasTrack = $derived(!!player.current);
  

</script>

<div class="flex flex-col min-h-screen bg-linear-to-b from-sky-950 via-sky-900 to-sky-950">
  <!-- Fixed Navbar at Top -->
  <div class="fixed top-0 left-0 right-0 z-50 border-b border-sky-800/50 bg-sky-950/95 backdrop-blur-md">
    <Navbar />
  </div>
  
  <main class="relative z-10 flex-1 pt-16 pb-32">
    {@render children()}
  </main>
  

</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>