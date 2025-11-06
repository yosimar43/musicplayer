<script lang="ts">
  import type { ProcessedArtistInfo } from '@/lib/types/lastfm';
  import { musicData } from '@/lib/stores/musicData.svelte';
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { onMount } from 'svelte';

  let { artistName = '' }: { artistName: string } = $props();
  
  let artistInfo = $state<ProcessedArtistInfo | null>(null);
  let showFullBio = $state(false);

  // Cargar información del artista
  async function loadArtistInfo() {
    if (!artistName) return;
    artistInfo = await musicData.getArtist(artistName);
  }

  // Cargar al montar o cuando cambie el artista
  $effect(() => {
    if (artistName) {
      loadArtistInfo();
    }
  });

  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
</script>

{#if musicData.loading.artist}
  <div class="flex items-center justify-center p-8">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
  </div>
{:else if musicData.errors.artist}
  <Card.Root class="bg-red-500/10 border-red-500/50">
    <Card.Content class="p-4">
      <p class="text-red-400">❌ Error: {musicData.errors.artist}</p>
    </Card.Content>
  </Card.Root>
{:else if artistInfo}
  <Card.Root class="bg-white/5 border-white/10 overflow-hidden">
    <Card.Content class="p-0">
      <!-- Header con imagen -->
      <div class="relative h-48 bg-linear-to-br from-purple-900 to-pink-900">
        {#if artistInfo.image}
          <img 
            src={artistInfo.image} 
            alt={artistInfo.name}
            class="w-full h-full object-cover opacity-60"
          />
          <div class="absolute inset-0 bg-linear-to-t from-black/80 to-transparent"></div>
        {/if}
        
        <div class="absolute bottom-4 left-4 right-4">
          <h2 class="text-3xl font-bold text-white mb-2">{artistInfo.name}</h2>
          <div class="flex gap-4 text-sm text-gray-300">
            <span>👥 {formatNumber(artistInfo.listeners)} oyentes</span>
            <span>▶️ {formatNumber(artistInfo.playcount)} reproducciones</span>
          </div>
        </div>
      </div>

      <!-- Contenido -->
      <div class="p-6 space-y-4">
        <!-- Tags/Géneros -->
        {#if artistInfo.tags.length > 0}
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-2">Géneros</h3>
            <div class="flex flex-wrap gap-2">
              {#each artistInfo.tags as tag}
                <span class="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                  {tag}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Biografía -->
        {#if artistInfo.bio}
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-2">Biografía</h3>
            <p class="text-gray-300 text-sm leading-relaxed">
              {showFullBio ? artistInfo.bioFull : artistInfo.bio}
            </p>
            {#if artistInfo.bioFull && artistInfo.bioFull !== artistInfo.bio}
              <Button 
                variant="ghost" 
                size="sm" 
                class="mt-2 text-purple-400 hover:text-purple-300"
                onclick={() => showFullBio = !showFullBio}
              >
                {showFullBio ? 'Ver menos' : 'Ver más'}
              </Button>
            {/if}
          </div>
        {/if}

        <!-- Enlace a Last.fm -->
        <div class="pt-4 border-t border-white/10">
          <a 
            href={artistInfo.url} 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
          >
            Ver más en Last.fm
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
{:else if artistName}
  <Card.Root class="bg-white/5 border-white/10">
    <Card.Content class="p-8 text-center">
      <p class="text-gray-400">No se encontró información para "{artistName}"</p>
    </Card.Content>
  </Card.Root>
{/if}
