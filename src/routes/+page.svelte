<script lang="ts">
  import { useLibrary, useUI } from '@/lib/hooks';
  import { Button } from "$lib/components/ui/button";
  import TrackListItem from '@/components/TrackListItem.svelte';
  import { Music2, Disc3, Sparkles, Library as LibraryIcon } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { fadeIn, scaleIn, staggerItems, slideInLeft, glow } from '@/lib/animations';

  // Hooks personalizados
  const library = useLibrary();
  const ui = useUI();

  // Valores derivados reactivos (Svelte 5 Runes)
  const isLoading = $derived(library.isLoading);
  const tracks = $derived(library.tracks);
  const totalTracks = $derived(library.totalTracks);
  const artists = $derived(library.artists);
  const albums = $derived(library.albums);
  const error = $derived(library.error);
  const notifications = $derived(ui.notifications);

  onMount(() => {
    ui.loadPreferences();
    
    // Animaciones de entrada
    fadeIn('.main-header');
    scaleIn('.load-button');
    slideInLeft('.stats-card');
    
    // Efecto de brillo en el ícono
    setTimeout(() => glow('.icon-glow'), 500);
  });

  $effect(() => {
    // Animar tracks cuando se carguen
    if (!isLoading && tracks.length > 0) {
      setTimeout(() => {
        staggerItems('.track-item');
      }, 100);
    }
  });

  async function handleLoadLibrary() {
    try {
      await library.loadLibrary();
      ui.notify('✅ Biblioteca cargada correctamente');
    } catch (error) {
      ui.notify('❌ Error cargando biblioteca');
    }
  }
</script>

