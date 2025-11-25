<script lang="ts">
  import { MusicCard3D } from "$lib/components/tracks";
  import { libraryStore } from "$lib/stores/library.store.svelte";

  // Usar datos reales de la biblioteca
  const tracks = $derived(libraryStore.tracks.slice(0, 5)); // Mostrar primeras 5 tracks
  const hasNoTracks = $derived(tracks.length === 0);
</script>

<div class="demo-container">
  <div class="demo-header">
    <h1>3D Music Card Demo</h1>
    <p>Hover over the cards to see the 3D effects and animations</p>
  </div>

  {#if hasNoTracks}
    <div class="empty-state">
      <p>No hay tracks cargados. Carga tu biblioteca de música primero.</p>
    </div>
  {:else}
    <div class="cards-grid">
      {#each tracks as track (track.path)}
        <MusicCard3D {track} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .demo-container {
    min-height: 100vh;
    padding: 40px 20px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  }

  .demo-header {
    text-align: center;
    margin-bottom: 60px;
    color: white;
  }

  .demo-header h1 {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .demo-header p {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 30px;
    max-width: 1400px;
    margin: 0 auto;
    justify-items: center;
  }

  .empty-state {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 60px 20px;
    font-size: 1.125rem;
  }

  @media (max-width: 600px) {
    .demo-header h1 {
      font-size: 2rem;
    }

    .demo-header p {
      font-size: 1rem;
    }

    .cards-grid {
      grid-template-columns: 1fr;
      gap: 30px;
    }
  }
</style>
