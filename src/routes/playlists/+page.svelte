<script lang="ts">
  import ShinyText from '@/lib/components/ui/ShinyText.svelte';
  import { useSpotifyTracks, type SpotifyTrackWithDownload } from '@/lib/hooks';
  import { spotifyAuthStore } from '@/lib/stores';
  import TrackItem from '@/lib/components/tracks/TrackItem.svelte';
  import VirtualizedSpotifyTracks from '@/lib/components/tracks/VirtualizedSpotifyTracks.svelte';
  import { onMount } from 'svelte';
  import { useSpotifyAuth } from '@/lib/hooks';

  // 🎵 Hook de Spotify tracks
  const spotifyTracks = useSpotifyTracks();
  const auth = useSpotifyAuth();

  // 🔍 Estado de búsqueda
  let searchQuery = $state('');
  let debouncedSearchQuery = $state('');

  // 🎯 Estado de carga inicial
  let isInitialLoad = $state(true);

  // 🔍 Debounce para búsqueda (300ms)
  let searchTimeout = $state<number | null>(null);
  $effect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(() => {
      debouncedSearchQuery = searchQuery;
    }, 300);
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }
    };
  });

  // 🧹 Cleanup al desmontar
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  });

  onMount(async () => {
    // Solo cargar tracks si ya está autenticado
    if (spotifyAuthStore.isAuthenticated) {
      try {
        await spotifyTracks.loadTracks();
      } catch (err) {
        console.error('❌ Error cargando tracks iniciales:', err);
      }
    }
    isInitialLoad = false;
  });

  // 🔄 Cargar tracks automáticamente cuando el usuario se autentica
  $effect(() => {
    if (isAuthenticated && !isInitialLoad && spotifyTracks.allTracks?.length === 0) {
      console.log('🎵 Usuario autenticado, cargando tracks...');
      spotifyTracks.loadTracks().catch(err => {
        console.error('❌ Error cargando tracks después de autenticación:', err);
      });
    }
  });

  // 📊 Estadísticas
  const totalTracks = $derived(spotifyTracks.allTracks?.length ?? 0);
  const downloadedTracks = $derived(spotifyTracks.allTracks?.filter(t => t.downloadState === 'completed').length ?? 0);
  const downloadingTracks = $derived(spotifyTracks.allTracks?.filter(t => t.downloadState === 'downloading').length ?? 0);

  // 🎵 Tracks filtrados por búsqueda (con debounce y optimización)
  let filteredTracks: SpotifyTrackWithDownload[] = $state([]);
  
  $effect(() => {
    if (!debouncedSearchQuery) {
      filteredTracks = spotifyTracks.allTracks || [];
      return;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    const tracks = spotifyTracks.allTracks || [];
    const filtered = tracks.filter(track => {
      // Búsqueda optimizada usando indexOf en lugar de includes
      const nameMatch = track.name.toLowerCase().indexOf(query) !== -1;
      const artistMatch = track.artists.some(artist => 
        artist.toLowerCase().indexOf(query) !== -1
      );
      return nameMatch || artistMatch;
    });
    
    // Limitar resultados para mejor rendimiento (máximo 200)
    filteredTracks = filtered.slice(0, 200);
  });

  // 🎯 Estado de autenticación
  const isAuthenticated = $derived(spotifyAuthStore.isAuthenticated);
  const userProfile = $derived(spotifyAuthStore.profile);

  // 🎵 Función para manejar descarga individual
  async function handleDownloadTrack(trackId: string) {
    try {
      await spotifyTracks.downloadTrack(trackId);
    } catch (err) {
      console.error('❌ Error descargando track:', err);
    }
  }

  // 🎵 Función para descargar todas las tracks
  async function handleDownloadAll() {
    try {
      await spotifyTracks.downloadAllTracks();
    } catch (err) {
      console.error('❌ Error descargando todas las tracks:', err);
    }
  }

  // 🔄 Función para recargar tracks
  async function handleReload() {
    try {
      await spotifyTracks.loadTracks(true); // forceReload = true
    } catch (err) {
      console.error('❌ Error recargando tracks:', err);
    }
  }

  // 🔐 Función para autenticar con Spotify
  async function handleSpotifyAuth() {
    try {
      await auth.authenticate();
    } catch (err) {
      console.error('❌ Error en autenticación:', err);
    }
  }
</script>

<div class="page-container">
  <!-- 🎵 Header con título y acciones -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <ShinyText text="🎵 Spotify Playlists{userProfile ? ` de ${userProfile.displayName}` : ''}" />
        {#if isAuthenticated}
        <div class="stats-inline">
          <span class="stat-item">
            <span class="stat-number">{totalTracks}</span>
            <span class="stat-label">Canciones</span>
          </span>
          <span class="stat-separator">•</span>
          <span class="stat-item">
            <span class="stat-number">{downloadedTracks}</span>
            <span class="stat-label">Descargadas</span>
          </span>
          <span class="stat-separator">•</span>
          <span class="stat-item">
            <span class="stat-number">{downloadingTracks}</span>
            <span class="stat-label">Descargando</span>
          </span>
        </div>
      {/if}
    </div>
      </div>
     
  <div class="header-actions">
      {#if !isAuthenticated}
        <!-- Botón de autenticación prominente -->
        <button
          class="spotify-auth-button-header"
          onclick={handleSpotifyAuth}
          disabled={spotifyAuthStore.isLoading}
        >
          {#if spotifyAuthStore.isLoading}
            <div class="loading-spinner"></div>
            Conectando...
          {:else}
            <svg class="spotify-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.09 11.64-.84 16.2 1.381.48.18.78.84.6 1.44-.18.42-.84.78-1.44.42z"/>
            </svg>
            Iniciar sesión
          {/if}
        </button>
      {:else}
        <!-- Acciones cuando está autenticado -->
        <button
          class="action-btn reload-btn"
          onclick={handleReload}
          disabled={spotifyTracks.isLoading}
        >
          {#if spotifyTracks.isLoading}
            <span class="loading-spinner">⟳</span>
          {:else}
            🔄
          {/if}
          Recargar
        </button>

        <button
          class="action-btn download-all-btn"
          onclick={handleDownloadAll}
          disabled={spotifyTracks.isLoading || totalTracks === 0}
        >
          ⬇️ Descargar Todo
        </button>
      {/if}
    </div>
  
  </div>

  <!-- 🎵 Lista de tracks -->
  {#if !isAuthenticated}
    <!-- Estado no autenticado - Mensaje simple -->
    <div class="auth-placeholder">
      <p>Inicia sesión con Spotify para ver tus playlists y canciones favoritas.</p>
    </div>
  {:else if isInitialLoad && spotifyTracks.isLoading}
    <!-- Estado de carga inicial -->
    <div class="loading-state">
      <div class="loading-spinner-large">⟳</div>
      <p>Cargando tus canciones de Spotify...</p>
    </div>
  {:else if totalTracks === 0 && !spotifyTracks.isLoading}
    <!-- Estado vacío -->
    <div class="empty-state">
      <div class="empty-icon">🎵</div>
      <ShinyText text="No hay canciones guardadas" subtext={true} />
      <p>Guarda algunas canciones en Spotify para verlas aquí.</p>
      <button class="reload-btn" onclick={handleReload}>
        🔄 Intentar de nuevo
      </button>
    </div>
  {:else}
    <!-- Barra de búsqueda cuando hay tracks -->
    {#if totalTracks > 0}
      <div class="search-container">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Buscar canciones o artistas..."
          class="search-input"
        />
        {#if searchQuery}
          <span class="search-results">
            {#if searchQuery !== debouncedSearchQuery}
              <span class="search-loading">Buscando...</span>
            {:else}
              {#if filteredTracks.length >= 200}
                Más de 200 resultados encontrados
              {:else}
                {filteredTracks.length} de {totalTracks} canciones
              {/if}
            {/if}
          </span>
        {/if}
      </div>
    {/if}

    <!-- Barra de progreso de carga -->
    {#if spotifyTracks.isLoading && spotifyTracks.loadingProgress > 0}
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {spotifyTracks.loadingProgress}%"
          ></div>
        </div>
        <span class="progress-text">
          Cargando canciones... {spotifyTracks.loadingProgress}%
          ({spotifyTracks.totalTracks > 0 ? `${spotifyTracks.totalTracks} total` : ''})
        </span>
      </div>
    {/if}

    <!-- Lista de tracks virtualizada -->
    <div class="tracks-container">
      <VirtualizedSpotifyTracks
        tracks={filteredTracks}
        itemHeight={110}
        containerHeight={600}
        onDownload={handleDownloadTrack}
      />
    </div>
  {/if}
</div>

<style>
  .page-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex: 1;
    min-width: 0;
    justify-content: space-between;
  }

  .stats-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-number {
    font-weight: bold;
    color: var(--primary-color);
  }

  .stat-label {
    color: var(--text-muted);
  }

  .stat-separator {
    color: var(--text-muted);
    margin: 0 0.25rem;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .spotify-auth-button-header {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, #1DB954, #1aa34a);
    color: white;
    border: none;
    border-radius: 16px;
    padding: 12px 20px;
    font-size: 0.95rem;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(29, 185, 84, 0.3);
    position: relative;
    overflow: hidden;
  }

  .spotify-auth-button-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s;
  }

  .spotify-auth-button-header:hover:not(:disabled)::before {
    left: 100%;
  }

  .spotify-auth-button-header:hover:not(:disabled) {
    background: linear-gradient(135deg, #1aa34a, #1DB954);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 24px rgba(29, 185, 84, 0.4);
  }

  .spotify-auth-button-header:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(29, 185, 84, 0.2);
  }

  .spotify-auth-button-header:disabled::before {
    display: none;
  }

  .spotify-auth-button-header .spotify-logo {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .action-btn {
    padding: 0.875rem 1.75rem;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .action-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .action-btn:hover::before {
    left: 100%;
  }

  .reload-btn {
    background: var(--background-secondary);
    color: var(--text-color);
    border: 2px solid var(--border-color);
  }

  .reload-btn:hover:not(:disabled) {
    background: var(--background-hover);
    border-color: var(--primary-color);
    color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 123, 255, 0.2);
  }

  .download-all-btn {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
    color: white;
    border: 2px solid var(--primary-color);
  }

  .download-all-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-hover), var(--primary-color));
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .action-btn:disabled::before {
    display: none;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
  }

  .search-container {
    margin-bottom: 2.5rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: var(--background-secondary);
    padding: 1.25rem 1.5rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .search-input {
    flex: 1;
    padding: 0.875rem 1.25rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    background: var(--background-primary);
    color: var(--text-color);
    font-size: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    transform: scale(1.02);
  }

  .search-results {
    font-size: 0.95rem;
    color: var(--text-muted);
    font-weight: 500;
    padding: 0.5rem 1rem;
    background: var(--background-tertiary);
    border-radius: 20px;
    border: 1px solid var(--border-color);
  }

  .search-loading {
    color: var(--primary-color);
    font-style: italic;
  }

  .progress-container {
    margin-bottom: 2.5rem;
    background: var(--background-secondary);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .progress-bar {
    width: 100%;
    height: 10px;
    background: var(--background-tertiary);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 1rem;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 5px;
    position: relative;
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }

  .progress-text {
    font-size: 1rem;
    color: var(--text-color);
    font-weight: 500;
    text-align: center;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }



  .auth-placeholder {
    text-align: center;
    padding: 4rem 3rem;
    color: var(--text-muted);
    background: linear-gradient(135deg, var(--background-secondary), var(--background-tertiary));
    border-radius: 16px;
    border: 1px solid var(--border-color);
    max-width: 500px;
    margin: 3rem auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .auth-placeholder p {
    font-size: 1.2rem;
    margin: 0;
    font-weight: 500;
  }

  .loading-state,
  .empty-state {
    text-align: center;
    padding: 5rem 3rem;
    color: var(--text-muted);
    background: var(--background-secondary);
    border-radius: 16px;
    border: 1px solid var(--border-color);
    max-width: 500px;
    margin: 3rem auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .loading-spinner-large {
    font-size: 4rem;
    animation: spin 1s linear infinite;
    margin-bottom: 1.5rem;
    color: var(--primary-color);
  }

  .empty-icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    opacity: 0.7;
  }

  .empty-state p {
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }

  .empty-state .reload-btn {
    padding: 0.875rem 2rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .empty-state .reload-btn:hover {
    background: var(--primary-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  }

  .tracks-container {
    margin-top: 1rem;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 1.5rem 1rem;
    }

    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .header-main {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.5rem;
      justify-content: flex-start;
    }

    .header-actions {
      justify-content: center;
      width: 100%;
      gap: 1rem;
    }

    .stats-inline {
      font-size: 0.8rem;
      gap: 0.75rem;
    }

    .action-btn {
      padding: 0.75rem 1.25rem;
      font-size: 0.85rem;
    }

    .spotify-auth-button-header {
      padding: 10px 16px;
      font-size: 0.85rem;
    }

    .search-container {
      margin-bottom: 2rem;
      padding: 1rem;
      gap: 1rem;
    }

    .search-input {
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
    }

    .progress-container {
      margin-bottom: 2rem;
      padding: 1.25rem;
    }

    .auth-placeholder,
    .loading-state,
    .empty-state {
      padding: 3rem 2rem;
      margin: 2rem auto;
    }

    .auth-placeholder p {
      font-size: 1.1rem;
    }

    .loading-spinner-large {
      font-size: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
    }
  }
</style>