<div class="bg-gradient-page relative min-h-screen overflow-hidden pb-32">
  <!-- 🌌 Animated Background Orbs -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    <div class="bg-orb-cyan orb-1 absolute left-10 top-20 h-96 w-96 animate-pulse rounded-full blur-[140px]"></div>
    <div class="bg-orb-blue orb-2 absolute bottom-20 right-10 h-80 w-80 animate-pulse rounded-full blur-[120px]"></div>
    <div class="orb-3 absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-[180px]"></div>
  </div>

  <!-- ✨ Header con Glassmorphism Moderno -->
  <div class="main-header sticky top-0 z-40 m-auto my-5 mb-10 w-[85%] rounded-3xl border-b border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
    <div class="px-8 py-10">
      <div class="flex items-center justify-between gap-8">
        <div class="group flex items-center gap-6">
          <!-- 🎵 Icono Principal con Glow Animado -->
          <div class="icon-glow relative" aria-hidden="true">
            <div class="gradient-cyan-blue absolute inset-0 rounded-3xl opacity-70 blur-2xl transition-all duration-500 group-hover:opacity-100"></div>
            <div class="gradient-cyan-blue relative flex h-24 w-24 transform items-center justify-center rounded-3xl shadow-2xl shadow-cyan-500/50 transition-all duration-500 group-hover:rotate-3 group-hover:scale-110">
              <Music2 size={48} class="text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
          </div>
          
          <div>
            <h1 class="text-gradient-cyan mb-3 text-5xl font-bold tracking-wide drop-shadow-sm">
              Mi Biblioteca
            </h1>
            <div class="stats-card flex items-center gap-3 text-base">
              <span class="hover:bg-white/15 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 shadow-lg backdrop-blur-lg transition-all hover:scale-105">
                <Disc3 size={18} class="text-cyan-400" />
                <span class="font-bold text-cyan-300">{totalTracks}</span>
                <span class="text-neutral-100">canciones</span>
              </span>
              <span class="hover:bg-white/15 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-semibold text-blue-100 shadow-lg backdrop-blur-lg transition-all hover:scale-105">
                {artists.length} artistas
              </span>
              <span class="hover:bg-white/15 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-semibold text-slate-100 shadow-lg backdrop-blur-lg transition-all hover:scale-105">
                {albums.length} álbumes
              </span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <Button 
            onclick={handleLoadLibrary} 
            disabled={isLoading}
            class="load-button gradient-blue h-auto rounded-2xl border-0 px-8 py-5 text-lg font-bold text-white shadow-2xl shadow-cyan-500/50 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/70 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isLoading ? 'Cargando biblioteca' : 'Cargar biblioteca de música'}
          >
            {#if isLoading}
              <div class="flex items-center gap-3">
                <div class="border-3 h-6 w-6 animate-spin rounded-full border-white border-t-transparent" role="status" aria-label="Cargando"></div>
                <span>Cargando...</span>
              </div>
            {:else}
              <div class="flex items-center gap-3">
                <LibraryIcon size={24} aria-hidden="true" />
                <span>Cargar Biblioteca</span>
              </div>
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </div>

  <div class="relative z-10 space-y-8 px-10">
    <!-- 🔄 Estado de Carga con Animación -->
    {#if isLoading}
      <div class="py-40 text-center">
        <div class="inline-flex flex-col items-center gap-8">
          <div class="relative">
            <!-- Resplandor Pulsante -->
            <div class="absolute inset-0 animate-pulse rounded-full opacity-60 blur-[80px]" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);"></div>
            <!-- Spinner Glassmorphism -->
            <div class="relative h-32 w-32 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400 shadow-2xl backdrop-blur-sm"></div>
            <!-- Icono Central -->
            <div class="absolute inset-0 flex animate-pulse items-center justify-center">
              <Sparkles size={48} class="text-cyan-300 drop-shadow-lg" />
            </div>
          </div>
          <div class="space-y-4 rounded-2xl border border-white/10 bg-white/5 px-8 py-6 shadow-2xl backdrop-blur-sm">
            <p class="text-3xl font-bold tracking-wide text-white drop-shadow-sm">Escaneando tu biblioteca...</p>
            <p class="text-lg text-slate-300">✨ Descubriendo tu música</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- ❌ Error con Glassmorphism -->
    {#if error}
      <div class="animate-shake rounded-2xl border border-red-400/30 bg-red-500/10 p-8 text-red-200 shadow-2xl shadow-red-500/20 backdrop-blur-xl">
        <div class="flex items-center gap-5">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <span class="text-xl font-bold drop-shadow">{error}</span>
        </div>
      </div>
    {/if}

    <!-- 🎵 Lista de Canciones con Stagger Animation -->
    {#if !isLoading && tracks.length > 0}
      <div class="space-y-4">
        {#each tracks as track, index (track.path)}
          <div class="track-item">
            <TrackListItem {track} {index} allTracks={tracks} />
          </div>
        {/each}
      </div>
    {:else if !isLoading}
      <!-- 🎭 Estado Vacío Elegante -->
      <div class="py-40 text-center">
        <div class="inline-flex flex-col items-center gap-8">
          <div class="relative">
            <div class="absolute inset-0 rounded-full bg-cyan-400/20 blur-[100px]"></div>
            <div class="relative flex h-48 w-48 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
              <Music2 size={80} class="text-cyan-400 drop-shadow-lg" strokeWidth={1.5} />
            </div>
          </div>
          <div class="max-w-md space-y-4">
            <p class="text-3xl font-bold tracking-wide text-white drop-shadow-sm">Tu biblioteca está vacía</p>
            <p class="text-lg text-slate-300">Haz clic en <span class="font-semibold text-cyan-300">"Cargar Biblioteca"</span> para comenzar tu viaje musical 🎧</p>
          </div>
        </div>
      </div>
    {/if}
  <!-- 🔔 Notificaciones con Glassmorphism -->
  {#if notifications.length > 0}
    <div class="fixed right-8 top-8 z-50 space-y-4">
      {#each notifications as notification}
        <div class="notification-card animate-slide-in rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-white shadow-2xl backdrop-blur-xl">
          <div class="flex items-center gap-4">
            <div class="h-3 w-3 animate-pulse rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/80"></div>
            <span class="text-lg font-bold tracking-wide drop-shadow-sm">{notification}</span>
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