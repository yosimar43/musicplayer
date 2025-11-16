<script lang="ts">
  import { onMount } from 'svelte';
  import { selectMusicFolder } from '@/lib/utils/musicLibrary';
  import { TauriCommands } from '@/lib/utils/tauriCommands';
  import type { MusicFile } from '@/lib/types/music';
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { fadeIn, staggerItems } from '@/lib/animations';

  const { getDefaultMusicFolder, scanMusicFolder } = TauriCommands;

  let musicFiles: MusicFile[] = $state([]);
  let currentFolder: string = $state('');
  let isLoading: boolean = $state(false);
  let error: string | null = $state(null);

  onMount(async () => {
    try {
      currentFolder = await getDefaultMusicFolder();
      
      // Animar elementos de la UI
      setTimeout(() => {
        fadeIn('.music-library-header', { delay: 100 });
        fadeIn('.folder-controls', { delay: 200 });
      }, 50);
    } catch (e) {
      console.error('Could not get default music folder:', e);
    }
  });
  
  // Animar tracks cuando se cargan
  $effect(() => {
    if (musicFiles.length > 0) {
      setTimeout(() => {
        staggerItems('.music-track-card', { staggerDelay: 50 });
      }, 100);
    }
  });

  async function loadMusicFromFolder() {
    if (!currentFolder) return;
    
    isLoading = true;
    error = null;
    
    try {
      musicFiles = await scanMusicFolder(currentFolder);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to scan folder';
    } finally {
      isLoading = false;
    }
  }

  async function chooseMusicFolder() {
    const selected = await selectMusicFolder();
    if (selected) {
      currentFolder = selected;
      await loadMusicFromFolder();
    }
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between music-library-header">
    <div>
      <h1 class="text-3xl font-bold text-white">Music Library</h1>
      <p class="text-gray-400 mt-1">{currentFolder || 'No folder selected'}</p>
    </div>
    <div class="flex gap-2 folder-controls">
      <Button onclick={chooseMusicFolder}>
        Select Folder
      </Button>
      <Button onclick={loadMusicFromFolder} disabled={!currentFolder || isLoading}>
        {isLoading ? 'Scanning...' : 'Scan Music'}
      </Button>
    </div>
  </div>

  {#if error}
    <div class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
      {error}
    </div>
  {/if}

  {#if isLoading}
    <div class="text-center py-12 text-gray-400">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
      <p class="mt-4">Scanning music files...</p>
    </div>
  {:else if musicFiles.length > 0}
    <div class="grid gap-3">
      {#each musicFiles as file}
        <Card.Root class="bg-white/5 border-white/10 hover:bg-white/10 transition-colors music-track-card">
          <Card.Content class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="text-white font-medium truncate">
                  {file.title || 'Unknown Title'}
                </h3>
                <p class="text-gray-400 text-sm truncate">
                  {file.artist || 'Unknown Artist'} 
                  {#if file.album}
                    • {file.album}
                  {/if}
                </p>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                {#if file.year}
                  <span class="text-gray-500 text-sm">{file.year}</span>
                {/if}
                <span class="text-gray-400 text-sm font-mono">
                  {formatDuration(file.duration)}
                </span>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 text-gray-400">
      <p>No music files found. Select a folder and click "Scan Music".</p>
    </div>
  {/if}

  <div class="text-sm text-gray-500 text-center">
    Found {musicFiles.length} music file{musicFiles.length !== 1 ? 's' : ''}
  </div>
</div>
