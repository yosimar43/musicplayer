<script lang="ts">
  import { library, ui, loadDefaultLibrary, notify, loadPreferences } from '@/lib/state';
  import { Button } from "$lib/components/ui/button";
  import TrackListItem from '@/components/TrackListItem.svelte';
  import { Music2, Disc3 } from 'lucide-svelte';
  import { onMount } from 'svelte';

  onMount(() => {
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
</script>

<div class="min-h-screen pb-32">
  <!-- Header con gradiente y glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-white/10 mb-6">
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Music2 size={28} class="text-white" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-white bg-clip-text">Mi Biblioteca</h1>
            <p class="text-gray-400 mt-1 flex items-center gap-2">
              <span class="flex items-center gap-1">
                <Disc3 size={14} />
                {library.totalTracks} canciones
              </span>
              <span class="text-gray-600">•</span>
              <span>{library.artists.length} artistas</span>
              <span class="text-gray-600">•</span>
              <span>{library.albums.length} álbumes</span>
            </p>
          </div>
        </div>
        <Button 
          onclick={handleLoadLibrary} 
          disabled={library.isLoading}
          class="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30"
        >
          {#if library.isLoading}
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Cargando...
            </div>
          {:else}
            Cargar Biblioteca
          {/if}
        </Button>
      </div>
    </div>
  </div>

  <div class="px-6 space-y-6">
    <!-- Estado de carga -->
    {#if library.isLoading}
      <div class="text-center py-20">
        <div class="inline-flex flex-col items-center gap-4">
          <div class="relative">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/30 border-t-purple-500"></div>
            <Music2 size={24} class="text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div class="space-y-2">
            <p class="text-white font-medium">Escaneando archivos de música...</p>
            <p class="text-gray-400 text-sm">Esto puede tomar unos momentos</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Error -->
    {#if library.error}
      <div class="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 backdrop-blur-sm">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {library.error}
        </div>
      </div>
    {/if}

    <!-- Lista de canciones -->
    {#if !library.isLoading && library.tracks.length > 0}
      <div class="space-y-1">
        {#each library.tracks as track, index (track.path)}
          <TrackListItem {track} {index} allTracks={library.tracks} />
        {/each}
      </div>
    {:else if !library.isLoading}
      <div class="text-center py-20">
        <div class="inline-flex flex-col items-center gap-4">
          <div class="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Music2 size={40} class="text-gray-600" />
          </div>
          <div class="space-y-2">
            <p class="text-gray-400 text-lg">No se encontraron canciones</p>
            <p class="text-gray-500 text-sm">Haz clic en "Cargar Biblioteca" para comenzar</p>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Notificaciones -->
  {#if ui.notifications.length > 0}
    <div class="fixed top-6 right-6 space-y-3 z-50">
      {#each ui.notifications as notification}
        <div class="notification-card bg-gray-900/95 backdrop-blur-xl text-white px-5 py-3 rounded-xl shadow-2xl border border-white/10 animate-slide-in">
          <div class="flex items-center gap-3">
            <div class="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
            <span class="font-medium">{notification}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(100%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .notification-card {
    box-shadow: 
      0 10px 25px -5px rgba(0, 0, 0, 0.5),
      0 0 30px rgba(168, 85, 247, 0.2);
  }
</style>