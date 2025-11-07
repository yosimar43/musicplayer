<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { animate, stagger } from 'animejs';
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Heart, Play, Clock, Music, Loader2, AlertCircle, TrendingUp, Pause, ExternalLink, Search, Filter, Download, RefreshCw, ChevronDown, BarChart3, Timer, LayoutGrid, Users, Sparkles, Disc, Album, User, ListMusic, Star } from "lucide-svelte";
  import StatsCard from "$lib/components/StatsCard.svelte";
  import PlaylistSlider from "$lib/components/PlaylistSlider.svelte";
  import AnimatedBackground from "$lib/components/AnimatedBackground.svelte";

  interface SpotifyTrack {
    id: string | null;
    name: string;
    artists: string[];
    album: string;
    album_image: string | null;
    duration_ms: number;
    popularity: number | null;
    preview_url: string | null;
    external_url: string | null;
  }

  interface SpotifyPlaylist {
    id: string;
    name: string;
    description: string | null;
    owner: string;
    tracks_total: number;
    images: string[];
    public: boolean | null;
  }

  let savedTracks = $state<SpotifyTrack[]>([]);
  let playlists = $state<SpotifyPlaylist[]>([]);
  let isLoading = $state(false);
  let isLoadingTracks = $state(false);
  let loadingProgress = $state(0);
  let isAuthenticated = $state(false);
  let error = $state<string | null>(null);
  let activeView = $state<'liked' | 'playlists'>('liked');
  let playingTrackId = $state<string | null>(null);
  let sortBy = $state<'name' | 'artist' | 'album' | 'duration' | 'popularity'>('name');
  let sortOrder = $state<'asc' | 'desc'>('asc');
  let searchQuery = $state('');
  let showFilters = $state(false);
  let filterPopularity = $state<'all' | 'high' | 'medium' | 'low'>('all');

  onMount(async () => {
    await checkAuth();
  });

  async function checkAuth() {
    try {
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      if (isAuthenticated) {
        await loadAll();
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    }
  }

  async function loadAll() {
    isLoading = true;
    try {
      await Promise.all([loadSavedTracks(), loadPlaylists()]);
    } finally {
      isLoading = false;
    }
  }

  async function loadSavedTracks() {
    isLoadingTracks = true;
    error = null;
    savedTracks = [];
    loadingProgress = 0;
    
    try {
      console.log('🎵 Cargando TODAS las canciones guardadas con el nuevo comando...');
      
      // Usar el nuevo comando que maneja la paginación automáticamente
      const allTracks = await invoke<SpotifyTrack[]>('spotify_get_all_liked_songs');
      
      savedTracks = allTracks;
      console.log(`✅ ¡${allTracks.length} canciones cargadas exitosamente!`);
      
    } catch (err: any) {
      error = err.toString();
      console.error('❌ Error loading tracks:', err);
    } finally {
      isLoadingTracks = false;
      loadingProgress = 0;
    }
  }

  async function loadPlaylists() {
    error = null;
    try {
      playlists = await invoke<SpotifyPlaylist[]>('spotify_get_playlists', { limit: 50 });
    } catch (err: any) {
      error = err.toString();
      console.error('Error loading playlists:', err);
    }
  }

  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function getPopularityColor(popularity: number): string {
    if (popularity >= 80) return 'text-green-400';
    if (popularity >= 60) return 'text-yellow-400';
    if (popularity >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  function handleSort(column: typeof sortBy) {
    if (sortBy === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortOrder = 'asc';
    }
  }

  let filteredTracks = $derived.by(() => {
    let tracks = [...savedTracks];
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tracks = tracks.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.artists.some(a => a.toLowerCase().includes(query)) ||
        t.album.toLowerCase().includes(query)
      );
    }

    // Filtrar por popularidad
    if (filterPopularity !== 'all') {
      tracks = tracks.filter(t => {
        const pop = t.popularity || 0;
        if (filterPopularity === 'high') return pop >= 70;
        if (filterPopularity === 'medium') return pop >= 40 && pop < 70;
        if (filterPopularity === 'low') return pop < 40;
        return true;
      });
    }

    // Ordenar
    tracks.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'artist':
          comparison = a.artists[0].localeCompare(b.artists[0]);
          break;
        case 'album':
          comparison = a.album.localeCompare(b.album);
          break;
        case 'duration':
          comparison = a.duration_ms - b.duration_ms;
          break;
        case 'popularity':
          comparison = (a.popularity || 0) - (b.popularity || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return tracks;
  });

  let totalDuration = $derived(savedTracks.reduce((acc, t) => acc + t.duration_ms, 0));
  let averagePopularity = $derived(
    savedTracks.length > 0
      ? Math.round(savedTracks.reduce((acc, t) => acc + (t.popularity || 0), 0) / savedTracks.length)
      : 0
  );

  // Estadísticas adicionales
  let topArtist = $derived.by(() => {
    if (savedTracks.length === 0) return { name: '-', count: 0 };
    const artistCounts = new Map<string, number>();
    savedTracks.forEach(track => {
      track.artists.forEach(artist => {
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      });
    });
    const sorted = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1]);
    return { name: sorted[0]?.[0] || '-', count: sorted[0]?.[1] || 0 };
  });

  let uniqueArtists = $derived(new Set(savedTracks.flatMap(t => t.artists)).size);
  let uniqueAlbums = $derived(new Set(savedTracks.map(t => t.album)).size);

  function playPreview(track: SpotifyTrack) {
    if (!track.preview_url) return;
    
    if (playingTrackId === track.id) {
      playingTrackId = null;
    } else {
      playingTrackId = track.id;
      // Aquí podrías reproducir el preview real con un Audio element
    }
  }

  // 🎬 ANIMACIONES CON ANIME.JS
  let animationsInitialized = false;

  function initAnimations() {
    if (animationsInitialized) return;
    animationsInitialized = true;

    // Animación del header con fade in y slide up
    animate('.animate-header', {
      opacity: [0, 1],
      translateY: [-50, 0],
      duration: 1200,
      ease: 'out(3)'
    });

    // Animación de la tabla con fade in
    animate('.animate-table', {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 1000,
      delay: 400,
      ease: 'out(2)'
    });
    
    // Animación de las filas de la tabla con stagger
    animate('.table-row', {
      opacity: [0, 1],
      translateX: [-20, 0],
      duration: 600,
      delay: stagger(50, {start: 600}),
      ease: 'out(2)'
    });
  }

  function animateViewChange() {
    // Animación al cambiar de vista (tabs)
    animate('.animate-content', {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      ease: 'out(2)'
    });
  }

  onMount(() => {
    checkAuth();
    
    // Inicializar animaciones después de un breve delay para asegurar que el DOM esté listo
    setTimeout(() => {
      initAnimations();
    }, 150);
  });

  // Re-animar cuando cambia la vista
  $effect(() => {
    if (activeView) {
      setTimeout(() => {
        animateViewChange();
      }, 50);
    }
  });
