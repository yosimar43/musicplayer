<script lang="ts">
  import type { ProcessedAlbumInfo } from '@/lib/types/lastfm';
  import { musicData } from '@/lib/stores/musicData.svelte';
  import * as Card from "$lib/components/ui/card";

  let { 
    artistName = '', 
    albumName = '',
    compact = false 
  }: { 
    artistName: string; 
    albumName: string;
    compact?: boolean;
  } = $props();
  
  let albumInfo = $state<ProcessedAlbumInfo | null>(null);

  // Cargar información del álbum
  $effect(() => {
    if (artistName && albumName) {
      musicData.getAlbum(artistName, albumName).then(data => {
        albumInfo = data;
      });
    }
  });

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
</script>

{#if musicData.loading.album}
  <div class="flex items-center justify-center p-4">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
  </div>
{:else if albumInfo}
  {#if compact}
    <!-- Vista compacta (para cards pequeñas) -->
    <div class="flex gap-3">
      {#if albumInfo.image}
        <img 
          src={albumInfo.image} 
          alt={albumInfo.name}
          class="w-16 h-16 rounded-lg object-cover"
        />
      {:else}
        <div class="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <span class="text-2xl">💿</span>
        </div>
      {/if}
      
      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-white truncate">{albumInfo.name}</h4>
        <p class="text-sm text-gray-400 truncate">{albumInfo.artist}</p>
        {#if albumInfo.tags.length > 0}
          <div class="flex gap-1 mt-1">
            {#each albumInfo.tags.slice(0, 2) as tag}
              <span class="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                {tag}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Vista completa -->
    <Card.Root class="bg-white/5 border-white/10 overflow-hidden">
      <Card.Content class="p-0">
        <div class="flex gap-6 p-6">
          <!-- Portada del álbum -->
          <div class="shrink-0">
            {#if albumInfo.image}
              <img 
                src={albumInfo.image} 
                alt={albumInfo.name}
                class="w-48 h-48 rounded-lg object-cover shadow-2xl"
              />
            {:else}
              <div class="w-48 h-48 rounded-lg bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span class="text-6xl">💿</span>
              </div>
            {/if}
          </div>

          <!-- Información -->
          <div class="flex-1 min-w-0">
            <div class="mb-4">
              <h2 class="text-3xl font-bold text-white mb-1">{albumInfo.name}</h2>
              <p class="text-xl text-gray-300">{albumInfo.artist}</p>
            </div>

            <!-- Stats -->
            <div class="flex gap-6 text-sm text-gray-400 mb-4">
              {#if albumInfo.trackCount > 0}
                <span>🎵 {albumInfo.trackCount} canciones</span>
              {/if}
              {#if albumInfo.listeners > 0}
                <span>👥 {formatNumber(albumInfo.listeners)} oyentes</span>
              {/if}
              {#if albumInfo.playcount > 0}
                <span>▶️ {formatNumber(albumInfo.playcount)} reproducciones</span>
              {/if}
            </div>

            <!-- Tags -->
            {#if albumInfo.tags.length > 0}
              <div class="mb-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Géneros</h3>
                <div class="flex flex-wrap gap-2">
                  {#each albumInfo.tags as tag}
                    <span class="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                      {tag}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Resumen -->
            {#if albumInfo.summary}
              <div class="mb-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Acerca del álbum</h3>
                <p class="text-sm text-gray-300 leading-relaxed">{albumInfo.summary}</p>
              </div>
            {/if}

            <!-- Enlace -->
            <a 
              href={albumInfo.url} 
              target="_blank" 
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
            >
              Ver en Last.fm
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
{/if}
