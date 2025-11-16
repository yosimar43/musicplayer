<script>
  let { children } = $props();
  import "../styles/app.css";
  import MusicPlayerApp from "@/components/musicplayerapp.svelte";
  import Navbar from "@/components/Navbar.svelte";
  import { player } from '@/lib/state';

  // Mostrar reproductor solo si hay una canción
  let hasTrack = $derived(!!player.current);
  

</script>

<div class="bg-linear-to-b flex min-h-screen flex-col from-sky-950 via-sky-900 to-sky-950">
  <!-- Fixed Navbar at Top -->
  <div class="fixed left-0 right-0 top-0 z-50 border-b border-sky-800/50 bg-sky-950/95 backdrop-blur-md">
    <Navbar />
  </div>
  
  <main class="relative z-10 flex-1 pb-32 pt-16">
    {@render children()}
  </main>
  
  <!-- Fixed Music Player at Bottom - Solo si hay canción -->
  {#if hasTrack}
    <div class="player-container pointer-events-none fixed bottom-0 left-0 right-0 z-50 p-4">
      <div class="pointer-events-auto">
        <MusicPlayerApp />
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .player-container {
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
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