</script>

<AnimatedBackground />

<div class="min-h-screen relative z-10">
  <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Header con glassmorphism y animación mejorada -->
    <div class="animate-header relative mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 backdrop-blur-2xl border border-cyan-400/30 p-8 shadow-2xl shadow-cyan-500/30">
      <!-- Efecto de brillo animado -->
      <div class="absolute inset-0 bg-linear-to-r from-transparent via-cyan-400/10 to-transparent animate-shimmer"></div>
      <div class="absolute inset-0 bg-linear-to-br from-cyan-400/5 to-blue-400/5"></div>
      
      <div class="relative z-10">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-400 to-blue-500 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-cyan-500/50 animate-pulse-slow">
              <Heart class="text-white" size={36} fill="white" />
            </div>
            <div>
              <h1 class="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-200 via-blue-200 to-purple-200 mb-2 drop-shadow-lg">
                Mi Biblioteca Musical
              </h1>
              <p class="text-cyan-100/80 text-lg flex items-center gap-2">
                <Sparkles size={18} class="text-cyan-300" />
                Explora y gestiona tu colección de Spotify
              </p>
            </div>
          </div>
          <Button
            onclick={() => loadAll()}
            disabled={isLoading}
            class="bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-sm text-cyan-100 border-cyan-400/30 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-105"
          >
            <RefreshCw size={18} class={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>
    </div>

  {#if !isAuthenticated}
    <!-- Not Authenticated -->
    <Card.Root class="bg-white/5 border-white/10">
      <Card.Content class="p-12 text-center">
        <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Music class="text-green-400" size={40} />
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Conecta tu cuenta de Spotify</h2>
        <p class="text-gray-400 mb-6">Autoriza la aplicación para ver tus canciones favoritas y playlists</p>
        <a href="/spotify">
          <Button class="bg-green-500 hover:bg-green-600">
            <Music size={18} class="mr-2" />
            Conectar con Spotify
          </Button>
        </a>
      </Card.Content>
    </Card.Root>
  {:else if isLoading}
    <!-- Loading -->
    <div class="flex flex-col items-center justify-center py-32">
      <div class="relative">
        <div class="w-24 h-24 border-4 border-cyan-500/20 rounded-full"></div>
        <div class="w-24 h-24 border-4 border-t-cyan-400 rounded-full animate-spin absolute top-0"></div>
      </div>
      {#if loadingProgress > 0}
        <div class="text-center mt-8">
          <p class="text-white text-xl font-semibold mb-3">Cargando tu biblioteca...</p>
          <div class="bg-sky-900/30 rounded-full h-3 w-64 overflow-hidden backdrop-blur-sm border border-cyan-500/20">
            <div 
              class="h-full bg-linear-to-r from-cyan-400 via-blue-400 to-cyan-400 transition-all duration-300 rounded-full shadow-lg shadow-cyan-500/50"
              style="width: {Math.min(100, (loadingProgress / 50) * 100)}%"
            ></div>
          </div>
          <p class="text-pink-400 text-3xl font-bold mt-3">{loadingProgress}</p>
          <p class="text-gray-400 text-sm">canciones cargadas</p>
        </div>
      {:else}
        <p class="text-gray-400 mt-6 text-lg">Conectando con Spotify...</p>
      {/if}
    </div>
  {:else}
    <!-- Stats Cards con componente reutilizable -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      <StatsCard 
        icon={Heart}
        value={savedTracks.length.toLocaleString()}
        label="Canciones Guardadas"
        color="cyan"
        index={0}
      />
      
      <StatsCard 
        icon={Music}
        value={playlists.length}
        label="Playlists"
        color="blue"
        index={1}
      />
      
      <StatsCard 
        icon={Clock}
        value="{Math.floor(totalDuration / 3600000)}h {Math.floor((totalDuration % 3600000) / 60000)}m"
        label="Tiempo Total"
        color="purple"
        index={2}
      />
      
      <StatsCard 
        icon={TrendingUp}
        value="{averagePopularity}%"
        label="Popularidad Media"
        color="violet"
        index={3}
      />
      
      <StatsCard 
        icon={Users}
        value={uniqueArtists}
        label="Artistas Únicos"
        color="cyan"
        index={4}
      />
      
      <StatsCard 
        icon={Disc}
        value={uniqueAlbums}
        label="Álbumes"
        color="blue"
        index={5}
      />
    </div>

    <!-- Top Artist Card animado -->
    {#if topArtist.name !== '-'}
      <div class="animate-stat-card mb-8">
        <Card.Root class="bg-linear-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-500">
          <Card.Content class="p-6">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-linear-to-br from-yellow-400/30 to-orange-500/30 flex items-center justify-center animate-pulse">
                <span class="text-4xl">👑</span>
              </div>
              <div>
                <p class="text-cyan-200/60 text-sm font-medium">Tu artista favorito</p>
                <p class="text-white text-2xl font-bold">{topArtist.name}</p>
                <p class="text-cyan-300/50 text-sm">{topArtist.count} canciones en tu biblioteca</p>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    {/if}    <!-- Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <Button
        variant={activeView === 'liked' ? 'default' : 'ghost'}
        onclick={() => activeView = 'liked'}
        class={activeView === 'liked' 
          ? 'bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
          : 'text-cyan-200/60 hover:text-white hover:bg-cyan-500/10'}
      >
        <Heart size={18} class="mr-2" />
        Canciones Favoritas ({savedTracks.length})
      </Button>
      <Button
        variant={activeView === 'playlists' ? 'default' : 'ghost'}
        onclick={() => activeView = 'playlists'}
        class={activeView === 'playlists' 
          ? 'bg-linear-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white shadow-lg shadow-blue-500/20' 
          : 'text-cyan-200/60 hover:text-white hover:bg-blue-500/10'}
      >
        <Music size={18} class="mr-2" />
        Mis Playlists ({playlists.length})
      </Button>
    </div>

    {#if error}
      <Card.Root class="bg-red-500/20 border-red-500/50 mb-6 backdrop-blur-sm">
        <Card.Content class="p-4 flex items-center gap-3">
          <AlertCircle class="text-red-400" size={24} />
          <p class="text-red-200">{error}</p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Liked Songs View -->
    {#if activeView === 'liked'}
      <!-- Search and Filters Bar -->
      <div class="animate-content mb-6 space-y-4">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1 relative">
            <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400/70" size={20} />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Buscar por canción, artista o álbum..."
              class="w-full pl-12 pr-4 py-4 bg-sky-900/30 border border-cyan-500/20 rounded-xl text-white placeholder-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent backdrop-blur-sm transition-all"
            />
            {#if searchQuery}
              <button
                onclick={() => searchQuery = ''}
                class="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-400/60 hover:text-cyan-300"
              >
                ✕
              </button>
            {/if}
          </div>
          
          <Button
            onclick={() => showFilters = !showFilters}
            variant="outline"
            class="border-cyan-500/30 text-cyan-100 hover:bg-cyan-500/10 backdrop-blur-sm px-6"
          >
            <Filter size={18} class="mr-2" />
            Filtros
            <ChevronDown size={16} class="ml-2 transition-transform {showFilters ? 'rotate-180' : ''}" />
          </Button>
        </div>

        {#if showFilters}
          <Card.Root class="bg-sky-900/30 border-cyan-500/20 backdrop-blur-sm">
            <Card.Content class="p-6">
              <div class="flex flex-wrap gap-4 items-center">
                <span class="text-cyan-200/80 text-sm font-semibold">Popularidad:</span>
                <div class="flex gap-2">
                  {#each [
                    { value: 'all', label: 'Todas', color: 'cyan' },
                    { value: 'high', label: 'Alta (70+)', color: 'green' },
                    { value: 'medium', label: 'Media (40-70)', color: 'yellow' },
                    { value: 'low', label: 'Baja (<40)', color: 'red' }
                  ] as filter}
                    <button
                      onclick={() => filterPopularity = filter.value as any}
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
                        filterPopularity === filter.value
                          ? `bg-${filter.color}-500/80 text-white shadow-lg`
                          : 'bg-sky-900/30 text-cyan-200/60 hover:bg-sky-800/40'
                      }"
                    >
                      {filter.label}
                    </button>
                  {/each}
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      </div>

      <!-- Tracks Table con animación -->
      <Card.Root class="animate-table bg-sky-900/30 border-cyan-500/20 backdrop-blur-sm shadow-2xl shadow-cyan-500/5">
        <Card.Content class="p-0">
          <div class="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row class="border-cyan-500/20 hover:bg-cyan-500/5 bg-sky-900/40">
                  <Table.Head class="w-16 text-cyan-200/70 font-semibold">#</Table.Head>
                  <Table.Head class="min-w-[300px]">
                    <button 
                      onclick={() => handleSort('name')} 
                      class="flex items-center gap-2 hover:text-white transition-colors font-semibold text-cyan-200/90"
                    >
                      <Music size={16} />
                      Título 
                      {#if sortBy === 'name'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="min-w-[200px]">
                    <button 
                      onclick={() => handleSort('artist')} 
                      class="flex items-center gap-2 hover:text-white transition-colors font-semibold text-cyan-200/90"
                    >
                      🎤 Artista 
                      {#if sortBy === 'artist'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="min-w-[200px]">
                    <button 
                      onclick={() => handleSort('album')} 
                      class="flex items-center gap-2 hover:text-white transition-colors font-semibold text-cyan-200/90"
                    >
                      💿 Álbum 
                      {#if sortBy === 'album'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="text-center">
                    <button 
                      onclick={() => handleSort('popularity')} 
                      class="flex items-center gap-2 hover:text-white transition-colors mx-auto font-semibold text-cyan-200/90"
                    >
                      <TrendingUp size={14} />
                      Pop
                      {#if sortBy === 'popularity'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="text-right">
                    <button 
                      onclick={() => handleSort('duration')} 
                      class="flex items-center gap-2 hover:text-white transition-colors ml-auto font-semibold text-cyan-200/90"
                    >
                      <Clock size={14} />
                      {#if sortBy === 'duration'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-32 text-center text-cyan-200/70 font-semibold">Acciones</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each filteredTracks as track, i}
                  <Table.Row class="table-row border-cyan-500/10 hover:bg-cyan-500/5 transition-all group backdrop-blur-sm">
                    <Table.Cell class="font-medium text-cyan-200/60">
                      <span class="group-hover:hidden">{i + 1}</span>
                      <button
                        onclick={() => playPreview(track)}
                        class="hidden group-hover:flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-600 hover:scale-110 transition-all shadow-lg shadow-cyan-500/30"
                      >
                        {#if playingTrackId === track.id}
                          <Pause size={14} class="text-white" fill="white" />
                        {:else}
                          <Play size={14} class="text-white" fill="white" />
                        {/if}
                      </button>
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex items-center gap-3">
                        {#if track.album_image}
                          <div class="relative group/img">
                            <img 
                              src={track.album_image} 
                              alt={track.album}
                              class="w-12 h-12 rounded-lg object-cover shadow-lg group-hover:shadow-cyan-500/50 transition-all"
                            />
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                              <Play size={16} class="text-white" fill="white" />
                            </div>
                          </div>
                        {:else}
                          <div class="w-12 h-12 rounded-lg bg-sky-800/30 flex items-center justify-center">
                            <Music size={20} class="text-cyan-400/50" />
                          </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                          <p class="text-white font-semibold truncate group-hover:text-cyan-300 transition-colors">
                            {track.name}
                          </p>
                          <p class="text-cyan-300/50 text-sm truncate">{track.artists.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell class="text-cyan-100/80">
                      <span class="truncate block">{track.artists.join(', ')}</span>
                    </Table.Cell>
                    <Table.Cell class="text-cyan-200/60">
                      <span class="truncate block">{track.album}</span>
                    </Table.Cell>
                    <Table.Cell class="text-center">
                      {#if track.popularity !== null}
                        <div class="flex items-center justify-center gap-2">
                          <div class="w-20 h-2 bg-sky-800/40 rounded-full overflow-hidden">
                            <div 
                              class="h-full rounded-full transition-all {getPopularityColor(track.popularity)}"
                              style="width: {track.popularity}%; background-color: {
                                track.popularity >= 70 ? '#22c55e' :
                                track.popularity >= 40 ? '#eab308' : '#ef4444'
                              }"
                            ></div>
                          </div>
                          <span class="text-xs font-semibold {getPopularityColor(track.popularity)} min-w-8 text-right">
                            {track.popularity}
                          </span>
                        </div>
                      {:else}
                        <span class="text-cyan-400/30">-</span>
                      {/if}
                    </Table.Cell>
                    <Table.Cell class="text-right text-cyan-200/70 font-mono text-sm">
                      {formatDuration(track.duration_ms)}
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex items-center justify-center gap-2">
                        {#if track.external_url}
                          <a href={track.external_url} target="_blank" rel="noopener noreferrer">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              class="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500/20 hover:text-cyan-300"
                            >
                              <ExternalLink size={16} />
                            </Button>
                          </a>
                        {/if}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  <Table.Row>
                    <Table.Cell colspan={8} class="text-center py-12">
                      <div class="flex flex-col items-center gap-3">
                        <div class="w-16 h-16 rounded-full bg-sky-900/30 flex items-center justify-center">
                          <Search class="text-cyan-400/50" size={32} />
                        </div>
                        <p class="text-cyan-200/60 text-lg">
                          {searchQuery ? 'No se encontraron canciones que coincidan con tu búsqueda' : 'No hay canciones guardadas'}
                        </p>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Footer Info -->
      <div class="mt-6 flex items-center justify-between text-sm">
        <p class="text-cyan-300/50">
          Mostrando <span class="text-white font-semibold">{filteredTracks.length}</span> de 
          <span class="text-white font-semibold">{savedTracks.length}</span> canciones
        </p>
        {#if filteredTracks.length < savedTracks.length}
          <Button
            onclick={() => { searchQuery = ''; filterPopularity = 'all'; }}
            variant="ghost"
            size="sm"
            class="text-cyan-400 hover:text-cyan-300"
          >
            Limpiar filtros
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Playlists View con slider animado -->
    {#if activeView === 'playlists'}
      <div class="animate-content">
        <h2 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <ListMusic class="text-cyan-300" size={24} />
          </div>
          Tus Playlists
        </h2>
        
        {#if playlists.length > 0}
          <PlaylistSlider playlists={playlists} />
        {:else}
          <div class="text-center py-16">
            <div class="w-20 h-20 rounded-full bg-sky-900/30 flex items-center justify-center mx-auto mb-4 backdrop-blur-xl border border-cyan-400/20">
              <Music class="text-cyan-400/50" size={40} />
            </div>
            <p class="text-cyan-200/60 text-lg">No hay playlists disponibles</p>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
  
  </div>
</div>

<style>
  /* 🎨 Optimizaciones de rendimiento */
  .table-row {
    will-change: transform, opacity;
    backface-visibility: hidden;
  }
  
  /* Glassmorphism mejorado */
  .backdrop-blur-xl {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .backdrop-blur-sm {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .backdrop-blur-2xl {
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
  }
  
  /* Animación de shimmer para el header */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 3s ease-in-out infinite;
  }
  
  /* Pulso lento para el ícono del header */
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }
  
  /* Transiciones suaves globales */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }
</style>
