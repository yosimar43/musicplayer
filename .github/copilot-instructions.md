# Music Player - AI Coding Guide

## Architecture Overview

**Tauri 2.x desktop app** with **SvelteKit (Svelte 5)** frontend combining local audio playback with Spotify data integration. Rust backend handles Spotify OAuth, file scanning, metadata, and spotdl downloads.

### Key Patterns
- **Frontend-Backend**: Svelte calls Rust via `TauriCommands` wrapper (centralized, typed, error handling)
- **State Management**: 
  - Global classes (`src/lib/state/`) for persistent app state
  - Component hooks (`src/lib/hooks/`) for local state with lifecycle
  - Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity
- **Dual Audio**: Local files via `HTMLAudioElement` (convert paths with `convertFileSrc()`), Spotify data read-only
- **Event-Driven**: spotdl downloads emit `download-progress` events; Spotify tracks stream in batches via `spotify-tracks-batch`

## Tech Stack
- **Frontend**: Svelte 5 (runes only), SvelteKit 2.x, Tailwind CSS 4.x, Anime.js 4.x, shadcn-svelte components
- **Backend**: Rust (Tauri 2.x), rspotify, audiotags, walkdir, tiny_http, thiserror
- **UI**: Glassmorphism design, cyan/blue gradients, bits-ui components

## UI Components (shadcn-svelte)

The project uses shadcn-svelte components built on bits-ui primitives. Available components include:

### Form & Input
- Button, Button Group, Calendar, Checkbox, Combobox, Date Picker
- Field, Input, Input Group, Input OTP, Label, Radio Group, Select
- Slider, Switch, Textarea

### Layout & Navigation  
- Accordion, Breadcrumb, Navigation Menu, Resizable, Scroll Area
- Separator, Sidebar, Tabs

### Overlays & Dialogs
- Alert Dialog, Command, Context Menu, Dialog, Drawer
- Dropdown Menu, Hover Card, Menubar, Popover, Sheet, Tooltip

### Feedback & Status
- Alert, Badge, Empty, Progress, Skeleton, Sonner (toast), Spinner

### Display & Media
- Aspect Ratio, Avatar, Card, Carousel, Chart, Data Table
- Item, Kbd, Table, Typography

### Usage Pattern
```typescript
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
```

Components follow the shadcn pattern with consistent styling and accessibility.

## Svelte 5 Runes (CRITICAL)

**This project uses Svelte 5 runes exclusively. Do NOT use Svelte 4 syntax.**

### Core Runes

#### $state - Reactive Variables
```typescript
// ✅ Correct: Use $state rune
let count = $state(0);
let user = $state({ name: 'John', age: 25 });

// ❌ Wrong: Old Svelte 4 syntax
let count = 0; // No reactivity
```

- Arrays and objects become deeply reactive proxies
- Do NOT destructure reactive proxies (breaks reactivity)
- Use in class fields for reactive properties

#### $state.raw - Shallow State
```typescript
let person = $state.raw({ name: 'John', age: 25 });
// Reassign entire object, don't mutate properties
person = { name: 'John', age: 26 };
```

#### $derived - Computed Values
```typescript
// ✅ Correct: Use $derived rune
let doubled = $derived(count * 2);
let isAdult = $derived(user.age >= 18);

// ❌ Wrong: Old reactive statements
// $: doubled = count * 2;
```

#### $derived.by - Complex Computations
```typescript
let total = $derived.by(() => {
  let sum = 0;
  for (const item of items) sum += item.price;
  return sum;
});
```

#### $effect - Side Effects
```typescript
// ✅ Correct: Use $effect rune
$effect(() => {
  console.log('Count changed:', count);
  // Returns cleanup function if needed
  return () => console.log('cleanup');
});

// ❌ Wrong: Old reactive statements
// $: console.log('Count changed:', count);
```

#### $props - Component Props
```typescript
// ✅ Correct: Use $props rune
let { title, onClick, disabled = false } = $props();

// ❌ Wrong: Old export syntax
// export let title;
// export let onClick;
// export let disabled = false;
```

### Event Handling
```svelte
<!-- ✅ Correct: No colon in event names -->
<button onclick={handleClick}>Click me</button>

<!-- ❌ Wrong: Old syntax -->
<button on:click={handleClick}>Click me</button>
```

## State Management Patterns

### When to Use Each Type

- **Global State Classes**: For persistent app state, services únicos, datos compartidos entre múltiples componentes
- **Component Hooks**: Para estado local, lógica con lifecycle, event listeners que requieren cleanup
- **Persistent State**: Para preferencias de usuario que sobreviven recargas (usar `usePersistedState`)
- **Event Communication**: Para comunicación desacoplada entre componentes (usar `useEventBus`)

### Global State Classes (Singleton Pattern)
```typescript
class PlayerState {
  // Propiedades de estado reactivo
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  isPlaying = $state(false);
  volume = $state(70);

  // Estados derivados
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);

  playTrack(track: Track) {
    untrack(() => {
      this.isPlaying = true;
      this.current = track;
    });
  }
}
export const player = new PlayerState();
```

