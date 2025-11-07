<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Music, User, Heart, TrendingUp, Clock, Play, Loader2, LogOut } from "lucide-svelte";

  // =============================================
  // TIPOS - Copiados directamente desde Rust
  // =============================================
  
  interface SpotifyUserProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    country: string | null;
    product: string | null;
    followers: number;
    images: string[];
  }

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

  interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: number;
    images: string[];
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

  // =============================================
  // ESTADO DE LA APLICACIÓN
  // =============================================
  
  let isAuthenticated = $state(false);
  let isLoading = $state(false);
  let profile = $state<SpotifyUserProfile | null>(null);
  let allLikedSongs = $state<SpotifyTrack[]>([]);
  let topArtistsShort = $state<SpotifyArtist[]>([]);
  let topArtistsMedium = $state<SpotifyArtist[]>([]);
  let topTracksShort = $state<SpotifyTrack[]>([]);
  let topTracksMedium = $state<SpotifyTrack[]>([]);
  let playlists = $state<SpotifyPlaylist[]>([]);
  let activeTab = $state<'overview' | 'artists' | 'tracks' | 'playlists'>('overview');

  // =============================================
  // LIFECYCLE
  // =============================================
  
  onMount(async () => {
    await checkAuthentication();
  });

  // =============================================
  // FUNCIONES DE AUTENTICACIÓN
  // =============================================
  
  async function checkAuthentication() {
    try {
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      if (isAuthenticated) {
        await loadAllData();
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
    }
  }

  async function authenticate() {
    isLoading = true;
    try {
      await invoke('spotify_authenticate');
      isAuthenticated = true;
      await loadAllData();
    } catch (error) {
      console.error('❌ Error authenticating:', error);
      alert(`Error de autenticación: ${error}`);
    } finally {
      isLoading = false;
    }
  }

  async function logout() {
    try {
      await invoke('spotify_logout');
      isAuthenticated = false;
      profile = null;
      allLikedSongs = [];
      topArtistsShort = [];
      topArtistsMedium = [];
      topTracksShort = [];
      topTracksMedium = [];
      playlists = [];
    } catch (error) {
      console.error('❌ Error logging out:', error);
    }
  }

  // =============================================
  // FUNCIONES DE CARGA DE DATOS
  // =============================================
  
  async function loadAllData() {
    isLoading = true;
    try {
      await Promise.all([
        loadProfile(),
        loadPlaylists(),
        loadTopArtists(),
        loadTopTracks(),
      ]);
      // Cargar liked songs al final porque puede tardar más
      await loadAllLikedSongs();
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadProfile() {
    try {
      profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
      console.log('✅ Perfil cargado:', profile?.display_name);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
    }
  }

  async function loadAllLikedSongs() {
    try {
      console.log('🎵 Cargando TODAS las canciones guardadas...');
      allLikedSongs = await invoke<SpotifyTrack[]>('spotify_get_all_liked_songs');
      console.log(`✅ ${allLikedSongs.length} canciones cargadas!`);
    } catch (error) {
      console.error('❌ Error loading liked songs:', error);
    }
  }

  async function loadTopArtists() {
    try {
      const [shortTerm, mediumTerm] = await Promise.all([
        invoke<SpotifyArtist[]>('spotify_get_top_artists', {
          time_range: 'short_term',
          limit: 10
        }),
        invoke<SpotifyArtist[]>('spotify_get_top_artists', {
          time_range: 'medium_term',
          limit: 20
        })
      ]);
      topArtistsShort = shortTerm;
      topArtistsMedium = mediumTerm;
      console.log('✅ Top artistas cargados');
    } catch (error) {
      console.error('❌ Error loading top artists:', error);
    }
  }

  async function loadTopTracks() {
    try {
      const [shortTerm, mediumTerm] = await Promise.all([
        invoke<SpotifyTrack[]>('spotify_get_top_tracks', {
          time_range: 'short_term',
          limit: 10
        }),
        invoke<SpotifyTrack[]>('spotify_get_top_tracks', {
          time_range: 'medium_term',
          limit: 20
        })
      ]);
      topTracksShort = shortTerm;
      topTracksMedium = mediumTerm;
      console.log('✅ Top canciones cargadas');
    } catch (error) {
      console.error('❌ Error loading top tracks:', error);
    }
  }

  async function loadPlaylists() {
    try {
      playlists = await invoke<SpotifyPlaylist[]>('spotify_get_playlists', {
        limit: 50
      });
      console.log('✅ Playlists cargadas');
    } catch (error) {
      console.error('❌ Error loading playlists:', error);
    }
  }

  // =============================================
  // UTILIDADES
  // =============================================
  
  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatFollowers(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  // =============================================
  // COMPUTED VALUES
  // =============================================
  
  let totalDuration = $derived(
    allLikedSongs.reduce((sum, track) => sum + track.duration_ms, 0)
  );

  let totalHours = $derived(Math.floor(totalDuration / 3600000));
  let totalMinutes = $derived(Math.floor((totalDuration % 3600000) / 60000));

  let avgPopularity = $derived(
    allLikedSongs.length > 0
      ? Math.round(allLikedSongs.reduce((sum, t) => sum + (t.popularity || 0), 0) / allLikedSongs.length)
      : 0
  );
</script>

<div class="min-h-screen bg-linear-to-br from-green-900 via-black to-black p-6">
  <div class="max-w-7xl mx-auto">
    
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-5xl font-bold text-white mb-2 flex items-center gap-4">
        <Music class="text-green-400" size={48} />
        Spotify Complete Integration
      </h1>
      <p class="text-gray-400 text-lg">Demostración completa de todos los comandos de la API</p>
    </div>

    {#if !isAuthenticated}
      <!-- LOGIN VIEW -->
      <Card.Root class="bg-white/5 border-white/10 backdrop-blur">
        <Card.Content class="p-12 text-center">
          <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music class="text-green-400" size={60} />
          </div>
          <h2 class="text-3xl font-bold text-white mb-4">Conecta tu cuenta de Spotify</h2>
          <p class="text-gray-400 mb-8 max-w-md mx-auto">
            Esta demo mostrará tu perfil, canciones guardadas, artistas favoritos, 
            top tracks y playlists usando la integración completa con RSpotify
          </p>
          <Button 
            onclick={authenticate}
            disabled={isLoading}
            class="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg rounded-full"
          >
            {#if isLoading}
              <Loader2 class="animate-spin mr-2" size={24} />
              Conectando...
            {:else}
              <Music class="mr-2" size={24} />
              Conectar con Spotify
            {/if}
          </Button>
        </Card.Content>
      </Card.Root>

    {:else if isLoading}
      <!-- LOADING VIEW -->
      <div class="flex flex-col items-center justify-center py-20">
        <Loader2 class="animate-spin text-green-400 mb-6" size={64} />
        <p class="text-white text-xl font-semibold mb-2">Cargando tus datos de Spotify...</p>
        <p class="text-gray-400">Esto puede tomar unos segundos</p>
      </div>

    {:else}
      <!-- MAIN CONTENT -->
      
      <!-- User Profile Header -->
      {#if profile}
        <Card.Root class="bg-linear-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 backdrop-blur mb-8">
          <Card.Content class="p-6">
            <div class="flex items-center gap-6">
              {#if profile.images && profile.images[0]}
                <img 
                  src={profile.images[0]} 
                  alt={profile.display_name || 'User'}
                  class="w-24 h-24 rounded-full border-4 border-green-400"
                />
              {:else}
                <div class="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                  <User class="text-white" size={48} />
                </div>
              {/if}
              <div class="flex-1">
                <h2 class="text-3xl font-bold text-white mb-2">{profile.display_name || 'Usuario'}</h2>
                <div class="flex flex-wrap gap-4 text-gray-300">
                  {#if profile.product}
                    <span class="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                      {profile.product.toUpperCase()}
                    </span>
                  {/if}
                  {#if profile.country}
                    <span>🌍 {profile.country}</span>
                  {/if}
                  <span>👥 {profile.followers.toLocaleString()} seguidores</span>
                </div>
              </div>
              <Button 
                onclick={logout}
                variant="outline"
                class="border-white/20 text-white hover:bg-white/10"
              >
                <LogOut size={18} class="mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card.Root class="bg-linear-to-br from-pink-500/20 to-pink-700/20 border-pink-500/30 backdrop-blur">
          <Card.Content class="p-6">
            <div class="flex items-center justify-between mb-4">
              <Heart class="text-pink-400" size={32} />
              <span class="text-4xl">💖</span>
            </div>
            <p class="text-gray-400 text-sm mb-1">Canciones Guardadas</p>
            <p class="text-4xl font-bold text-white">{allLikedSongs.length.toLocaleString()}</p>
            <p class="text-gray-500 text-xs mt-2">
              {totalHours}h {totalMinutes}m de música
            </p>
          </Card.Content>
        </Card.Root>

        <Card.Root class="bg-linear-to-br from-purple-500/20 to-purple-700/20 border-purple-500/30 backdrop-blur">
          <Card.Content class="p-6">
            <div class="flex items-center justify-between mb-4">
              <Music class="text-purple-400" size={32} />
              <span class="text-4xl">🎵</span>
            </div>
            <p class="text-gray-400 text-sm mb-1">Playlists</p>
            <p class="text-4xl font-bold text-white">{playlists.length}</p>
            <p class="text-gray-500 text-xs mt-2">
              {playlists.reduce((sum, p) => sum + p.tracks_total, 0).toLocaleString()} canciones total
            </p>
          </Card.Content>
        </Card.Root>

        <Card.Root class="bg-linear-to-br from-blue-500/20 to-blue-700/20 border-blue-500/30 backdrop-blur">
          <Card.Content class="p-6">
            <div class="flex items-center justify-between mb-4">
              <TrendingUp class="text-blue-400" size={32} />
              <span class="text-4xl">📊</span>
            </div>
            <p class="text-gray-400 text-sm mb-1">Popularidad Promedio</p>
            <p class="text-4xl font-bold text-white">{avgPopularity}%</p>
            <p class="text-gray-500 text-xs mt-2">
              De tus canciones guardadas
            </p>
          </Card.Content>
        </Card.Root>

        <Card.Root class="bg-linear-to-br from-green-500/20 to-green-700/20 border-green-500/30 backdrop-blur">
          <Card.Content class="p-6">
            <div class="flex items-center justify-between mb-4">
              <Music class="text-green-400" size={32} />
              <span class="text-4xl">🎤</span>
            </div>
            <p class="text-gray-400 text-sm mb-1">Top Artistas</p>
            <p class="text-4xl font-bold text-white">{topArtistsMedium.length}</p>
            <p class="text-gray-500 text-xs mt-2">
              Últimos 6 meses
            </p>
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onclick={() => activeTab = 'overview'}
          class={activeTab === 'overview' ? 'bg-green-500 hover:bg-green-600' : 'text-gray-400 hover:text-white'}
        >
          📊 Overview
        </Button>
        <Button
          variant={activeTab === 'artists' ? 'default' : 'ghost'}
          onclick={() => activeTab = 'artists'}
          class={activeTab === 'artists' ? 'bg-purple-500 hover:bg-purple-600' : 'text-gray-400 hover:text-white'}
        >
          🎤 Top Artistas
        </Button>
        <Button
          variant={activeTab === 'tracks' ? 'default' : 'ghost'}
          onclick={() => activeTab = 'tracks'}
          class={activeTab === 'tracks' ? 'bg-pink-500 hover:bg-pink-600' : 'text-gray-400 hover:text-white'}
        >
          🎵 Top Canciones
        </Button>
        <Button
          variant={activeTab === 'playlists' ? 'default' : 'ghost'}
          onclick={() => activeTab = 'playlists'}
          class={activeTab === 'playlists' ? 'bg-blue-500 hover:bg-blue-600' : 'text-gray-400 hover:text-white'}
        >
          📋 Playlists
        </Button>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        
        {#if activeTab === 'overview'}
          <!-- Overview: Mix de todo -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- Top 5 Artists Short Term -->
            <Card.Root class="bg-white/5 border-white/10 backdrop-blur">
              <Card.Header>
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp class="text-green-400" />
                  Tus Top 5 Artistas (Último Mes)
                </h3>
              </Card.Header>
              <Card.Content class="space-y-4">
                {#each topArtistsShort.slice(0, 5) as artist, index}
                  <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <span class="text-2xl font-bold text-green-400 w-8">#{index + 1}</span>
                    {#if artist.images && artist.images[0]}
                      <img src={artist.images[0]} alt={artist.name} class="w-16 h-16 rounded-full object-cover" />
                    {/if}
                    <div class="flex-1">
                      <p class="text-white font-semibold">{artist.name}</p>
                      <p class="text-gray-400 text-sm">{artist.genres.slice(0, 2).join(', ')}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-green-400 font-semibold">{artist.popularity}%</p>
                      <p class="text-gray-500 text-xs">{formatFollowers(artist.followers)}</p>
                    </div>
                  </div>
                {/each}
              </Card.Content>
            </Card.Root>

            <!-- Top 5 Tracks Short Term -->
            <Card.Root class="bg-white/5 border-white/10 backdrop-blur">
              <Card.Header>
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                  <Music class="text-pink-400" />
                  Tus Top 5 Canciones (Último Mes)
                </h3>
              </Card.Header>
              <Card.Content class="space-y-4">
                {#each topTracksShort.slice(0, 5) as track, index}
                  <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <span class="text-2xl font-bold text-pink-400 w-8">#{index + 1}</span>
                    {#if track.album_image}
                      <img src={track.album_image} alt={track.album} class="w-16 h-16 rounded object-cover" />
                    {/if}
                    <div class="flex-1">
                      <p class="text-white font-semibold">{track.name}</p>
                      <p class="text-gray-400 text-sm">{track.artists.join(', ')}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-pink-400 font-semibold">{track.popularity}%</p>
                      <p class="text-gray-500 text-xs">{formatDuration(track.duration_ms)}</p>
                    </div>
                  </div>
                {/each}
              </Card.Content>
            </Card.Root>

          </div>
        {/if}

        {#if activeTab === 'artists'}
          <!-- Top Artists Medium Term -->
          <Card.Root class="bg-white/5 border-white/10 backdrop-blur">
            <Card.Header>
              <h3 class="text-2xl font-bold text-white flex items-center gap-2">
                🎤 Tus Top {topArtistsMedium.length} Artistas (Últimos 6 meses)
              </h3>
            </Card.Header>
            <Card.Content>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each topArtistsMedium as artist, index}
                  <div class="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer group">
                    <div class="relative mb-3">
                      {#if artist.images && artist.images[0]}
                        <img 
                          src={artist.images[0]} 
                          alt={artist.name}
                          class="w-full aspect-square object-cover rounded-lg"
                        />
                      {/if}
                      <span class="absolute top-2 left-2 bg-purple-500 text-white font-bold text-lg px-3 py-1 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                    <h4 class="text-white font-bold text-lg mb-1">{artist.name}</h4>
                    <p class="text-gray-400 text-sm mb-2">{artist.genres.slice(0, 2).join(', ')}</p>
                    <div class="flex justify-between text-sm">
                      <span class="text-green-400">⭐ {artist.popularity}/100</span>
                      <span class="text-gray-400">👥 {formatFollowers(artist.followers)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        {#if activeTab === 'tracks'}
          <!-- Top Tracks Medium Term -->
          <Card.Root class="bg-white/5 border-white/10 backdrop-blur">
            <Card.Header>
              <h3 class="text-2xl font-bold text-white flex items-center gap-2">
                🎵 Tus Top {topTracksMedium.length} Canciones (Últimos 6 meses)
              </h3>
            </Card.Header>
            <Card.Content>
              <div class="space-y-2">
                {#each topTracksMedium as track, index}
                  <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors group">
                    <span class="text-xl font-bold text-pink-400 w-10 text-center">#{index + 1}</span>
                    {#if track.album_image}
                      <img src={track.album_image} alt={track.album} class="w-14 h-14 rounded object-cover" />
                    {/if}
                    <div class="flex-1 min-w-0">
                      <p class="text-white font-semibold truncate">{track.name}</p>
                      <p class="text-gray-400 text-sm truncate">{track.artists.join(', ')}</p>
                      <p class="text-gray-500 text-xs truncate">{track.album}</p>
                    </div>
                    <div class="flex items-center gap-4">
                      <span class="text-green-400 font-semibold">⭐ {track.popularity}</span>
                      <span class="text-gray-400">{formatDuration(track.duration_ms)}</span>
                      {#if track.external_url}
                        <a href={track.external_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" class="opacity-0 group-hover:opacity-100">
                            <Play size={16} />
                          </Button>
                        </a>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        {#if activeTab === 'playlists'}
          <!-- Playlists Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each playlists as playlist}
              <Card.Root class="bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-all cursor-pointer group">
                <Card.Content class="p-0">
                  <div class="relative aspect-square overflow-hidden">
                    {#if playlist.images && playlist.images[0]}
                      <img 
                        src={playlist.images[0]} 
                        alt={playlist.name}
                        class="w-full h-full object-cover"
                      />
                    {:else}
                      <div class="w-full h-full bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                        <Music size={64} class="text-white/50" />
                      </div>
                    {/if}
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Button 
                        size="icon" 
                        class="opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 rounded-full bg-green-500 hover:bg-green-600"
                      >
                        <Play size={24} fill="white" />
                      </Button>
                    </div>
                  </div>
                  <div class="p-4">
                    <h4 class="text-white font-bold text-lg mb-1 truncate">{playlist.name}</h4>
                    <p class="text-gray-400 text-sm mb-2">Por {playlist.owner}</p>
                    <p class="text-gray-500 text-xs">{playlist.tracks_total.toLocaleString()} canciones</p>
                  </div>
                </Card.Content>
              </Card.Root>
            {/each}
          </div>
        {/if}

      </div>

      <!-- Footer Info -->
      <div class="mt-8 text-center text-gray-500 text-sm">
        <p>✨ Integración completa con Spotify usando RSpotify</p>
        <p class="mt-1">
          Todos los comandos funcionando: 
          <span class="text-green-400">spotify_authenticate</span>, 
          <span class="text-green-400">spotify_get_profile</span>, 
          <span class="text-green-400">spotify_get_all_liked_songs</span>, 
          <span class="text-green-400">spotify_get_top_artists</span>, 
          <span class="text-green-400">spotify_get_top_tracks</span>, 
          <span class="text-green-400">spotify_get_playlists</span>
        </p>
      </div>

    {/if}
  </div>
</div>
