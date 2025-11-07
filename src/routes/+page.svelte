<script lang="ts">
  import { library, ui, loadDefaultLibrary, notify, loadPreferences } from '@/lib/state';
  import { Button } from "$lib/components/ui/button";
  import TrackListItem from '@/components/TrackListItem.svelte';
  import { Music2, Disc3, Play, Pause } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { player } from '@/lib/state';

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

<div class="min-h-screen pb-32 bg-gradient-to-b from-sky-950 via-sky-900 to-sky-950">
  <!-- Floating blur orbs for depth -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden">
    <div class="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style="animation-delay: 1.5s;"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[150px]"></div>
  </div>

  <!-- Header con glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-2xl bg-sky-950/60 border-b border-sky-700/30 mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
    <div class="px-6 py-8">
      <div class="flex items-center justify-between gap-8">
        <div class="flex items-center gap-4 group">
          <!-- Icono principal con glow -->
          <div class="relative">
            <div class="absolute inset-0 g-linear-to-br from-cyan-400 to-blue-500 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-20 h-20 rounded-3xl bg-g-linear-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-xl shadow-cyan-500/40 transform group-hover:scale-105 transition-transform">
              <Music2 size={40} class="text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          <div>
            <h1 class="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300">
              Mi Biblioteca
            </h1>
            <div class="flex items-center gap-3 text-base">
              <span class="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/30 backdrop-blur-sm">
                <Disc3 size={16} class="text-cyan-400" />
                <span class="font-semibold text-cyan-300">{library.totalTracks}</span>
                <span class="text-sky-200">canciones</span>
              </span>
              <span class="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm text-blue-200 font-medium">
                {library.artists.length} artistas
              </span>
              <span class="flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/20 border border-sky-400/30 backdrop-blur-sm text-sky-200 font-medium">
                {library.albums.length} álbumes
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onclick={handleLoadLibrary} 
          disabled={library.isLoading}
          class="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/40 hover:shadow-cyan-500/60 transition-all duration-300 border-0 px-6 py-4 h-auto text-base font-semibold rounded-xl hover:scale-105"
        >
          {#if library.isLoading}
            <div class="flex items-center gap-3">
              <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Cargando...</span>
            </div>
          {:else}
            <div class="flex items-center gap-2">
              <Play size={20} />
              <span>Cargar Biblioteca</span>
            </div>
          {/if}
        </Button>
      </div>
    </div>
  </div>

  <div class="px-8 space-y-6 relative z-10">
    <!-- Estado de carga -->
    {#if library.isLoading}
      <div class="text-center py-32">
        <div class="inline-flex flex-col items-center gap-6">
          <div class="relative">
            <!-- Glow effect -->
            <div class="absolute inset-0 bg-cyan-500/40 rounded-full blur-3xl animate-pulse"></div>
            <!-- Spinner -->
            <div class="relative animate-spin rounded-full h-24 w-24 border-4 border-sky-700/40 border-t-cyan-400 shadow-lg shadow-cyan-500/20"></div>
            <!-- Icon -->
            <div class="absolute inset-0 flex items-center justify-center">
              <Music2 size={40} class="text-cyan-300" />
            </div>
          </div>
          <div class="space-y-3">
            <p class="text-sky-50 font-bold text-2xl">Escaneando archivos de música...</p>
            <p class="text-sky-300 text-lg">Esto puede tomar unos momentos</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Error -->
    {#if library.error}
      <div class="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-red-300 shadow-[0_8px_32px_rgba(220,38,38,0.2)]">
        <div class="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span class="font-semibold text-lg">{library.error}</span>
        </div>
      </div>
    {/if}

    <!-- Lista de canciones -->
    {#if !library.isLoading && library.tracks.length > 0}
      <div class="space-y-3">
        {#each library.tracks as track, index (track.path)}
          <TrackListItem {track} {index} allTracks={library.tracks} />
        {/each}
      </div>
    {:else if !library.isLoading}
      <div class="text-center py-32">
        <div class="inline-flex flex-col items-center gap-6">
          <div class="relative">
            <div class="absolute inset-0 bg-cyan-500/30 rounded-full blur-3xl"></div>
            <div class="relative w-40 h-40 rounded-full bg-sky-900/50 backdrop-blur-xl border border-cyan-400/30 flex items-center justify-center shadow-[0_8px_32px_rgba(6,182,212,0.2)]">
              <Music2 size={64} class="text-cyan-400/70" />
            </div>
          </div>
          <div class="space-y-3">
            <p class="text-sky-50 text-2xl font-bold">No se encontraron canciones</p>
            <p class="text-sky-300 text-lg">Haz clic en "Cargar Biblioteca" para comenzar</p>
          </div>
        </div>
      </div>
    {/if}
  <!-- Notificaciones -->
  {#if ui.notifications.length > 0}
    <div class="fixed top-6 right-6 space-y-3 z-50">
      {#each ui.notifications as notification}
        <div class="notification-card backdrop-blur-2xl bg-sky-900/95 text-sky-50 px-6 py-4 rounded-2xl shadow-[0_8px_32px_rgba(6,182,212,0.3)] border border-cyan-400/30 animate-slide-in">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/70"></div>
            <span class="font-semibold">{notification}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  </div>
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
      0 10px 25px -5px rgba(6, 182, 212, 0.4),
      0 0 30px rgba(6, 182, 212, 0.3);
  }
</style>