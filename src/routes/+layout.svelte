<script>
  let { children } = $props();
  import "../styles/app.css";
  import MusicPlayerApp from "@/components/musicplayerapp.svelte";
  import Navbar from "@/components/Navbar.svelte";
  import { player } from '@/lib/state';

  // Mostrar reproductor solo si hay una canción
  let hasTrack = $derived(!!player.current);
</script>

<div class="min-h-screen bg-gradient-to-b from-sky-950 via-sky-900 to-sky-950 flex flex-col">
  <Navbar />
  
  <main class="container mx-auto p-4 flex-1 pb-32">
    {@render children()}
  </main>
  
  <!-- Fixed Music Player at Bottom - Solo si hay canción -->
  {#if hasTrack}
    <div class="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none player-container">
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