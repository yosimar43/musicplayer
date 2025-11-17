<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { useLibrary, useUI } from '@/lib/hooks';
  import { Music2, Disc3, Library as LibraryIcon, Sparkles, Loader2 } from 'lucide-svelte';
  import TrackListItem from '@/components/TrackListItem.svelte';
  import { homeTimeline, tracksTimeline, cleanupAnimations } from '@/lib/animations/home';
  import { 
    surfaceVariants, 
    statBadgeVariants, 
    gradientButtonVariants,
    iconGlowVariants,
    textGradientVariants,
    orbVariants,
    loadingStateVariants,
    emptyStateVariants,
    notificationVariants
  } from '@/lib/styles/bits-variants';

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

  let timelineInstance: ReturnType<typeof homeTimeline> | null = null;
  let tracksTimelineInstance: ReturnType<typeof tracksTimeline> | null = null;

  onMount(() => {
    ui.loadPreferences();

    // Iniciar timeline de animaciones (respeta prefers-reduced-motion)
    if (typeof window !== 'undefined') {
      timelineInstance = homeTimeline({ targets: '.home-page', respectMotion: true });
      timelineInstance.play();
    }
  });

  // Animar tracks cuando se carguen
  $effect(() => {
    if (!isLoading && tracks.length > 0 && typeof window !== 'undefined') {
      // Limpiar timeline anterior si existe
      if (tracksTimelineInstance) {
        cleanupAnimations('.tracks .track-item');
      }
      
      // Crear nueva timeline para tracks
      tracksTimelineInstance = tracksTimeline('.tracks .track-item');
      tracksTimelineInstance.play();
    }
  });

  onDestroy(() => {
    // Limpiar animaciones al destruir componente
    cleanupAnimations('.home-page *');
    if (timelineInstance) {
      timelineInstance.pause();
    }
    if (tracksTimelineInstance) {
      tracksTimelineInstance.pause();
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

<!-- Snippets reutilizables -->
{#snippet header()}
  <header class="header {surfaceVariants({ variant: 'glass', rounded: 'xl' })} sticky top-4 z-40 mx-auto w-[90%] p-6">
    <div class="flex items-center justify-between gap-8">
      <div class="group flex items-center gap-6">
        <!-- Icono con Tooltip -->
        <div class="icon-glow {iconGlowVariants({ size: 'md' })} gradient-cyan-blue" aria-label="Mi Biblioteca Musical">
          <Music2 size={48} class="text-white drop-shadow-lg" strokeWidth={2.5} />
        </div>
        
        <div>
          <h1 class="{textGradientVariants({ size: 'lg' })} mb-3 tracking-wide">
            Mi Biblioteca
          </h1>
          <div class="stats flex items-center gap-3">
            <span class="stat-badge {statBadgeVariants({ color: 'cyan' })}">
              <Disc3 size={18} class="text-cyan-400" />
              <span class="font-bold text-cyan-300">{totalTracks}</span>
              <span class="text-neutral-100">canciones</span>
            </span>
            <span class="stat-badge {statBadgeVariants({ color: 'blue' })}">
              {artists.length} artistas
            </span>
            <span class="stat-badge {statBadgeVariants({ color: 'slate' })}">
              {albums.length} álbumes
            </span>
          </div>
        </div>
      </div>
      
      <button
        onclick={handleLoadLibrary}
        disabled={isLoading}
        class="load-button {gradientButtonVariants()}"
        aria-label={isLoading ? 'Cargando biblioteca' : 'Cargar biblioteca de música'}
      >
        {#if isLoading}
          <Loader2 size={24} class="animate-spin" aria-hidden="true" />
          <span>Cargando...</span>
        {:else}
          <LibraryIcon size={24} aria-hidden="true" />
          <span>Cargar Biblioteca</span>
        {/if}
      </button>
    </div>
  </header>
{/snippet}

{#snippet loadingState()}
  <div class="{loadingStateVariants()}">
    <div class="inline-flex flex-col items-center gap-8">
      <div class="relative">
        <!-- Resplandor Pulsante -->
        <div class="absolute inset-0 motion-safe:animate-pulse rounded-full opacity-60 blur-[80px] bg-linear-to-br from-cyan-400 to-blue-500"></div>
        <!-- Spinner Glassmorphism -->
        <div class="relative h-32 w-32 motion-safe:animate-spin rounded-full border-4 border-white/20 border-t-cyan-400 shadow-2xl backdrop-blur-sm"></div>
        <!-- Icono Central -->
        <div class="absolute inset-0 flex motion-safe:animate-pulse items-center justify-center">
          <Sparkles size={48} class="text-cyan-300 drop-shadow-lg" />
        </div>
      </div>
      <div class="{surfaceVariants({ variant: 'glass', rounded: 'lg' })} px-8 py-6">
        <div class="space-y-4 p-0">
          <p class="text-3xl font-bold tracking-wide text-white drop-shadow-sm">Escaneando tu biblioteca...</p>
          <p class="text-lg text-slate-300">✨ Descubriendo tu música</p>
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#snippet errorState()}
  <div class="motion-safe:animate-shake rounded-2xl border border-red-400/30 bg-red-500/10 p-8 text-red-200 shadow-2xl shadow-red-500/20 backdrop-blur-xl">
    <div class="flex items-center gap-5 p-0">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-400" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <span class="text-xl font-bold drop-shadow">{error}</span>
    </div>
  </div>
{/snippet}

{#snippet emptyState()}
  <div class="{emptyStateVariants()}">
    <div class="inline-flex flex-col items-center gap-8">
      <div class="relative">
        <div class="absolute inset-0 rounded-full bg-cyan-400/20 blur-[100px]"></div>
        <div class="{surfaceVariants({ variant: 'glass', rounded: 'full' })} relative flex h-48 w-48 items-center justify-center shadow-2xl">
          <Music2 size={80} class="text-cyan-400 drop-shadow-lg" strokeWidth={1.5} />
        </div>
      </div>
      <div class="max-w-md space-y-4">
        <p class="text-3xl font-bold tracking-wide text-white drop-shadow-sm">Tu biblioteca está vacía</p>
        <p class="text-lg text-slate-300">
          Haz clic en <span class="font-semibold text-cyan-300">"Cargar Biblioteca"</span> para comenzar tu viaje musical 🎧
        </p>
      </div>
    </div>
  </div>
{/snippet}

{#snippet notificationsList(notificationsList: string[])}
  {#if notificationsList.length > 0}
    <div class="fixed right-8 top-8 z-50 space-y-4">
      {#each notificationsList as notification}
        <div class="{notificationVariants()} motion-safe:animate-slide-in">
          <div class="h-3 w-3 motion-safe:animate-pulse rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/80"></div>
          <span class="text-lg font-bold tracking-wide drop-shadow-sm">{notification}</span>
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

<!-- Página Principal -->
<div class="home-page bg-gradient-page relative min-h-screen overflow-hidden pb-32">
  <!-- 🌌 Animated Background Orbs -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    <div class="{orbVariants({ color: 'cyan', size: 'md' })} orb-1 left-10 top-20"></div>
    <div class="{orbVariants({ color: 'blue', size: 'sm' })} orb-2 bottom-20 right-10"></div>
    <div class="{orbVariants({ color: 'cyan', size: 'lg' })} orb-3 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
  </div>

  <!-- Header -->
  {@render header()}

  <!-- Contenido Principal -->
  <div class="relative z-10 space-y-8 px-10">
    {#if isLoading}
      {@render loadingState()}
    {:else if error}
      {@render errorState()}
    {:else if tracks.length > 0}
      <!-- 🎵 Lista de Canciones -->
      <div class="tracks space-y-4">
        {#each tracks as track, index (track.path)}
          <div class="track-item">
            <TrackListItem {track} {index} allTracks={tracks} />
          </div>
        {/each}
      </div>
    {:else}
      {@render emptyState()}
    {/if}
  </div>

  <!-- Notificaciones -->
  {@render notificationsList(notifications)}
</div>

<style>
  /* Animaciones de orbes con prefers-reduced-motion */
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

  @media (prefers-reduced-motion: no-preference) {
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
  }

  /* Slide in para notificaciones */
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

  @media (prefers-reduced-motion: no-preference) {
    .motion-safe\:animate-slide-in {
      animation: slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  /* Shake para errores */
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

  @media (prefers-reduced-motion: no-preference) {
    .motion-safe\:animate-shake {
      animation: shake 0.5s ease-in-out;
    }
  }
</style>
