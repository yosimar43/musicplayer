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

### Tauri Commands Pattern
All Rust functions exposed to frontend are `#[tauri::command]` functions in:
- `src-tauri/src/lib.rs` - File scanning (`scan_music_folder`, `get_audio_metadata`, `get_default_music_folder`)
- `src-tauri/src/rspotify_auth.rs` - Spotify OAuth and API calls (14 commands total)
- `src-tauri/src/download_commands.rs` - spotdl integration (`download_single_spotify_track`, `download_spotify_tracks_segmented`)

**Frontend invocation pattern:**
```typescript
import { invoke } from '@tauri-apps/api/core';
const tracks = await invoke<Track[]>('scan_music_folder', { folderPath: path });
```

**Error handling**: Rust commands return `Result<T, String>` - errors are strings, handle with try-catch.

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
    lib.rs             # File system commands (scan_music_folder, get_audio_metadata, get_default_music_folder)
    rspotify_auth.rs   # Spotify OAuth + API wrapper (14 commands, RSpotifyState mutex)
    download_commands.rs # spotdl integration with progress events
  tauri.conf.json    # Security CSP (Spotify domains), asset protocol scope ($AUDIO, $MUSIC, $HOME)
  Cargo.toml         # Dependencies: rspotify, audiotags, walkdir, tiny_http, tokio
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
- **Global state classes** in `src/lib/state/*.svelte.ts` exported as singletons
- Import and use directly: `import { player } from '@/lib/state/player.svelte'`
- Action functions exported alongside state (e.g., `play()`, `pause()` in `player.svelte.ts`)

### Path Aliases
- `@/` maps to `src/` (configured in `svelte.config.js`)
- Use `import { player } from '@/lib/state/player.svelte'` not relative paths

### Tauri Security
- **CSP** in `tauri.conf.json` allows Spotify images (`*.scdn.co`, `*.spotifycdn.com`)
- **Asset protocol** scoped to `$AUDIO`, `$MUSIC`, `$HOME` for local file access
- Use `convertFileSrc()` to convert Windows paths to asset:// protocol

### Error Handling
- Rust commands return `Result<T, String>` - errors are strings
- Frontend uses try-catch, display errors in UI (see `src/routes/playlists/+page.svelte`)
- Console logging uses emoji prefixes: `🎵`, `✅`, `❌`, `🔍`

## Integration Points

### Spotify → Frontend Data Flow
1. Frontend calls `invoke('spotify_authenticate')` → opens OAuth in browser
2. Rust starts tiny_http server on `:8888` to catch callback
3. Token cached, subsequent calls auto-refresh via `rspotify` crate
4. All API calls use `rspotify::AuthCodeSpotify` client in `RSpotifyState` mutex

### Local Files → Frontend Data Flow
1. User picks folder via Tauri dialog or uses `get_default_music_folder()`
2. Rust scans with `walkdir`, extracts ID3 tags with `audiotags`
3. Returns `MusicFile[]` with nullable metadata fields
4. Frontend stores in `library.svelte.ts` state

### Audio Playback
- Uses browser's `HTMLAudioElement` (in `audioManager.ts`)
- Local files converted via `convertFileSrc()` to `asset://` protocol
- Streaming URLs used directly (external sources supported)
- Progress tracking via `timeupdate` event, updates `player.currentTime`

## Common Pitfalls

1. **Don't use Svelte 4 syntax** - No `$:` reactive statements, use `$derived`
2. **Spotify has NO playback control** - App is data viewer only, don't add player controls
3. **Windows paths need conversion** - Always use `convertFileSrc()` for local files
4. **Event listeners must be cleaned up** - Use `unlisten()` returned from `listen()`
5. **Batch loading is async** - Use event listeners, don't await `spotify_stream_all_liked_songs()`
6. **CSP restrictions** - New external domains need addition to `tauri.conf.json`

## Testing & Debugging

- **Frontend errors**: Check browser DevTools (Ctrl+Shift+I in dev mode)
- **Backend errors**: Check terminal running `pnpm tauri dev`
- **OAuth issues**: Verify `.env` exists, check Spotify dashboard redirect URI
- **File loading issues**: Check Windows permissions, use `$MUSIC` scope in tauri.conf.json
- **Audio not playing**: Check CSP, verify `convertFileSrc()` usage, inspect console for CORS errors

## Key Files for Common Tasks

- **Add Spotify API call**: Edit `src-tauri/src/rspotify_auth.rs`, add `#[tauri::command]` function
- **Add UI component**: Check `src/lib/components/ui/` for existing components (shadcn-style)
- **Modify audio behavior**: Edit `src/lib/utils/audioManager.ts`
- **Add route**: Create `src/routes/your-route/+page.svelte`
- **Global state**: Add to existing class in `src/lib/state/` or create new `.svelte.ts` file
