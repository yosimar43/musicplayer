# Music Player - AI Coding Guide

## Architecture Overview

This is a **Tauri 2.x desktop app** with **SvelteKit (Svelte 5)** frontend combining local audio playback with Spotify data integration. The app uses **Rust backend for Spotify OAuth, file scanning, audio metadata, and download orchestration**, with frontend handling state management and UI.

### Key Architecture Patterns

- **Frontend-Backend Split**: Svelte calls Rust via `invoke()` from `@tauri-apps/api/core`
- **Dual Audio Sources**: Local file playback (via HTMLAudioElement) + Spotify data viewing (read-only)
- **Event-Driven Downloads**: spotdl integration with real-time progress via Tauri events
- **Progressive Data Loading**: Spotify tracks stream in batches of 50 via Tauri events (`spotify-tracks-batch`)
- **Singleton State Classes**: Global reactive state exported as singletons from `src/lib/state/*.svelte.ts`

## Tech Stack Specifics

### Svelte 5 Runes (NOT Svelte 4)
**CRITICAL**: This project uses Svelte 5 runes syntax exclusively. Do NOT use Svelte 4 patterns.

- Use **`$state`** for reactive variables (NOT `let` with `$:`)
- Use **`$derived`** for computed values (NOT `$:` reactive statements)
- Use **`$derived.by(() => {...})`** for complex computed values
- Use **`$effect`** for side effects (NOT `$:` reactive blocks)
- Use **`untrack()`** to batch state updates and prevent intermediate renders

**State class pattern used throughout:**
```typescript
class PlayerState {
  current = $state<Track | null>(null);
  isPlaying = $state(false);
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  
  loadTrack(track: Track) {
    untrack(() => {
      this.isPlaying = true;
      this.duration = track.duration || 0;
    });
    this.current = track; // Single reactive update
  }
}
export const player = new PlayerState();
```

### Tauri Commands Pattern (2025 Refactor)

**New Modular Architecture:**

All Rust functions exposed to frontend are `#[tauri::command]` functions organized in:
- `src-tauri/src/commands/file.rs` - File system commands (`scan_music_folder`, `get_audio_metadata`, `get_default_music_folder_cmd`)
- `src-tauri/src/commands/spotify.rs` - Spotify OAuth and API calls (9 commands total)
- `src-tauri/src/commands/download.rs` - spotdl integration (`download_single_spotify_track`, `download_spotify_tracks_segmented`, `check_spotdl_installed`)

**Architecture Pattern: Command → Service → Util → Domain**

Commands are **thin controllers** that delegate to services:
```rust
// commands/file.rs
#[tauri::command]
pub fn scan_music_folder(folder_path: String) -> ApiResponse<Vec<MusicFile>> {
    FileService::scan_music_folder(&folder_path)
        .map_err(|e| e.to_user_message())
}
```

**Frontend invocation pattern:**
```typescript
import { invoke } from '@tauri-apps/api/core';
const tracks = await invoke<Track[]>('scan_music_folder', { folderPath: path });
```

**Error handling**: 
- Backend uses `thiserror` for typed errors (`AppError`, `FileError`, `SpotifyError`, `DownloadError`)
- Commands convert errors to user-friendly strings via `to_user_message()`
- Frontend receives `Result<T, String>` - handle with try-catch

### Spotify Integration (Read-Only)
- **OAuth Scopes**: `user-library-read`, `user-top-read`, `playlist-read-*`, `user-read-recently-played` (NO playback control scopes)
- **Authentication Flow**: OAuth via tiny_http server on `localhost:8888/callback`, token cached with auto-refresh via `rspotify` crate
- **Progressive Loading**: `spotify_stream_all_liked_songs()` emits `spotify-tracks-batch` events (50 tracks/batch) to prevent UI freezing
- **Download Integration**: spotdl requires external installation (`pip install spotdl yt-dlp`)

