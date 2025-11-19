<script lang="ts">
  import { onMount } from 'svelte';
  import { Music, Search, Home, Library, ListMusic } from 'lucide-svelte';
  import { useLibrary } from '$lib/hooks';

  let isHidden = $state(false);
  let navElement: HTMLElement;
  let isLoadingLibrary = $state(false);

  // Hook para la biblioteca local
  const library = useLibrary();

  async function handleLogoClick() {
    if (isLoadingLibrary) return;

    isLoadingLibrary = true;
    try {
      console.log('🎵 Cargando biblioteca local...');
      await library.loadLibrary();
      console.log('✅ Biblioteca cargada:', library.tracks.length, 'canciones');
    } catch (error) {
      console.error('❌ Error al cargar biblioteca:', error);
    } finally {
      isLoadingLibrary = false;
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!navElement) return;

    const navRect = navElement.getBoundingClientRect();
    const mouseY = event.clientY;
    
    // Distancia de activación: 150px desde el navbar
    const activationDistance = 150;
    const distanceFromNav = mouseY - navRect.bottom;

    // Si el mouse está dentro del navbar o cerca (150px)
    if (mouseY <= navRect.bottom + activationDistance) {
      isHidden = false;
    } else {
      isHidden = true;
    }
  }

  onMount(() => {
    // Iniciar oculto
    isHidden = true;

    // Escuchar movimiento del mouse
    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup al desmontar
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });
</script>

<div class="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none">
  <nav
    bind:this={navElement}
    class="w-[85%] backdrop-blur-xl bg-white/10 border border-sky-400/30 
           rounded-2xl shadow-lg shadow-cyan-500/20 pointer-events-auto
           transition-all duration-500 ease-out
           {isHidden ? 'scale-[0.92] opacity-55' : 'scale-100 opacity-100'}"
  >
    <div class="flex items-center justify-between px-6 py-4">
      
      <!-- Logo y Título -->
      <div class="flex items-center gap-4">
        <button
          onclick={handleLogoClick}
          disabled={isLoadingLibrary}
          class="w-12 h-12 rounded-2xl bg-linear-to-br from-cyan-400 to-sky-500
                    flex items-center justify-center shadow-lg shadow-cyan-500/40
                    transition-all duration-500
                    {isHidden ? 'scale-90' : 'scale-100'}
                    {isLoadingLibrary ? 'animate-pulse' : ''}
                    hover:scale-110 hover:shadow-cyan-500/60
                    disabled:opacity-70 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          title={isLoadingLibrary ? 'Cargando biblioteca...' : 'Cargar biblioteca local'}
        >
          {#if isLoadingLibrary}
            <div class="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {:else}
            <Music class="w-7 h-7 text-white" />
          {/if}
        </button>
        <div class="flex flex-col">
          <h1 class="text-2xl font-bold text-white/95 transition-opacity duration-500
                     {isHidden ? 'opacity-70' : 'opacity-100'}">
            Music Player
          </h1>
          {#if library.tracks.length > 0}
            <p class="text-xs text-cyan-400/70 transition-opacity duration-500
                      {isHidden ? 'opacity-70' : 'opacity-100'}">
              {library.tracks.length} canciones locales
            </p>
          {/if}
        </div>
      </div>

      <!-- Barra de Búsqueda -->
      <div class="flex-1 max-w-2xl mx-8">
        <div class="relative">
          <input
            type="text"
            placeholder="Buscar canciones, artistas o álbumes..."
            class="w-full px-6 py-3 pl-12 rounded-xl 
                   bg-slate-900/50 backdrop-blur-md
                   border border-sky-400/20
                   text-slate-200 placeholder-slate-400
                   focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30
                   transition-all duration-300"
          />
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400/70" />
        </div>
      </div>

      <!-- Navegación -->
      <div class="flex items-center gap-2">
        <a 
          href="/"
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl
                 bg-sky-500/20 border border-sky-400/30
                 text-white/95 font-medium
                 hover:bg-sky-500/30 hover:border-sky-400/50
                 transition-all duration-300"
        >
          <Home class="w-5 h-5" />
          <span class="transition-opacity duration-500 {isHidden ? 'opacity-70' : 'opacity-100'}">
            Home
          </span>
        </a>

        <a 
          href="/library"
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl
                 text-slate-200 font-medium
                 hover:bg-white/10 hover:text-white
                 transition-all duration-300"
        >
          <Library class="w-5 h-5" />
          <span class="transition-opacity duration-500 {isHidden ? 'opacity-70' : 'opacity-100'}">
            Library
          </span>
        </a>

        <a 
          href="/playlists"
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl
                 text-slate-200 font-medium
                 hover:bg-white/10 hover:text-white
                 transition-all duration-300"
        >
          <ListMusic class="w-5 h-5" />
          <span class="transition-opacity duration-500 {isHidden ? 'opacity-70' : 'opacity-100'}">
            Playlists
          </span>
        </a>
      </div>

    </div>
  </nav>
</div>