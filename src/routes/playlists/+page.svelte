<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Heart, Play, Clock, Music, Loader2, AlertCircle, TrendingUp, Pause, ExternalLink } from "lucide-svelte";

  interface SpotifyTrack {
    id: string | null;
    name: string;
    artists: string[];
    album: string;
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
    savedTracks = []; // Reset
    loadingProgress = 0;
    
    try {
      console.log('🎵 Iniciando carga de todas las canciones guardadas...');
      let allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 50; // Spotify max limit per request
      let hasMore = true;
      
      while (hasMore) {
        console.log(`📥 Cargando desde offset ${offset}...`);
        
        const batch = await invoke<SpotifyTrack[]>('spotify_get_saved_tracks', { 
          limit,
          offset 
        });
        
        if (batch.length === 0) {
          hasMore = false;
          console.log('✅ No hay más canciones para cargar');
        } else {
          allTracks = [...allTracks, ...batch];
          savedTracks = allTracks; // Actualizar en tiempo real para ver progreso
          loadingProgress = allTracks.length;
          
          console.log(`📊 Progreso: ${allTracks.length} canciones cargadas`);
          
          if (batch.length < limit) {
            // Última página
            hasMore = false;
            console.log('✅ Última página cargada');
          } else {
            offset += limit;
          }
        }
      }
      
      console.log(`✅ Total cargado: ${allTracks.length} canciones`);
      savedTracks = allTracks;
      
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

  function playPreview(track: SpotifyTrack) {
    if (!track.preview_url) return;
    
    if (playingTrackId === track.id) {
      playingTrackId = null;
    } else {
      playingTrackId = track.id;
      // Aquí podrías reproducir el preview real con un Audio element
    }
  }
</script>

<div class="py-6">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-4xl font-bold text-white mb-2 flex items-center gap-3">
      <Heart class="text-pink-500" size={36} />
      Mis Canciones Favoritas
    </h1>
    <p class="text-gray-400">Tus canciones guardadas de Spotify</p>
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
    <div class="flex flex-col items-center justify-center py-20">
      <Loader2 class="animate-spin text-green-400 mb-4" size={48} />
      {#if loadingProgress > 0}
        <div class="text-center">
          <p class="text-white text-lg font-semibold mb-2">Cargando canciones...</p>
          <p class="text-green-400 text-2xl font-bold">{loadingProgress}</p>
          <p class="text-gray-400 text-sm">canciones cargadas</p>
        </div>
      {:else}
        <p class="text-gray-400">Cargando datos de Spotify...</p>
      {/if}
    </div>
  {:else}
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card.Root class="bg-linear-to-br from-pink-500/20 to-pink-700/20 border-pink-500/30">
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Canciones Guardadas</p>
              <p class="text-3xl font-bold text-white">{savedTracks.length}</p>
            </div>
            <Heart class="text-pink-400" size={32} />
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root class="bg-linear-to-br from-purple-500/20 to-purple-700/20 border-purple-500/30">
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Playlists</p>
              <p class="text-3xl font-bold text-white">{playlists.length}</p>
            </div>
            <Music class="text-purple-400" size={32} />
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root class="bg-linear-to-br from-blue-500/20 to-blue-700/20 border-blue-500/30">
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Duración Total</p>
              <p class="text-3xl font-bold text-white">{Math.floor(totalDuration / 3600000)}h</p>
            </div>
            <Clock class="text-blue-400" size={32} />
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root class="bg-linear-to-br from-green-500/20 to-green-700/20 border-green-500/30">
        <Card.Content class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Popularidad Promedio</p>
              <p class="text-3xl font-bold text-white">{averagePopularity}%</p>
            </div>
            <TrendingUp class="text-green-400" size={32} />
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <Button
        variant={activeView === 'liked' ? 'default' : 'ghost'}
        onclick={() => activeView = 'liked'}
        class={activeView === 'liked' ? 'bg-pink-500 hover:bg-pink-600' : 'text-gray-400 hover:text-white'}
      >
        <Heart size={18} class="mr-2" />
        Canciones Favoritas ({savedTracks.length})
      </Button>
      <Button
        variant={activeView === 'playlists' ? 'default' : 'ghost'}
        onclick={() => activeView = 'playlists'}
        class={activeView === 'playlists' ? 'bg-purple-500 hover:bg-purple-600' : 'text-gray-400 hover:text-white'}
      >
        <Music size={18} class="mr-2" />
        Mis Playlists ({playlists.length})
      </Button>
    </div>

    {#if error}
      <Card.Root class="bg-red-500/20 border-red-500/50 mb-6">
        <Card.Content class="p-4 flex items-center gap-3">
          <AlertCircle class="text-red-400" size={24} />
          <p class="text-red-400">{error}</p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Liked Songs View -->
    {#if activeView === 'liked'}
      <!-- Search Bar -->
      <div class="mb-4">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Buscar por canción, artista o álbum..."
          class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      <!-- Tracks Table -->
      <Card.Root class="bg-white/5 border-white/10">
        <Card.Content class="p-0">
          <div class="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row class="border-white/10 hover:bg-white/5">
                  <Table.Head class="w-12">#</Table.Head>
                  <Table.Head>
                    <button onclick={() => handleSort('name')} class="flex items-center gap-2 hover:text-white transition-colors">
                      Título {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </Table.Head>
                  <Table.Head>
                    <button onclick={() => handleSort('artist')} class="flex items-center gap-2 hover:text-white transition-colors">
                      Artista {sortBy === 'artist' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </Table.Head>
                  <Table.Head>
                    <button onclick={() => handleSort('album')} class="flex items-center gap-2 hover:text-white transition-colors">
                      Álbum {sortBy === 'album' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </Table.Head>
                  <Table.Head class="text-center">
                    <button onclick={() => handleSort('popularity')} class="flex items-center gap-2 hover:text-white transition-colors mx-auto">
                      Pop {sortBy === 'popularity' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </Table.Head>
                  <Table.Head class="text-right">
                    <button onclick={() => handleSort('duration')} class="flex items-center gap-2 hover:text-white transition-colors ml-auto">
                      <Clock size={14} />
                      {sortBy === 'duration' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-24"></Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each filteredTracks as track, i}
                  <Table.Row class="border-white/10 hover:bg-white/10 transition-colors group">
                    <Table.Cell class="font-medium text-gray-400">{i + 1}</Table.Cell>
                    <Table.Cell>
                      <div class="flex items-center gap-3">
                        <button
                          onclick={() => playPreview(track)}
                          disabled={!track.preview_url}
                          class="w-10 h-10 rounded bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                        >
                          {#if playingTrackId === track.id}
                            <Pause size={18} class="text-green-400" />
                          {:else}
                            <Play size={18} class="text-white" fill="white" />
                          {/if}
                        </button>
                        <div>
                          <p class="text-white font-medium">{track.name}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell class="text-gray-300">{track.artists.join(', ')}</Table.Cell>
                    <Table.Cell class="text-gray-400">{track.album}</Table.Cell>
                    <Table.Cell class="text-center">
                      {#if track.popularity !== null}
                        <span class="inline-flex items-center gap-1 {getPopularityColor(track.popularity)}">
                          <TrendingUp size={14} />
                          {track.popularity}
                        </span>
                      {:else}
                        <span class="text-gray-500">-</span>
                      {/if}
                    </Table.Cell>
                    <Table.Cell class="text-right text-gray-400">{formatDuration(track.duration_ms)}</Table.Cell>
                    <Table.Cell>
                      {#if track.external_url}
                        <a href={track.external_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" class="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={16} />
                          </Button>
                        </a>
                      {/if}
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  <Table.Row>
                    <Table.Cell colspan={7} class="text-center py-8 text-gray-400">
                      {searchQuery ? 'No se encontraron canciones' : 'No hay canciones guardadas'}
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Footer Info -->
      <div class="mt-4 text-center text-gray-500 text-sm">
        Mostrando {filteredTracks.length} de {savedTracks.length} canciones
      </div>
    {/if}

    <!-- Playlists View -->
    {#if activeView === 'playlists'}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {#each playlists as playlist}
          <Card.Root class="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
            <Card.Content class="p-0">
              <div class="aspect-square relative overflow-hidden">
                {#if playlist.images && playlist.images[0]}
                  <img src={playlist.images[0]} alt={playlist.name} class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <Music size={64} class="text-white/50" />
                  </div>
                {/if}
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <Button size="icon" class="opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 rounded-full bg-green-500 hover:bg-green-600 hover:scale-110">
                    <Play size={24} fill="white" />
                  </Button>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-white font-semibold text-lg mb-1 truncate">{playlist.name}</h3>
                <p class="text-gray-400 text-sm">Por {playlist.owner}</p>
                <p class="text-gray-500 text-xs mt-1">{playlist.tracks_total} canciones</p>
              </div>
            </Card.Content>
          </Card.Root>
        {:else}
          <div class="col-span-full text-center py-8 text-gray-400">
            No hay playlists disponibles
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
