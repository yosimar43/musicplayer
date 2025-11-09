<script lang="ts">
  import { library, ui, loadDefaultLibrary, notify, loadPreferences } from '@/lib/state';
  import { Button } from "$lib/components/ui/button";
  import TrackListItem from '@/components/TrackListItem.svelte';
  import { Music2, Disc3, Play, Sparkles, Library as LibraryIcon } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { player } from '@/lib/state';
  import { fadeIn, scaleIn, staggerItems, slideInLeft, glow } from '@/lib/animations';

  onMount(() => {
    loadPreferences();
    
    // Animaciones de entrada
    fadeIn('.main-header');
    scaleIn('.load-button');
    slideInLeft('.stats-card');
    
    // Efecto de brillo en el ícono
    setTimeout(() => glow('.icon-glow'), 500);
  });

  $effect(() => {
    // Animar tracks cuando se carguen
    if (!library.isLoading && library.tracks.length > 0) {
      setTimeout(() => {
        staggerItems('.track-item');
      }, 100);
    }
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

<div class="min-h-screen pb-32 relative overflow-hidden" style="background: linear-gradient(to bottom right, #1e293b, #0f172a, #000000);">
  <!-- 🌌 Animated Background Orbs -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden">
    <div class="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[140px] animate-pulse orb-1"></div>
    <div class="absolute bottom-20 right-10 w-80 h-80 bg-blue-400/20 rounded-full blur-[120px] animate-pulse orb-2"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-300/10 rounded-full blur-[180px] orb-3"></div>
  </div>

  <!-- ✨ Header con Glassmorphism Moderno -->
  <div class="main-header sticky top-0 z-40 backdrop-blur-xl bg-white/10 border-b border-white/20 mb-10 shadow-2xl">
    <div class="px-8 py-10">
      <div class="flex items-center justify-between gap-8">
        <div class="flex items-center gap-6 group">
          <!-- 🎵 Icono Principal con Glow Animado -->
          <div class="relative icon-glow">
            <div class="absolute inset-0 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-all duration-500" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);"></div>
            <div class="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);">
              <Music2 size={48} class="text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
          </div>
          
          <div>
            <h1 class="text-5xl font-bold mb-3 bg-clip-text text-transparent drop-shadow-sm tracking-wide" style="background-image: linear-gradient(to right, #67e8f9, #93c5fd, #67e8f9);">
              Mi Biblioteca
            </h1>
            <div class="flex items-center gap-3 text-base stats-card">
              <span class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg transition-all hover:bg-white/15 hover:scale-105">
                <Disc3 size={18} class="text-cyan-400" />
                <span class="font-bold text-cyan-300">{library.totalTracks}</span>
                <span class="text-neutral-100">canciones</span>
              </span>
              <span class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg text-blue-100 font-semibold transition-all hover:bg-white/15 hover:scale-105">
                {library.artists.length} artistas
              </span>
              <span class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg text-slate-100 font-semibold transition-all hover:bg-white/15 hover:scale-105">
                {library.albums.length} álbumes
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onclick={handleLoadLibrary} 
          disabled={library.isLoading}
          class="load-button text-white shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all duration-300 border-0 px-8 py-5 h-auto text-lg font-bold rounded-2xl hover:scale-105 active:scale-95"
          style="background: linear-gradient(to right, #06b6d4, #3b82f6);"
        >
          {#if library.isLoading}
            <div class="flex items-center gap-3">
              <div class="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
              <span>Cargando...</span>
            </div>
          {:else}
            <div class="flex items-center gap-3">
              <LibraryIcon size={24} />
              <span>Cargar Biblioteca</span>
            </div>
          {/if}
        </Button>
      </div>
    </div>
  </div>

  <div class="px-10 space-y-8 relative z-10">
    <!-- 🔄 Estado de Carga con Animación -->
    {#if library.isLoading}
      <div class="text-center py-40">
        <div class="inline-flex flex-col items-center gap-8">
          <div class="relative">
            <!-- Resplandor Pulsante -->
            <div class="absolute inset-0 rounded-full blur-[80px] animate-pulse opacity-60" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);"></div>
            <!-- Spinner Glassmorphism -->
            <div class="relative animate-spin rounded-full h-32 w-32 border-4 border-white/20 border-t-cyan-400 shadow-2xl backdrop-blur-sm"></div>
            <!-- Icono Central -->
            <div class="absolute inset-0 flex items-center justify-center animate-pulse">
              <Sparkles size={48} class="text-cyan-300 drop-shadow-lg" />
            </div>
          </div>
          <div class="space-y-4 backdrop-blur-sm bg-white/5 px-8 py-6 rounded-2xl border border-white/10 shadow-2xl">
            <p class="text-white font-bold text-3xl tracking-wide drop-shadow-sm">Escaneando tu biblioteca...</p>
            <p class="text-slate-300 text-lg">✨ Descubriendo tu música</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- ❌ Error con Glassmorphism -->
    {#if library.error}
      <div class="backdrop-blur-xl bg-red-500/10 border border-red-400/30 rounded-2xl p-8 text-red-200 shadow-2xl shadow-red-500/20 animate-shake">
        <div class="flex items-center gap-5">
          <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <span class="font-bold text-xl drop-shadow">{library.error}</span>
        </div>
      </div>
    {/if}

    <!-- 🎵 Lista de Canciones con Stagger Animation -->
    {#if !library.isLoading && library.tracks.length > 0}
      <div class="space-y-4">
        {#each library.tracks as track, index (track.path)}
          <div class="track-item">
            <TrackListItem {track} {index} allTracks={library.tracks} />
          </div>
        {/each}
      </div>
    {:else if !library.isLoading}
      <!-- 🎭 Estado Vacío Elegante -->
      <div class="text-center py-40">
        <div class="inline-flex flex-col items-center gap-8">
          <div class="relative">
            <div class="absolute inset-0 bg-cyan-400/20 rounded-full blur-[100px]"></div>
            <div class="relative w-48 h-48 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
              <Music2 size={80} class="text-cyan-400 drop-shadow-lg" strokeWidth={1.5} />
            </div>
          </div>
          <div class="space-y-4 max-w-md">
            <p class="text-white text-3xl font-bold drop-shadow-sm tracking-wide">Tu biblioteca está vacía</p>
            <p class="text-slate-300 text-lg">Haz clic en <span class="text-cyan-300 font-semibold">"Cargar Biblioteca"</span> para comenzar tu viaje musical 🎧</p>
          </div>
        </div>
      </div>
    {/if}
  <!-- 🔔 Notificaciones con Glassmorphism -->
  {#if ui.notifications.length > 0}
    <div class="fixed top-8 right-8 space-y-4 z-50">
      {#each ui.notifications as notification}
        <div class="notification-card backdrop-blur-xl bg-white/10 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/20 animate-slide-in">
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/80"></div>
            <span class="font-bold text-lg drop-shadow-sm tracking-wide">{notification}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  </div>
</div>

<style>
  /* 🌊 Animaciones de Orbes de Fondo */
  @keyframes float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -30px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }

  .orb-1 {
    animation: float 20s ease-in-out infinite;
  }

  .orb-2 {
    animation: float 25s ease-in-out infinite reverse;
    animation-delay: 2s;
  }

  .orb-3 {
    animation: float 30s ease-in-out infinite;
    animation-delay: 5s;
  }

  /* 📥 Slide In para Notificaciones */
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(120%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* 💫 Shake para Errores */
  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-5px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(5px);
    }
  }

  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }

  /* ✨ Glassmorphism Mejorado */
  .notification-card {
    box-shadow: 
      0 20px 40px -10px rgba(6, 182, 212, 0.5),
      0 0 50px rgba(34, 211, 238, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  /* 🎨 Hover Effects para Stats */
  .stats-card span {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .stats-card span:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(6, 182, 212, 0.4);
  }

  /* 🎯 Track Item Hover */
  .track-item {
    transition: all 0.2s ease;
  }

  .track-item:hover {
    transform: translateX(5px);
  }
</style>