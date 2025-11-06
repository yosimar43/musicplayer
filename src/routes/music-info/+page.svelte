<script lang="ts">
  import { musicData } from '@/lib/stores/musicData.svelte';
  import { player } from '@/lib/state';
  import ArtistInfo from '@/components/ArtistInfo.svelte';
  import AlbumInfo from '@/components/AlbumInfo.svelte';
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";

  // Artista y álbum actuales (desde el player)
  let currentArtist = $derived(player.current?.artist || '');
  let currentAlbum = $derived(player.current?.album || '');
  let currentTrack = $derived(player.current?.title || '');

  // Para búsqueda manual
  let searchArtist = $state('');
  let searchAlbum = $state('');
  let selectedArtist = $state('');
  let selectedAlbum = $state('');

  function handleSearchArtist() {
    if (searchArtist.trim()) {
      selectedArtist = searchArtist.trim();
    }
  }

  function handleSearchAlbum() {
    if (searchArtist.trim() && searchAlbum.trim()) {
      selectedArtist = searchArtist.trim();
      selectedAlbum = searchAlbum.trim();
    }
  }

  function loadCurrentTrackInfo() {
    if (currentArtist) {
      selectedArtist = currentArtist;
      if (currentAlbum) {
        selectedAlbum = currentAlbum;
      }
    }
  }

  // Estadísticas del cache
  let cacheStats = $derived(musicData.getCacheStats());
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-white">Información Musical</h1>
      <p class="text-gray-400 mt-1">Datos enriquecidos de Last.fm</p>
    </div>
    
    <!-- Estadísticas del cache -->
    <div class="text-right">
      <p class="text-sm text-gray-400">Cache: {cacheStats.total} elementos</p>
      <Button 
        variant="ghost" 
        size="sm"
        onclick={() => musicData.clearCache()}
        class="text-xs text-gray-500 hover:text-white"
      >
        Limpiar cache
      </Button>
    </div>
  </div>

  <!-- Canción actual -->
  {#if currentArtist || currentAlbum}
    <Card.Root class="bg-linear-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
      <Card.Content class="p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-400 mb-1">Ahora reproduciendo</p>
            <h3 class="text-lg font-semibold text-white">{currentTrack}</h3>
            <p class="text-gray-300">{currentArtist}{currentAlbum ? ` • ${currentAlbum}` : ''}</p>
          </div>
          <Button onclick={loadCurrentTrackInfo}>
            Ver información
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Búsqueda manual -->
  <Card.Root class="bg-white/5 border-white/10">
    <Card.Header>
      <Card.Title>Buscar información</Card.Title>
      <Card.Description>Ingresa el nombre de un artista o álbum</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Buscar artista -->
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={searchArtist}
          placeholder="Nombre del artista"
          class="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          onkeydown={(e) => e.key === 'Enter' && handleSearchArtist()}
        />
        <Button onclick={handleSearchArtist}>
          Buscar Artista
        </Button>
      </div>

      <!-- Buscar álbum -->
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={searchAlbum}
          placeholder="Nombre del álbum (opcional)"
          class="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          onkeydown={(e) => e.key === 'Enter' && handleSearchAlbum()}
        />
        <Button onclick={handleSearchAlbum} disabled={!searchArtist.trim()}>
          Buscar Álbum
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Resultados -->
  <div class="grid gap-6">
    <!-- Información del artista -->
    {#if selectedArtist && !selectedAlbum}
      <ArtistInfo artistName={selectedArtist} />
    {/if}

    <!-- Información del álbum -->
    {#if selectedArtist && selectedAlbum}
      <AlbumInfo artistName={selectedArtist} albumName={selectedAlbum} />
    {/if}
  </div>

  <!-- Ejemplos predefinidos -->
  {#if !selectedArtist}
    <Card.Root class="bg-white/5 border-white/10">
      <Card.Header>
        <Card.Title>Ejemplos</Card.Title>
        <Card.Description>Prueba con estos artistas populares</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-wrap gap-2">
          {#each ['The Beatles', 'Pink Floyd', 'Led Zeppelin', 'Queen', 'Radiohead', 'Nirvana'] as artist}
            <Button 
              variant="outline"
              size="sm"
              onclick={() => {
                searchArtist = artist;
                handleSearchArtist();
              }}
            >
              {artist}
            </Button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<style>
  input:focus {
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
  }
</style>
