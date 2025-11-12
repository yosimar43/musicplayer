# 🎣 Hooks Reference - Guía Rápida

## Importación

```typescript
import {
  // Core
  useSpotifyAuth,
  useSpotifyTracks,
  useSpotifyPlaylists,
  useDownload,
  useTrackFilters,
  createAlbumArtLoader,
  // Utilidades
  useLibrarySync,
  usePersistedState,
  useEventBus,
  EVENTS,
  // Types
  type SpotifyUserProfile,
  type SpotifyTrack,
  type SpotifyPlaylist,
  type DownloadProgressItem,
  type DownloadStats,
  type SortBy,
  type SortOrder,
  type PopularityFilter,
  type AlbumArtState
} from '@/lib/hooks';
```

---

## 1. useSpotifyAuth()

```typescript
const auth = useSpotifyAuth();

// Estado
auth.isAuthenticated   // boolean
auth.isLoading         // boolean
auth.profile           // SpotifyUserProfile | null
auth.error             // string | null

// Métodos
await auth.checkAuth()        // Promise<boolean>
await auth.authenticate()     // Promise<void>
await auth.loadProfile()      // Promise<void>
await auth.logout()           // Promise<void>
auth.reset()                  // void
```

---

## 2. useSpotifyTracks()

```typescript
const tracks = useSpotifyTracks();

// Estado
tracks.tracks            // SpotifyTrack[]
tracks.isLoading         // boolean
tracks.loadingProgress   // number (0-100)
tracks.error             // string | null

// Métodos
await tracks.setupEventListeners()      // Promise<void>
await tracks.loadTracks(forceReload?)   // Promise<void>
tracks.markLocalTracks(localTracks)     // void
tracks.cleanup()                        // void
tracks.reset()                          // void
```

---

## 3. useSpotifyPlaylists()

```typescript
const playlists = useSpotifyPlaylists();

// Estado
playlists.playlists   // SpotifyPlaylist[]
playlists.isLoading   // boolean
playlists.error       // string | null

// Métodos
await playlists.loadPlaylists(limit?, forceReload?)  // Promise<void>
playlists.reset()                                    // void
```

---

## 4. useDownload()

```typescript
const download = useDownload();

// Estado
download.isDownloading      // boolean
download.downloadProgress   // DownloadProgressItem[]
download.downloadStats      // { downloaded, failed, total }
download.spotdlInstalled    // boolean | null
download.error              // string | null

// Métodos
await download.setupEventListeners()          // Promise<void>
await download.checkSpotdlInstallation()      // Promise<void>
await download.downloadTracks(tracks, opts)   // Promise<void>
await download.downloadSingleTrack(track)     // Promise<void>
download.clearProgress()                      // void
download.cleanup()                            // void
download.reset()                              // void

// Options type
interface DownloadOptions {
  segmentSize?: number;
  delay?: number;
  outputTemplate?: string;
  format?: string;
}
```

---

## 5. useTrackFilters(searchQuery)

```typescript
const filters = useTrackFilters(() => searchStore.query);

// Estado
filters.sortBy              // SortBy
filters.sortOrder           // SortOrder
filters.filterPopularity    // PopularityFilter

// Métodos
filters.handleSort(column)                // void
filters.filterAndSortTracks(tracks)       // SpotifyTrack[]
filters.hasActiveFilters()                // boolean
filters.clearFilters()                    // void
filters.reset()                           // void

// Types
type SortBy = 'name' | 'artist' | 'album' | 'duration' | 'popularity';
type SortOrder = 'asc' | 'desc';
type PopularityFilter = 'all' | 'high' | 'medium' | 'low';
```

---

## 6. createAlbumArtLoader(artist, title, album?)

```typescript
const albumArt = createAlbumArtLoader(
  track.artist,
  track.title,
  track.album
);

// Estado
albumArt.url          // string | null
albumArt.isLoading    // boolean
albumArt.hasError     // boolean
```

---

## 7. useLibrarySync()

```typescript
const sync = useLibrarySync();

// Métodos
sync.syncWithLibrary(spotifyTracks)   // SpotifyTrack[] (con isDownloaded)
sync.setupAutoSync(getTracks, onSync) // void

// Estado
sync.isSynced  // boolean

// Ejemplo
sync.setupAutoSync(
  () => tracks.tracks,
  (synced) => { tracks.tracks = synced; }
);
```

---

## 8. usePersistedState(options)

```typescript
const volumeState = usePersistedState({
  key: 'player:volume',
  defaultValue: 70,
  syncAcrossTabs: true
});

// Estado
volumeState.value        // T (tu tipo)
volumeState.isHydrated   // boolean

// Métodos
volumeState.reset()      // void
volumeState.update((current) => current + 10)  // void

// Ejemplo
volumeState.value = 50;  // Se guarda automáticamente en localStorage
```

---

## 9. useEventBus()