**Patrones importantes:**
- **Singleton export**: Exporta una instancia de la clase, no la clase misma
- **Reactive properties**: Usa `$state` para propiedades reactivas
- **Derived values**: Usa `$derived` para valores computados
- **Batch updates**: Usa `untrack()` para agrupar cambios de estado
- **Class fields**: Las propiedades reactivas van directamente en campos de clase

### Routing
- **Filesystem router**: `src/routes/` maps directories to URLs
- **Route files**: Use `+page.svelte` for pages, `+layout.svelte` for layouts
- **Data loading**: Use `+page.js` or `+page.server.js` with `load()` functions
- **Props access**: `let { data } = $props()` in components

### Project Structure
```
src/
  lib/           # Shared code ($lib)
  routes/        # Pages and layouts
    +layout.svelte    # Root layout
    library/+page.svelte   # /library route
    playlists/+page.svelte # /playlists route
  app.html       # HTML template
```

### Component Props (Svelte 5)
```typescript
// In child component
let { title, onClick, disabled = false } = $props();

// In parent component
<Child {title} {onClick} disabled={false} />
```

## Project Structure
`
src/
  lib/
    state/           # Global reactive state classes (, )
      player.svelte.ts    # Audio player + playback controls
      library.svelte.ts   # Local music library
      ui.svelte.ts        # UI preferences
    hooks/           # Component-level state hooks
      useSpotifyAuth.svelte.ts    # OAuth + profile
      useSpotifyTracks.svelte.ts  # Liked songs (progressive loading)
      useSpotifyPlaylists.svelte.ts # User playlists
      useDownload.svelte.ts       # spotdl downloads with progress
      useTrackFilters.svelte.ts   # Filtering and sorting
      useAlbumArt.svelte.ts       # Album art loader (Last.fm)
      useLibrarySync.svelte.ts    # Sync Spotify tracks with local library
      usePersistedState.svelte.ts # Persistent state in localStorage
      useEventBus.svelte.ts       # Global event system
      useLibrary.svelte.ts        # Local music library management
      useUI.svelte.ts             # UI state and preferences
      usePlayerUI.svelte.ts       # Player UI controls
    utils/
      tauriCommands.ts    #  ALL Tauri invokes go through here
      audioManager.ts     # HTMLAudioElement wrapper
  routes/            # SvelteKit routing

src-tauri/
  src/
    commands/        # Thin controllers (Tauri command handlers)
    services/        # Business logic
    domain/          # DTOs and models
    errors/          # thiserror types
`

## Critical Workflows

### Development
`ash
pnpm dev           # Frontend only (:1420)
pnpm tauri dev     # Full app (recommended)
`

### Spotify Setup
1. Create app at Spotify Developer Dashboard
2. Set redirect URI: http://localhost:8888/callback
3. Add .env: SPOTIFY_CLIENT_ID=..., SPOTIFY_CLIENT_SECRET=...

### Audio Playback
- Local: udioManager.play('C:\\Music\\song.mp3')  converts to sset://
- Streaming: Direct URLs supported

## Code Patterns

### State Classes (Global Singletons)
```typescript
class PlayerState {
  // Propiedades de estado reactivo
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  isPlaying = $state(false);
  volume = $state(70);

  // Estados derivados
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);

  playTrack(track: Track) {
    untrack(() => {
      this.isPlaying = true;
      this.current = track;
    });
  }
}
export const player = new PlayerState();
```

**Patrones importantes:**
- **Singleton export**: Exporta una instancia de la clase, no la clase misma
- **Reactive properties**: Usa `$state` para propiedades reactivas
- **Derived values**: Usa `$derived` para valores computados
- **Batch updates**: Usa `untrack()` para agrupar cambios de estado
- **Class fields**: Las propiedades reactivas van directamente en campos de clase

### Tauri Integration
`	ypescript
//  Use wrapper
import { TauriCommands } from '@/lib/utils/tauriCommands';
const tracks = await TauriCommands.scanMusicFolder(folderPath);

//  Avoid direct invoke
import { invoke } from '@tauri-apps/api/core';
`

### Hooks Usage
```typescript
import { 
  useSpotifyAuth,        // OAuth authentication + profile
  useSpotifyTracks,      // Saved tracks (progressive streaming)
  useSpotifyPlaylists,   // User playlists
  useDownload,           // spotdl downloads with progress
  useTrackFilters,       // Filtering and sorting
  createAlbumArtLoader,  // Album art images (Last.fm)
  useLibrarySync,        // Sync Spotify tracks with local library
  usePersistedState,     // Persistent state in localStorage
  useEventBus,           // Component communication
  useLibrary,            // Local music library management
  useUI,                 // UI state and preferences
  EVENTS                 // Predefined system events
} from '@/lib/hooks';

const tracks = useSpotifyTracks();
const download = useDownload();

// Setup in onMount
onMount(async () => {
  await tracks.setupEventListeners();
  await download.setupEventListeners();
  return () => {
    tracks.cleanup();
    download.cleanup();
  };
});
```

### Available Hooks

