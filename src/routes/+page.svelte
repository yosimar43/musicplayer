<script lang="ts">
  import { MusicCard3D } from "$lib/components/tracks";
  import { libraryStore } from "$lib/stores/library.store.svelte";

  // Estados de la biblioteca
  const tracks = $derived(libraryStore.tracks.slice(0, 15));
  const isLoading = $derived(libraryStore.isLoading);
  const isScanning = $derived(libraryStore.isScanning);
  const scanProgress = $derived(libraryStore.scanProgress);
  const scanPercentage = $derived(libraryStore.scanPercentage);
  const hasNoTracks = $derived(tracks.length === 0 && !isLoading && !isScanning);
  const totalTracks = $derived(libraryStore.totalTracks);
</script>

<div class="page-container">
  {#if isLoading || isScanning}
    <!-- Estado de carga -->
    <div class="loading-state">
      <div class="loader-container">
        <!-- Círculos animados -->
        <div class="loader-circles">
          <div class="loader-circle circle-1"></div>
          <div class="loader-circle circle-2"></div>
          <div class="loader-circle circle-3"></div>
        </div>
        
        <!-- Icono de música -->
        <div class="loader-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      </div>
      
      <div class="loading-text">
        {#if isScanning}
          <p class="loading-title">Escaneando biblioteca...</p>
          <p class="loading-subtitle">{scanProgress.current} de {scanProgress.total} archivos</p>
          
          <!-- Barra de progreso -->
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: {scanPercentage}%"></div>
          </div>
          <p class="progress-percentage">{scanPercentage}%</p>
          
          {#if scanProgress.currentFile}
            <p class="current-file">{scanProgress.currentFile.split(/[/\\]/).pop()}</p>
          {/if}
        {:else}
          <p class="loading-title">Cargando canciones...</p>
          <p class="loading-subtitle">Preparando tu biblioteca musical</p>
        {/if}
      </div>
    </div>
  {:else if hasNoTracks}
    <!-- Estado vacío -->
    <div class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <p class="empty-title">No hay canciones</p>
      <p class="empty-subtitle">Carga tu biblioteca de música desde el menú</p>
    </div>
  {:else}
    <!-- Grid de canciones -->
    <div class="tracks-header">
      <h2 class="tracks-title">Tu Biblioteca</h2>
      <span class="tracks-count">{totalTracks} canciones</span>
    </div>
    
    <div class="cards-grid">
      {#each tracks as track (track.path)}
        <MusicCard3D {track} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .page-container {
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-top: 48px;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ESTADO DE CARGA
     ═══════════════════════════════════════════════════════════════════════════ */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 30px;
    padding: 40px 20px;
  }

  .loader-container {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loader-circles {
    position: absolute;
    inset: 0;
  }

  .loader-circle {
    position: absolute;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: rgba(56, 189, 248, 0.8);
    animation: spin 1.5s linear infinite;
  }

  .circle-1 {
    inset: 0;
    border-top-color: rgba(56, 189, 248, 0.9);
    animation-duration: 1.5s;
  }

  .circle-2 {
    inset: 12px;
    border-top-color: rgba(139, 92, 246, 0.8);
    animation-duration: 2s;
    animation-direction: reverse;
  }

  .circle-3 {
    inset: 24px;
    border-top-color: rgba(236, 72, 153, 0.7);
    animation-duration: 2.5s;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loader-icon {
    width: 40px;
    height: 40px;
    color: rgba(255, 255, 255, 0.9);
    animation: pulse-icon 2s ease-in-out infinite;
  }

  .loader-icon svg {
    width: 100%;
    height: 100%;
  }

  @keyframes pulse-icon {
    0%, 100% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  .loading-text {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .loading-title {
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .loading-subtitle {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin: 0;
  }

  .progress-bar-container {
    width: 200px;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 8px;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .progress-percentage {
    color: rgba(56, 189, 248, 0.9);
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0;
  }

  .current-file {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
    margin: 0;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ESTADO VACÍO
     ═══════════════════════════════════════════════════════════════════════════ */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 10px;
  }

  .empty-icon svg {
    width: 100%;
    height: 100%;
  }

  .empty-title {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .empty-subtitle {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1rem;
    margin: 0;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     HEADER DE TRACKS
     ═══════════════════════════════════════════════════════════════════════════ */
  .tracks-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 15px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 1200px;
  }

  .tracks-title {
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .tracks-count {
    color: rgba(56, 189, 248, 0.8);
    font-size: 0.9rem;
    font-weight: 500;
    background: rgba(56, 189, 248, 0.1);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(56, 189, 248, 0.2);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     GRID DE CARDS
     ═══════════════════════════════════════════════════════════════════════════ */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 25px;
    padding: 15px;
    justify-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 600px) {
    .cards-grid {
      grid-template-columns: 1fr;
      gap: 15px;
      padding: 10px;
    }

    .tracks-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .tracks-title {
      font-size: 1.25rem;
    }
  }
</style>
