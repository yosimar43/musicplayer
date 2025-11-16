<script lang="ts">
  import { onMount } from 'svelte';
  import { useSpotifyAuth, useSpotifyTracks, useSpotifyPlaylists, useDownload, useTrackFilters, type SpotifyTrackWithDownload } from '@/lib/hooks';
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Download, Play, Heart, Filter, Search, Loader2 } from 'lucide-svelte';
  import { fadeIn, staggerItems } from '@/lib/animations';
  import { player } from '@/lib/state';

  // Hooks de Spotify
  const auth = useSpotifyAuth();
  const tracks = useSpotifyTracks();
  const playlists = useSpotifyPlaylists();
  const download = useDownload();
  const filters = useTrackFilters(() => searchQuery);

  let searchQuery = $state('');
  let selectedPlaylist = $state<string | null>(null);

  // Tracks ya sincronizados automáticamente por el hook
  let allTracks = $derived(tracks.tracks as SpotifyTrackWithDownload[]);
  let filteredTracks = $derived(filters.filterAndSortTracks(allTracks));

  onMount(async () => {
    // Verificar autenticación
    const isAuth = await auth.checkAuth();
    if (isAuth) {
      // Configurar listeners y cargar datos
      await tracks.setupEventListeners();
      await download.setupEventListeners();

      await tracks.loadTracks();
      await playlists.loadPlaylists();
    }

    // Animaciones
    fadeIn('.page-header');
    setTimeout(() => staggerItems('.track-card'), 200);
  });

  async function handleDownloadTrack(track: any) {
    await download.downloadTrack(track);
  }

  async function handleDownloadAll() {
    await download.downloadTracks(filteredTracks);
  }

  function playTrack(track: any) {
    // Aquí iría la lógica para reproducir desde Spotify
    // Por ahora solo marcamos como "reproduciendo"
    console.log('🎵 Reproduciendo:', track.name);
  }

  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
</script>

<div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between page-header">
    <div>
      <h1 class="text-3xl font-bold text-white">Spotify Playlists</h1>
      <p class="mt-1 text-gray-400">
        {#if auth.isAuthenticated}
          Connected to Spotify • {tracks.totalTracks} tracks loaded
        {:else}
          Connect to Spotify to view your music
        {/if}
      </p>
    </div>

    {#if auth.isAuthenticated}
      <div class="flex gap-2">
        <Button onclick={handleDownloadAll} disabled={download.isDownloading}>
          {#if download.isDownloading}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Downloading...
          {:else}
            <Download class="w-4 h-4 mr-2" />
            Download All
          {/if}
        </Button>
      </div>
    {/if}
  </div>

  <!-- Authentication Required -->
  {#if !auth.isAuthenticated}
    <Card.Root class="bg-white/5 border-white/10">
      <Card.Content class="p-8 text-center">
        <div class="mb-4">
          <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20">
            <Heart class="w-8 h-8 text-green-400" />
          </div>
          <h3 class="mb-2 text-xl font-semibold text-white">Connect to Spotify</h3>
          <p class="mb-6 text-gray-400">Access your liked songs and playlists</p>
        </div>
        <Button onclick={auth.authenticate} disabled={auth.isLoading}>
          {#if auth.isLoading}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          {:else}
            Connect Spotify
          {/if}
        </Button>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Search and Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1">
        <Search class="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
        <input
          bind:value={searchQuery}
          placeholder="Search tracks..."
          class="w-full py-2 pl-10 pr-4 text-white placeholder-gray-400 border rounded-lg bg-white/10 border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>
      <Button variant="outline" onclick={() => filters.handleSort('name')}>
        Sort by {filters.sortBy} ({filters.sortOrder})
      </Button>
    </div>

    <!-- Loading State -->
    {#if tracks.isLoading}
      <div class="py-12 text-center">
        <Loader2 class="w-8 h-8 mx-auto mb-4 animate-spin text-cyan-400" />
        <p class="text-gray-400">Loading your Spotify tracks... ({tracks.loadingProgress}%)</p>
      </div>
    {:else if filteredTracks.length > 0}
      <!-- Tracks Grid -->
      <div class="grid gap-3">
        {#each filteredTracks as track}
          <Card.Root class="transition-colors track-card bg-white/5 border-white/10 hover:bg-white/10">
            <Card.Content class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center flex-1 min-w-0 gap-4">
                  <!-- Album Art -->
                  <div class="flex items-center justify-center w-12 h-12 bg-gray-700 rounded shrink-0">
                    {#if track.album_image}
                      <img
                        src={track.album_image}
                        alt={track.album}
                        class="object-cover w-full h-full rounded"
                      />
                    {:else}
                      <Play class="w-6 h-6 text-gray-400" />
                    {/if}
                  </div>

                  <!-- Track Info -->
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-white truncate">{track.name}</h3>
                    <p class="text-sm text-gray-400 truncate">
                      {track.artists.join(', ')}
                      {#if track.album}
                        • {track.album}
                      {/if}
                    </p>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <span class="font-mono text-sm text-gray-400">
                    {formatDuration(track.duration_ms)}
                  </span>

                  {#if track.isDownloaded}
                    <div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20">
                      <Heart class="w-4 h-4 text-green-400" />
                    </div>
                  {/if}

                  <Button size="sm" variant="ghost" onclick={() => playTrack(track)}>
                    <Play class="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => handleDownloadTrack(track)}
                    disabled={download.downloads.some(d => d.trackId === track.id)}
                  >
                    <Download class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

      <!-- Stats -->
      <div class="text-sm text-center text-gray-500">
        Showing {filteredTracks.length} of {tracks.totalTracks} tracks
        {#if download.stats.completed > 0}
          • {download.stats.completed} downloaded
        {/if}
      </div>
    {:else}
      <div class="py-12 text-center text-gray-400">
        <p>No tracks found. Try adjusting your search or filters.</p>
      </div>
    {/if}
  {/if}
</div>