1. **`useSpotifyAuth()`** - OAuth authentication + user profile
   - `isAuthenticated`, `isLoading`, `profile`, `error`
   - `checkAuth()`, `loadProfile()`, `authenticate()`, `logout()`

2. **`useSpotifyTracks()`** - Saved tracks with progressive loading
   - `tracks`, `isLoading`, `loadingProgress`, `totalTracks`, `error`
   - `setupEventListeners()`, `loadTracks()`, `loadTracksPaginated()`, `resyncWithLibrary()`, `cleanup()`, `reset()`
   - Uses `TauriCommands.streamAllLikedSongs()` for streaming
   - Listens to `spotify-tracks-batch`, `spotify-tracks-start`, `spotify-tracks-complete`, `spotify-tracks-error` events

3. **`useSpotifyPlaylists()`** - User playlists
   - `playlists`, `isLoading`, `error`
   - `loadPlaylists()`, `getPlaylistTracks()`

4. **`useDownload()`** - spotdl download manager
   - `downloads` (Map), `isDownloading`, `stats` (completed/failed/total)
   - `downloadTrack()`, `downloadTracks()`, `checkSpotdlInstallation()`, `setupEventListeners()`, `cleanup()`
   - Listens to Tauri events: `download-progress`, `download-finished`, `download-error`
   - Emits `EVENTS.DOWNLOAD_COMPLETED` via EventBus

5. **`useTrackFilters(searchQuery)`** - Filtering and sorting
   - `sortBy`, `sortOrder`, `filterPopularity`
   - `handleSort()`, `applyFilters()`, `filteredTracks`

6. **`createAlbumArtLoader()`** - Album art from Last.fm
   - Returns loader function for fetching album images

7. **`useLibrarySync()`** - Sync Spotify tracks with local library
   - `syncWithLibrary(tracks)` - Adds `isDownloaded` flag to tracks

8. **`usePersistedState<T>(options)`** - Persistent state in localStorage
   - `key`, `defaultValue`, `serializer`, `deserializer`, `syncAcrossTabs`
   - Auto-saves and syncs between tabs/windows

9. **`useEventBus()`** - Global event system for component communication
   - `emit(event, data)`, `on(event, callback)`, `once(event, callback)`, `off(event, callback)`, `cleanup()`
   - Use `EVENTS` constants for predefined events

10. **`useLibrary()`** - Local music library management
    - `tracks`, `isLoading`, `error`
    - `loadLibrary()`, `reload()`, `setupEventListeners()`, `cleanup()`

11. **`useUI()`** - UI state and preferences
    - `sidebarOpen`, `currentView`, etc.
    - UI state management functions

### EventBus Pattern
```typescript
import { useEventBus, EVENTS } from '@/lib/hooks';

const bus = useEventBus();

// Emitir evento
bus.emit(EVENTS.DOWNLOAD_COMPLETED, { trackId: '123' });

// Escuchar evento
bus.on(EVENTS.DOWNLOAD_COMPLETED, (data) => {
  console.log('Download completed:', data);
});

// Cleanup
bus.cleanup();
```

### Persistent State
```typescript
import { usePersistedState } from '@/lib/hooks';

const volume = usePersistedState({
  key: 'player-volume',
  defaultValue: 70,
  syncAcrossTabs: true
});

// volume se guarda automáticamente en localStorage
```

### Track Filtering
```typescript
import { useTrackFilters } from '@/lib/hooks';

const filters = useTrackFilters(() => searchQuery);

// Aplicar filtros y ordenamiento
const filteredTracks = filters.applyFilters(allTracks);
```

### Backend Architecture
`
ust
// commands/file.rs - Thin controller
#[tauri::command]
pub fn scan_music_folder(folder_path: String) -> ApiResponse<Vec<MusicFile>> {
    FileService::scan_music_folder(&folder_path)
        .map_err(|e| e.to_user_message())
}

// services/file.rs - Business logic
impl FileService {
    pub fn scan_music_folder(folder_path: &str) -> Result<Vec<MusicFile>> {
        // Implementation
    }
}
`

## Common Pitfalls
- **Svelte 4 syntax**: Use `$state` not `let`, `$derived` not `$:`
- **Direct invokes**: Always use `TauriCommands` wrapper
- **Event cleanup**: Call `cleanup()` on hooks with listeners
- **Path conversion**: Use `convertFileSrc()` for local files
- **Mutex guards**: Release early in Rust to prevent deadlocks
- **Error handling**: Use `?` operator, convert to user strings in commands
- **EventBus cleanup**: Always call `cleanup()` on `useEventBus()` instances
- **Persistent state**: Use `usePersistedState()` for user preferences, not regular state

## Key Files
- `src/lib/state/player.svelte.ts` - Audio player logic
- `src/lib/utils/tauriCommands.ts` - All Tauri calls
- `src/lib/hooks/index.ts` - Hook exports
- `src/lib/hooks/useEventBus.svelte.ts` - Global event system
- `src/lib/hooks/usePersistedState.svelte.ts` - localStorage persistence
- `src-tauri/src/commands/mod.rs` - Command registrations
- `src-tauri/src/services/mod.rs` - Service implementations