```typescript
const bus = useEventBus();

// Métodos
bus.emit(event, data?)           // void
const unlisten = bus.on(event, callback)  // () => void
bus.once(event, callback)        // void
bus.off(event, callback?)        // void
bus.cleanup()                    // void
bus.listenerCount(event)         // number

// Eventos predefinidos
EVENTS.TRACK_CHANGED
EVENTS.PLAYBACK_STARTED
EVENTS.PLAYBACK_PAUSED
EVENTS.PLAYBACK_ENDED
EVENTS.QUEUE_UPDATED
EVENTS.LIBRARY_LOADED
EVENTS.LIBRARY_UPDATED
EVENTS.TRACK_ADDED
EVENTS.DOWNLOAD_STARTED
EVENTS.DOWNLOAD_COMPLETED
EVENTS.DOWNLOAD_FAILED
EVENTS.SPOTIFY_AUTHENTICATED
EVENTS.SPOTIFY_DISCONNECTED
EVENTS.SPOTIFY_TRACKS_LOADED
EVENTS.SEARCH_QUERY_CHANGED
EVENTS.THEME_CHANGED
EVENTS.NOTIFICATION

// Ejemplo
bus.on(EVENTS.DOWNLOAD_COMPLETED, async (data) => {
  console.log('Track descargado:', data);
  await library.reload();
});
```

---

## Patrón Completo: Página con Todos los Hooks

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { library } from '@/lib/state/library.svelte';
  import { 
    useSpotifyAuth, 
    useSpotifyTracks,
    useSpotifyPlaylists,
    useDownload,
    useTrackFilters,
    useLibrarySync,
    useEventBus,
    EVENTS
  } from '@/lib/hooks';
  import { searchStore } from '@/lib/stores/searchStore.svelte';

  // Inicializar hooks
  const auth = useSpotifyAuth();
  const tracks = useSpotifyTracks();
  const playlists = useSpotifyPlaylists();
  const download = useDownload();
  const filters = useTrackFilters(() => searchStore.query);
  const sync = useLibrarySync();
  const bus = useEventBus();

  // UI state local
  let activeView = $state<'liked' | 'playlists'>('liked');

  // Computed values
  let filteredTracks = $derived(
    filters.filterAndSortTracks(tracks.tracks)
  );
  
  let syncedTracks = $derived(
    sync.syncWithLibrary(filteredTracks)
  );

  onMount(async () => {
    // Setup listeners
    await Promise.all([
      tracks.setupEventListeners(),
      download.setupEventListeners()
    ]);

    // Auto-sync
    sync.setupAutoSync(
      () => tracks.tracks,
      (synced) => { tracks.tracks = synced; }
    );

    // Event bus
    bus.on(EVENTS.DOWNLOAD_COMPLETED, async () => {
      await library.reload();
    });

    // Auth y carga
    const isAuth = await auth.checkAuth();
    if (isAuth) {
      await Promise.all([
        tracks.loadTracks(),
        playlists.loadPlaylists(50)
      ]);
    }

    // Cleanup
    return () => {
      tracks.cleanup();
      download.cleanup();
      bus.cleanup();
    };
  });

  // UI handlers (orquestación simple)
  async function handleAuth() {
    await auth.authenticate();
    if (auth.isAuthenticated) {
      await tracks.loadTracks();
    }
  }

  async function handleDownload() {
    const notDownloaded = syncedTracks.filter(t => !t.isDownloaded);
    await download.downloadTracks(notDownloaded, {
      segmentSize: 10,
      delay: 2,
      format: 'mp3'
    });
  }
</script>

<!-- Template -->
{#if !auth.isAuthenticated}
  <button onclick={handleAuth}>Conectar Spotify</button>
{:else if tracks.isLoading}
  <p>Cargando... {tracks.loadingProgress}%</p>
{:else}
  <button onclick={handleDownload}>
    Descargar {syncedTracks.filter(t => !t.isDownloaded).length} canciones
  </button>
  
  {#each syncedTracks as track}
    <div>{track.name}</div>
  {/each}
{/if}
```

---

## Tips

### 1. Siempre hacer cleanup
```typescript
onMount(() => {
  // Setup...
  
  return () => {
    tracks.cleanup();
    download.cleanup();
    bus.cleanup();
  };
});
```

### 2. Usar $derived para computed
```typescript
// ❌ No hacer
let filteredTracks = filters.filterAndSortTracks(tracks.tracks);

// ✅ Hacer
let filteredTracks = $derived(
  filters.filterAndSortTracks(tracks.tracks)
);
```

### 3. Batch updates con untrack()
```typescript
import { untrack } from 'svelte';

untrack(() => {
  tracks.tracks = newTracks;
  tracks.isLoading = false;
  tracks.error = null;
});
```

### 4. Event bus para comunicación
```typescript
// Componente A emite
bus.emit(EVENTS.DOWNLOAD_COMPLETED, { trackId: '123' });

// Componente B escucha
bus.on(EVENTS.DOWNLOAD_COMPLETED, (data) => {
  console.log('Descargado:', data.trackId);
});
```

---

**¡Todo listo para refactorizar! 🚀**