**Event-driven loading pattern (required for large libraries):**
```typescript
const { listen } = await import('@tauri-apps/api/event');
await listen<{ tracks: SpotifyTrack[], progress: number }>('spotify-tracks-batch', (event) => {
  savedTracks = [...savedTracks, ...event.payload.tracks];
  loadingProgress = event.payload.progress;
});
await invoke('spotify_stream_all_liked_songs'); // Non-blocking, emits events
```

**Download events**: `download-progress`, `download-segment-finished`, `download-finished`, `download-error`

## Project Structure

```
src/
  lib/
    state/           # Svelte 5 reactive state classes ($state, $derived, $effect)
      player.svelte.ts    # Audio player state + playback functions (play, pause, next, etc.)
      library.svelte.ts   # Local music library state + loading functions
      ui.svelte.ts        # UI preferences (theme, sidebar state)
      index.ts            # Re-exports all state modules
    hooks/           # Reusable hooks for component-level state
      index.ts            # Barrel export for all hooks
      useSpotifyAuth.svelte.ts      # OAuth authentication + profile
      useSpotifyTracks.svelte.ts    # Saved tracks (progressive streaming)
      useSpotifyPlaylists.svelte.ts # User playlists
      useDownload.svelte.ts         # spotdl download manager
      useTrackFilters.svelte.ts     # Filtering and sorting
      useAlbumArt.svelte.ts         # Album art loader (Last.fm)
      useLibrarySync.svelte.ts      # Sync with local library
      usePersistedState.svelte.ts   # Persistent state in localStorage
      useEventBus.svelte.ts         # Global event system
    stores/          # Shared reactive stores
      searchStore.svelte.ts  # Global search query
      musicData.svelte.ts    # Cached Last.fm metadata
      trackMetadata.ts       # Track metadata utilities
    utils/           # Business logic utilities
      audioManager.ts     # HTMLAudioElement wrapper with MediaSession API, converts paths via convertFileSrc()
      musicLibrary.ts     # File scanning helpers
    components/ui/   # Shadcn-style UI components (bits-ui + Tailwind)
      button/, card/, table/, etc.
    animations.ts    # Anime.js v4 animation helpers (fadeIn, scaleIn, staggerItems, etc.)
  routes/            # SvelteKit file-based routing
    +layout.svelte         # Root layout with AnimatedBackground
    library/+page.svelte   # Local file browser and player
    playlists/+page.svelte # Spotify library viewer with download UI
    spotify/+page.svelte   # Spotify profile and stats

src-tauri/
  src/
    commands/         # Thin controllers (Tauri command handlers)
      file.rs         # File system commands
      spotify.rs      # Spotify API commands
      download.rs     # Download commands
    services/         # Business logic services
      file.rs         # FileService: scanning & metadata
      spotify.rs      # SpotifyService: OAuth & API + SpotifyState
      download.rs     # DownloadService: spotdl integration
    domain/           # Domain models and DTOs
      music.rs        # MusicFile, constants
      spotify.rs      # Spotify types, constants
    utils/            # Utility functions
      path.rs         # Path validation & manipulation
      validation.rs   # Input validation
    errors/           # Centralized error handling
      mod.rs          # AppError, FileError, SpotifyError, DownloadError (thiserror)
    lib.rs            # Main library entry point (registers commands)
    main.rs           # Application entry point
  tauri.conf.json    # Security CSP (Spotify domains), asset protocol scope ($AUDIO, $MUSIC, $HOME)
  Cargo.toml         # Dependencies: rspotify, audiotags, walkdir, tiny_http, tokio, thiserror, anyhow
```

## UI/UX Design System (2025)

### Visual Style
- **Glassmorphism**: `backdrop-blur-xl bg-white/10 border border-white/20`
- **Gradients**: `bg-gradient-to-br from-slate-800 via-slate-900 to-black`
- **Color Palette**: Cyan-400, Blue-500, Slate-700, Neutral-100 for modern dark theme
- **Typography**: `text-white drop-shadow-sm font-semibold tracking-wide`

### Animation System (Anime.js v4)
Import from `@/lib/animations.ts`:
```typescript
import { fadeIn, scaleIn, staggerItems, slideInLeft } from '@/lib/animations';

onMount(() => {
  fadeIn('.header');
  staggerItems('.track-item'); // Stagger delay: 80ms
  scaleIn('.button', { delay: 200 });
});
```

