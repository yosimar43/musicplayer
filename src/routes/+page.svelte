<script lang="ts">
  import { MusicCard3D } from "$lib/components/tracks";
  import { libraryStore } from "$lib/stores/library.store.svelte";

  // Usar datos reales de la biblioteca
  const tracks = $derived(libraryStore.tracks.slice(0, 5)); // Mostrar primeras 5 tracks
  const hasNoTracks = $derived(tracks.length === 0);
</script>

<div class="page-container">
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
  /* Contenedor centrado que respeta el layout padre */
  .page-container {
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-top: 48px;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 25px;
    padding: 15px;
    justify-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  .empty-state {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 60px 20px;
    font-size: 1.125rem;
  }

  @media (max-width: 600px) {
    .cards-grid {
      grid-template-columns: 1fr;
      gap: 15px;
      padding: 10px;
    }
  }
</style>
