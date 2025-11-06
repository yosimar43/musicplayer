<script lang="ts">
  import { library, player, ui, loadDefaultLibrary, play, notify, loadPreferences } from '@/lib/state';
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { onMount } from 'svelte';

  onMount(() => {
    // Cargar preferencias guardadas
    loadPreferences();
  });

  async function handleLoadLibrary() {
    try {
      await loadDefaultLibrary();
      notify('✅ Biblioteca cargada correctamente');
    } catch (error) {
      notify('❌ Error cargando biblioteca');
    }
  }

  function handlePlayTrack(track: typeof library.tracks[0]) {
    play(track);
    notify(`▶️ Reproduciendo: ${track.title}`);
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="space-y-6">
  <!-- Header con estadísticas -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-white">Mi Biblioteca</h1>
      <p class="text-gray-400 mt-1">
        {library.totalTracks} canciones • {library.artists.length} artistas • {library.albums.length} álbumes
      </p>
    </div>
    <Button onclick={handleLoadLibrary} disabled={library.isLoading}>
      {library.isLoading ? 'Cargando...' : 'Cargar Biblioteca'}
    </Button>
  </div>

  <!-- Estado de carga -->
  {#if library.isLoading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
      <p class="text-gray-400 mt-4">Escaneando archivos de música...</p>
    </div>
  {/if}

  <!-- Error -->
  {#if library.error}
    <div class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
      {library.error}
    </div>
  {/if}

  <!-- Lista de canciones -->
  {#if !library.isLoading && library.tracks.length > 0}
    <div class="grid gap-2">
      {#each library.tracks as track, index}
        <Card.Root 
          class="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
          onclick={() => handlePlayTrack(track)}
        >
          <Card.Content class="p-4">
            <div class="flex items-center justify-between gap-4">
              <!-- Número e info -->
              <div class="flex items-center gap-4 flex-1 min-w-0">
                <span class="text-gray-500 text-sm w-8 text-right">
                  {#if player.current?.path === track.path && player.isPlaying}
                    <span class="text-green-500">▶</span>
                  {:else}
                    {index + 1}
                  {/if}
                </span>
                
                <div class="flex-1 min-w-0">
                  <h3 class="text-white font-medium truncate">
                    {track.title || 'Título desconocido'}
                  </h3>
                  <p class="text-gray-400 text-sm truncate">
                    {track.artist || 'Artista desconocido'}
                    {#if track.album}
                      • {track.album}
                    {/if}
                  </p>
                </div>
              </div>

              <!-- Metadata -->
              <div class="flex items-center gap-4 shrink-0">
                {#if track.genre}
                  <span class="text-xs text-gray-500 px-2 py-1 bg-white/5 rounded">
                    {track.genre}
                  </span>
                {/if}
                {#if track.year}
                  <span class="text-gray-500 text-sm">{track.year}</span>
                {/if}
                <span class="text-gray-400 text-sm font-mono w-12 text-right">
                  {formatDuration(track.duration)}
                </span>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if !library.isLoading}
    <div class="text-center py-12 text-gray-400">
      <p>No se encontraron canciones. Haz clic en "Cargar Biblioteca" para comenzar.</p>
    </div>
  {/if}

  <!-- Notificaciones -->
  {#if ui.notifications.length > 0}
    <div class="fixed top-4 right-4 space-y-2 z-50">
      {#each ui.notifications as notification}
        <div class="bg-black/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {notification}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
</style>