**Available animations**: fadeIn, scaleIn, staggerItems, slideInLeft, slideInRight, pulse, glow, rotateIn, popIn, bounce, wave, spin

### CSS Utilities
- `.glass` - Standard glassmorphism effect
- `.glass-strong` - Enhanced blur for prominent elements
- `.hover-lift` - Elevate on hover with shadow
- `.animate-glow` - Continuous glow pulse
- `.text-glow` - Glowing text effect

## Critical Developer Workflows

### Running the App
```powershell
pnpm dev           # Frontend only (Vite dev server on :1420)
pnpm tauri dev     # Full Tauri app (recommended)
pnpm build         # Production SvelteKit build
```

**Important**: Use `pnpm` not `npm`. Vite runs on port 1420, configured in `vite.config.js`.

### Spotify Setup (Required)
1. Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Set redirect URI: `http://localhost:8888/callback`
3. Create `.env` in project root:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_secret
   SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
   ```
4. Backend reads via `Credentials::from_env()` in `rspotify_auth.rs`

### Audio Playback Pattern
`audioManager.ts` handles both local files and streaming URLs:
```typescript
// Local file: converts to Tauri asset protocol
audioManager.play('C:\\Music\\song.mp3'); // → asset://localhost/...

// Streaming URL: uses directly
audioManager.play('https://example.com/stream.mp3');
```

## Project-Specific Conventions

### State Management

#### Global State Classes (Singletons)
- **Global state classes** in `src/lib/state/*.svelte.ts` exported as singletons
- Import and use directly: `import { player } from '@/lib/state/player.svelte'`
- Action functions exported alongside state (e.g., `play()`, `pause()` in `player.svelte.ts`)
- **When to use**: Persistent state across entire session, unique services (player, library), multiple components need simultaneous access

**Available state modules:**
- `player.svelte.ts` - Audio player state + playback functions
- `library.svelte.ts` - Local music library state + loading functions
- `ui.svelte.ts` - UI preferences (theme, sidebar state)

#### Stores (Shared Reactive State)
**Location**: `src/lib/stores/` - Shared reactive stores for cross-component communication

**Available stores:**
- `searchStore.svelte.ts` - Global search query shared between Navbar and pages
  - `query`, `setQuery(q)`, `clear()`
- `musicData.svelte.ts` - Cached music metadata
- `trackMetadata.ts` - Track metadata utilities

**When to use**: Simple shared state that doesn't need lifecycle management or cleanup

#### Hooks System (Local State)
**Location**: `src/lib/hooks/` - Reusable hooks for component-level state

**Import pattern:**
```typescript
import { 
  useSpotifyAuth,        // OAuth authentication + profile
  useSpotifyTracks,      // Saved tracks (progressive streaming)
  useSpotifyPlaylists,   // User playlists
  useDownload,           // spotdl downloads with progress
  useTrackFilters,       // Filtering and sorting
  createAlbumArtLoader,  // Album art images (Last.fm)
  useLibrarySync,        // Auto-sync with local library
  usePersistedState,     // Persistent state in localStorage
  useEventBus,           // Component communication
  EVENTS                 // Predefined system events
} from '@/lib/hooks';
```

**When to use**: Local state to a component/page, logic that creates/destroys with lifecycle, requires cleanup (event listeners), temporary data (Spotify, downloads, filters)

**Available hooks:**

1. **`useSpotifyAuth()`** - OAuth authentication + user profile
   - `isAuthenticated`, `profile`, `checkAuth()`, `authenticate()`, `logout()`

2. **`useSpotifyTracks()`** - Saved tracks with progressive loading
   - `tracks`, `isLoading`, `progress`, `loadTracks()`, `setupEventListeners()`, `cleanup()`
   - Uses `spotify-tracks-batch` Tauri events for streaming

3. **`useSpotifyPlaylists()`** - User playlists
   - `playlists`, `isLoading`, `loadPlaylists()`, `getPlaylistTracks()`

4. **`useDownload()`** - spotdl download manager
   - `downloads`, `stats`, `isDownloading`, `downloadTrack()`, `downloadTracks()`, `setupEventListeners()`, `cleanup()`
   - Listens to Tauri events: `download-progress`, `download-segment-finished`, `download-finished`, `download-error`

5. **`useTrackFilters()`** - Filtering and sorting
   - `filteredTracks`, `sortBy`, `sortOrder`, `searchQuery`, `applyFilters()`

6. **`createAlbumArtLoader()`** - Album art from Last.fm
   - Returns loader function for fetching album images

7. **`useLibrarySync()`** - Sync Spotify tracks with local library
   - `syncWithLibrary(tracks)` - Adds `isDownloaded` flag to tracks

8. **`usePersistedState<T>(options)`** - Persistent state in localStorage
   - `key`, `defaultValue`, `syncAcrossTabs`
   - Auto-saves and syncs between tabs/windows

9. **`useEventBus()`** - Global event system for component communication
   - `emit(event, data)`, `on(event, callback)`, `once(event, callback)`, `off(event, callback)`, `cleanup()`
   - Use `EVENTS` constants for predefined events

**Hook integration pattern:**
```typescript
import { onMount } from 'svelte';
import { library, player } from '@/lib/state';
import { useSpotifyAuth, useSpotifyTracks, useDownload, useLibrarySync, useEventBus, EVENTS } from '@/lib/hooks';

const auth = useSpotifyAuth();
const tracks = useSpotifyTracks();
const download = useDownload();
const sync = useLibrarySync();
const bus = useEventBus();

// Computed values
let syncedTracks = $derived(sync.syncWithLibrary(tracks.tracks));

onMount(async () => {
  // Setup event listeners
  await tracks.setupEventListeners();
  await download.setupEventListeners();
  
  // Listen to download events
  bus.on(EVENTS.DOWNLOAD_COMPLETED, async () => {
    await library.reload(); // Reload global state
  });
  
  // Auth and load
  const isAuth = await auth.checkAuth();
  if (isAuth) {
    await tracks.loadTracks();
  }
  
  // Cleanup
  return () => {
    tracks.cleanup();
    download.cleanup();
    bus.cleanup();
  };
});
```

### Path Aliases
- `@/` maps to `src/` (configured in `svelte.config.js`)
- Use `import { player } from '@/lib/state/player.svelte'` not relative paths

### Tauri Security
- **CSP** in `tauri.conf.json` allows Spotify images (`*.scdn.co`, `*.spotifycdn.com`)
- **Asset protocol** scoped to `$AUDIO`, `$MUSIC`, `$HOME` for local file access
- Use `convertFileSrc()` to convert Windows paths to asset:// protocol

### Error Handling (2025 Refactor)
- **Backend**: Uses `thiserror` crate for typed errors:
  - `AppError` - Main error type with variants (`FileError`, `SpotifyError`, `DownloadError`)
  - Errors are typed and provide context
  - Commands convert to user-friendly strings via `to_user_message()`
- **Frontend**: Commands return `Result<T, String>` - errors are strings
- **Pattern**: Use `?` operator for error propagation, `map_err()` for conversion
- **Frontend**: Use try-catch, display errors in UI (see `src/routes/playlists/+page.svelte`)
- **Logging**: Console logging uses emoji prefixes: `🎵`, `✅`, `❌`, `🔍`

## Integration Points

### Spotify → Frontend Data Flow (2025 Refactor)
1. Frontend calls `invoke('spotify_authenticate')` → `commands/spotify.rs`
2. Command delegates to `SpotifyService::authenticate()` → `services/spotify.rs`
3. Service opens OAuth in browser, starts tiny_http server on `:8888` to catch callback
4. Token cached, subsequent calls auto-refresh via `rspotify` crate
5. All API calls use `rspotify::AuthCodeSpotify` client in `SpotifyState` (Arc<Mutex<>>)
6. State guards are released early to prevent deadlocks

### Local Files → Frontend Data Flow (2025 Refactor)
1. User picks folder via Tauri dialog or uses `get_default_music_folder_cmd()`
2. Command in `commands/file.rs` delegates to `FileService::scan_music_folder()`
3. Service uses `walkdir` for scanning, `audiotags` for metadata extraction
4. Path validation via `utils/path.rs` (prevents path traversal)
5. Returns `MusicFile[]` with nullable metadata fields
6. Frontend stores in `library.svelte.ts` state

### Audio Playback
- Uses browser's `HTMLAudioElement` (in `audioManager.ts`)
- Local files converted via `convertFileSrc()` to `asset://` protocol
- Streaming URLs used directly (external sources supported)
- Progress tracking via `timeupdate` event, updates `player.currentTime`

## Common Pitfalls

### Frontend
1. **Don't use Svelte 4 syntax** - No `$:` reactive statements, use `$derived`
2. **Spotify has NO playback control** - App is data viewer only, don't add player controls
3. **Windows paths need conversion** - Always use `convertFileSrc()` for local files
4. **Event listeners must be cleaned up** - Use `unlisten()` returned from `listen()` or hook `cleanup()` methods
5. **Batch loading is async** - Use event listeners, don't await `spotify_stream_all_liked_songs()`
6. **CSP restrictions** - New external domains need addition to `tauri.conf.json`
7. **Hooks require cleanup** - Always call `cleanup()` methods in `onMount` return or `onDestroy`
8. **Don't mix state patterns** - Use global state for persistent data, hooks for component-local state
9. **Tauri event listeners** - Must call `setupEventListeners()` on hooks that use Tauri events (useSpotifyTracks, useDownload)

### Backend (2025 Refactor)
10. **Don't add logic to commands** - Commands are thin controllers, delegate to services
11. **Always use error types** - Use `AppError` variants, not raw strings
12. **Release Mutex guards early** - Use blocks `{}` to limit guard scope, prevent deadlocks
13. **Use `?` operator** - Don't use `unwrap()` or `expect()`, propagate errors properly
14. **Validate inputs** - Use `utils/validation.rs` and `utils/path.rs` for all user input
15. **Add timeouts** - Use `tokio::time::timeout()` for all async operations that might hang
16. **Follow architecture pattern** - Command → Service → Util → Domain, don't skip layers

## Testing & Debugging

- **Frontend errors**: Check browser DevTools (Ctrl+Shift+I in dev mode)
- **Backend errors**: Check terminal running `pnpm tauri dev`
- **OAuth issues**: Verify `.env` exists, check Spotify dashboard redirect URI
- **File loading issues**: Check Windows permissions, use `$MUSIC` scope in tauri.conf.json
- **Audio not playing**: Check CSP, verify `convertFileSrc()` usage, inspect console for CORS errors

## Key Files for Common Tasks

### Backend (Rust)
- **Add new Tauri command**: 
  1. Add service method in `src-tauri/src/services/your_service.rs`
  2. Add thin controller in `src-tauri/src/commands/your_service.rs`
  3. Register in `src-tauri/src/lib.rs` invoke_handler
- **Add Spotify API call**: 
  1. Add method to `SpotifyService` in `src-tauri/src/services/spotify.rs`
  2. Add command in `src-tauri/src/commands/spotify.rs`
- **Add new error type**: Add variant to appropriate error enum in `src-tauri/src/errors/mod.rs`
- **Add validation**: Add function to `src-tauri/src/utils/validation.rs`
- **Add domain model**: Add struct to `src-tauri/src/domain/` (music.rs or spotify.rs)

### Frontend (Svelte)
- **Add UI component**: Check `src/lib/components/ui/` for existing components (shadcn-style)
- **Modify audio behavior**: Edit `src/lib/utils/audioManager.ts`
- **Add route**: Create `src/routes/your-route/+page.svelte`
- **Global state**: Add to existing class in `src/lib/state/` or create new `.svelte.ts` file
- **Add new hook**: Create `src/lib/hooks/useYourHook.svelte.ts` and export from `index.ts`
- **Component communication**: Use `useEventBus()` hook with `EVENTS` constants
- **Persistent preferences**: Use `usePersistedState()` hook for localStorage
