# Music Player - AI Coding Guide

## Quick Reference

**Desktop music player** with **Tauri 2.x** + **Svelte 5** combining local file playback with Spotify integration and downloading capabilities.

### Tech Stack
- **Frontend**: Svelte 5 (runes only), SvelteKit 2.x, Tailwind CSS 4.x (CSS-first config), shadcn-svelte, GSAP
- **Backend**: Rust (Tauri 2.x), rspotify, audiotags, tokio, thiserror
- **Audio**: HTMLAudioElement via `audioManager` singleton
- **Downloads**: spotdl + yt-dlp for Spotify track downloads
- **Enrichment**: Last.fm API for album art and track metadata

---

## Architecture: 3-Layer Separation Pattern

**CRITICAL**: This project enforces strict separation of concerns across three layers:

```
COMPONENTS (UI Layer)
  ↓ consume hooks via getters
HOOKS (Orchestration Layer)  
  ↓ coordinate stores + services
STORES (State Layer - PURE)
```

### Layer Responsibilities

**Stores** (`src/lib/stores/*.store.svelte.ts`):
- ✅ ONLY reactive state (`$state`, `$derived`)
- ✅ Simple setter methods with `untrack()`
- ❌ NO I/O operations
- ❌ NO imports from `audioManager` or `TauriCommands`
- Example: `playerStore.setCurrentTrack(track)` just updates state

**Hooks** (`src/lib/hooks/*.svelte.ts`):
- ✅ ALL I/O operations (file system, Tauri commands, audio)
- ✅ Event listeners (Tauri events, audio callbacks)
- ✅ Lifecycle management (`initialize()`, `cleanup()`)
- ✅ Orchestrate stores + external services
- ✅ Singleton pattern: return same instance to avoid duplicate listeners
- Return getters for reactive state: `get current() { return store.current; }`
- Example: `usePlayer()` coordinates `playerStore` + `audioManager`

**Services** (`src/lib/services/*.service.ts`):
- ✅ Business logic separated from hooks (e.g., `EnrichmentService`)
- ✅ Pure functions that operate on stores/data
- ✅ No direct component interaction

**Components** (`.svelte` files):
- ✅ Consume hooks, NOT stores directly
- ✅ Use `$derived` for local computed state
- ❌ NO direct store imports in components (except read-only display)
- Example: `const player = usePlayer(); player.play(track);`

### Critical Files

- **`useMasterHook.svelte.ts`**: Central orchestrator, initializes all hooks in correct order. Use in `+layout.svelte`.
- **`audioManager.ts`**: Singleton HTMLAudioElement wrapper. NO store imports, uses callbacks.
- **`tauriCommands.ts`**: ⚠️ ALL Tauri invokes go here. Never use `invoke()` directly.
- **`+layout.svelte`**: App initialization with background effects (glassmorphism design)

---

## Svelte 5 Runes (MANDATORY)

**NO Svelte 4 syntax allowed. Only runes.**

### Core Runes
```typescript
// $state - Reactive variables
let count = $state(0);
let user = $state({ name: "John", age: 25 });

// $derived - Computed values
let doubled = $derived(count * 2);

// $effect - Side effects with cleanup
$effect(() => {
  console.log("Count changed:", count);
  return () => console.log("cleanup");
});

// $props - Component props
let { title, onclick, disabled = false } = $props();
```

### Events (No Colon Syntax)
```svelte
<!-- ✅ Correct -->
<button onclick={handleClick}>Click</button>

<!-- ❌ Wrong (Svelte 4) -->
<button on:click={handleClick}>Click</button>
```

### Reactivity Gotchas
```typescript
// ❌ Breaks reactivity - destructuring proxies
const { count, increment } = someStore;

// ✅ Maintain reactivity
const value = $derived(someStore.count);
// OR access directly: someStore.count

// ❌ In stores: mutating state without untrack causes warnings
setCurrent(track: Track) {
  this.current = track; // triggers effect loops
}

// ✅ Use untrack() for synchronous updates in stores
setCurrent(track: Track) {
  untrack(() => { this.current = track; });
}
```

---

## Tauri Integration

### TauriCommands Wrapper (MANDATORY)

**NEVER use `invoke()` directly.** All Tauri commands go through `TauriCommands`:

```typescript
import { TauriCommands } from "$lib/utils/tauriCommands";

// ✅ Correct
const tracks = await TauriCommands.scanMusicFolder(path);
const isAuth = await TauriCommands.checkSpotifyAuth();

// ❌ Wrong
const tracks = await invoke('scan_music_folder', { folderPath: path });
```

### Backend Architecture (Rust)

```
src-tauri/src/
├── commands/     # Thin controllers returning ApiResponse<T>
├── services/     # Business logic (pure functions)
├── domain/       # DTOs and type definitions
└── errors/       # thiserror-based typed errors
```

**Commands Pattern**:
```rust
#[tauri::command]
pub async fn scan_music_folder(folder_path: String) -> ApiResponse<Vec<MusicFile>> {
    service::scan_folder(&folder_path)
        .map_err(|e| e.to_user_message())
}
```

**Error Handling**: All errors use `AppError` (thiserror) → converted to `String` for frontend via `ApiResponse<T>`.

**Events**: Use `app_handle.emit("event-name", payload)` for progress updates (e.g., `download-progress`).



### Adding New Hooks

1. **Create store** (if needed) - pure state only
2. **Create hook** with singleton pattern:
```typescript
let _instance: HookReturn | null = null;

export function useMyFeature() {
  if (_instance) return _instance;
  
  function initialize() {
    // Setup event listeners
    listen('tauri-event', (payload) => {
      store.setData(payload);
    });
  }
  
  function cleanup() {
    // Remove listeners
  }
  
  _instance = {
    get state() { return store.state; },
    initialize,
    action: () => { /* I/O logic */ },
    cleanup
  };
  
  return _instance;
}
```
3. **Add to `useMasterHook`** for coordinated initialization

### Initialization Order (useMasterHook)
```typescript
async function initializeApp(): Promise<void> {
  // 1. Initialize audio player
  player.initialize();
  
  // 2. Initialize library with event listeners
  await library.initialize();
  
  // 3. Check Spotify auth
  const isAuthenticated = await auth.checkAuth();
  
  // 4. Load local library (always available)
  await library.loadLibrary();
  
  // 5. If authenticated, load Spotify data (parallel)
  if (isAuthenticated) {
    await download.setupEventListeners();
    await Promise.allSettled([
      spotifyTracks.loadTracks(),
      spotifyPlaylists.loadPlaylists()
    ]);
  }
}
```

---

## Styling: Tailwind CSS 4.x

**Theme configuration is CSS-first** in `src/styles/app.css`:

```css
@import "tailwindcss";

:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.208 0.042 265.755);
  /* ... */
}

.dark {
  --background: oklch(0.129 0.042 264.695);
  /* ... */
}
```

- **Don't look for `tailwind.config.js`** for theme values
- Use CSS custom properties with `oklch()` color space
- Dark mode via `.dark` class (CSS variables auto-switch)

### Design System
- **Glassmorphism**: Background effects in `+layout.svelte` (orbs, grid, noise)
- **Color palette**: Blue-gray base with cyan/indigo accents
- **Animations**: GSAP for complex animations, CSS transitions for simple ones

---

## Common Patterns

### Store Pattern
```typescript
class MyStore {
  data = $state<Data[]>([]);
  isLoading = $state(false);
  
  // Computed
  count = $derived(this.data.length);
  
  // Simple setters only
  setData(data: Data[]) {
    untrack(() => { this.data = data; });
  }
}

export const myStore = new MyStore();
```

### Hook Pattern with Singleton
```typescript
let _instance: UseFeatureReturn | null = null;

export function useFeature() {
  if (_instance) return _instance;
  
  function initialize() {
    // Setup event listeners
    listen('tauri-event', (payload) => {
      store.setData(payload);
    });
  }
  
  function cleanup() {
    // Remove listeners
  }
  
  _instance = {
    get data() { return store.data; },
    initialize,
    cleanup
  };
  
  return _instance;
}
```

### Component Pattern
```svelte
<script lang="ts">
  import { usePlayer } from '@/lib/hooks';
  
  let { track }: { track: Track } = $props();
  
  const player = usePlayer();
  
  // Local derived state
  const isPlaying = $derived(
    player.current?.path === track.path && player.isPlaying
  );
</script>

<button onclick={() => player.play(track)}>
  {isPlaying ? 'Pause' : 'Play'}
</button>
```

---

## Critical Gotchas

### ❌ DON'T
```typescript
// Store with I/O
class BadStore {
  async loadData() {
    const data = await invoke('get_data'); // ❌ NO
  }
}

// Direct invoke
await invoke('scan_music_folder', { path }); // ❌ NO

// audioManager importing stores
import { playerStore } from './stores'; // ❌ NO in audioManager

// Destructure reactive state
const { isPlaying } = player; // ❌ Breaks reactivity

// Svelte 4 syntax
let count = 0; // ❌ Use $state
$: doubled = count * 2; // ❌ Use $derived
on:click={handler} // ❌ Use onclick={handler}
```

### ✅ DO
```typescript
// Hook handles I/O
export function useLibrary() {
  async function loadData() {
    const data = await TauriCommands.getData(); // ✅
    store.setData(data); // ✅
  }
}

// audioManager uses callbacks
audioManager.initialize({
  onTimeUpdate: (time) => playerStore.setTime(time) // ✅
});

// Hook handles DOM effects
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen(); // ✅ DOM en hook
    uiStore.setFullscreen(true);
  }
}

// Access reactive state via getters
const isPlaying = $derived(player.isPlaying); // ✅

// Svelte 5 runes
let count = $state(0); // ✅
let doubled = $derived(count * 2); // ✅
```

### Rust Concurrency
- **Mutex deadlocks**: Drop guards early with explicit scope `{ let guard = mutex.lock(); }`
- **Event emissions**: Use `app_handle.emit_to(...)` for progress events

---

## GSAP Animations

### Core Principles (from MusicCard3D.svelte)

**CRITICAL**: Use `gsap.context()` for Svelte component lifecycle management:

```typescript
import gsap from 'gsap';

let ctx: gsap.Context | null = null;

onMount(() => {
  // Create context for all animations
  ctx = gsap.context(() => {
    // All GSAP code here is scoped to this context
    gsap.to(element, { x: 100, duration: 1 });
  }, componentRef); // optional scope
  
  return () => ctx?.revert(); // Auto-cleanup
});
```

### Timeline Pattern (Coordinated Animations)

```typescript
let hoverTimeline: gsap.core.Timeline | null = null;

function handleMouseEnter() {
  // Kill previous timeline to avoid conflicts
  hoverTimeline?.kill();
  
  // Create coordinated timeline
  hoverTimeline = gsap.timeline({
    defaults: { duration: 0.4, ease: "power2.out", overwrite: true }
  });
  
  // Add multiple tweens (all start at same time with position parameter 0)
  hoverTimeline.to(circle, { scale: 1.05, ease: "back.out(1.7)" }, 0)
    .to(album, { scale: 1.12, duration: 0.5, ease: "elastic.out(1, 0.5)" }, 0)
    .to(background, { filter: "blur(6px)", scale: 1.15 }, 0);
}

// Always cleanup
function cleanup() {
  hoverTimeline?.kill();
  hoverTimeline = null;
}
```

### quickTo() for Performance

Use `gsap.quickTo()` for repeated property updates (e.g., mousemove):

```typescript
let quickToRotX: gsap.QuickToFunc | null = null;
let quickToRotY: gsap.QuickToFunc | null = null;

function initQuickTo() {
  quickToRotX = gsap.quickTo(element, "rotationX", { 
    duration: 0.4, 
    ease: "power2.out" 
  });
  quickToRotY = gsap.quickTo(element, "rotationY", { 
    duration: 0.4, 
    ease: "power2.out" 
  });
}

function handleMouseMove(e: MouseEvent) {
  const rotateX = calculateRotation(e.clientY);
  const rotateY = calculateRotation(e.clientX);
  
  quickToRotX?.(rotateX); // Fast, no garbage collection
  quickToRotY?.(rotateY);
}
```

### Common Eases

- **Enter animations**: `"back.out(1.7)"` or `"elastic.out(1, 0.5)"`
- **Exit animations**: `"power3.out"` or `"power2.out"`
- **Smooth movement**: `"power2.inOut"`
- **Continuous rotation**: `"none"` (linear)

### Infinite Loops with Yoyo

```typescript
const idleTimeline = gsap.timeline({ 
  repeat: -1,  // Infinite
  yoyo: true,  // A-B-B-A pattern
  defaults: { ease: "sine.inOut" }
});

idleTimeline.to(element, { y: -4, duration: 1.8 });
```

### SVG Text on Circular Path

```svelte
<svg ref={titleSvgRef}>
  <defs>
    <path id={pathId} d="M 0,80 A 80,80 0 0,1 160,80" />
  </defs>
  <text ref={titleTextRef}>
    <textPath href="#{pathId}">
      {title}
    </textPath>
  </text>
</svg>
```

Animate with GSAP:
```typescript
gsap.to(titleSvgRef, { 
  rotation: 360, 
  duration: 20, 
  ease: "none", 
  repeat: -1,
  transformOrigin: "center center" 
});
```

### Critical Gotchas

❌ **DON'T**:
```typescript
// Forget to kill timelines
function animate() {
  gsap.to(element, { x: 100 }); // Creates new tween each call
}

// Mix quickTo with regular tweens on same property
gsap.to(element, { x: 100 });
quickToX(200); // Conflict!
```

✅ **DO**:
```typescript
// Always cleanup
timeline?.kill();

// Use overwrite: true for conflicting animations
gsap.to(element, { x: 100, overwrite: true });

// Kill quickTo references
quickToX = null;
```

### Performance Tips

1. **Use `will-change` in CSS** for animated elements
2. **`force3D: true`** for hardware acceleration (GSAP default)
3. **`lazy: false`** for ScrollTrigger if needed
4. **Kill animations** on component unmount via `ctx.revert()`

---

## Key Dependencies

- **rspotify**: OAuth + Spotify Web API (no playback, read-only)
- **audiotags**: Extract ID3/metadata from local audio files
- **spotdl**: Python CLI for downloading Spotify tracks (optional)
- **GSAP 3.x**: Advanced animations with Timeline, quickTo(), context()
- **bits-ui**: Headless UI primitives (shadcn-svelte foundation)

---

## Testing Strategy

- **Type safety**: `pnpm check` catches Svelte + TS errors
- **Rust checks**: `cd src-tauri && cargo check`
- **Manual testing**: Use `pnpm tauri:dev` with hot-reload
- **Store isolation**: Stores are pure → easily testable

---

## Project-Specific Conventions

1. **File naming**: `*.store.svelte.ts` for stores, `use*.svelte.ts` for hooks
2. **Imports**: Use `@/lib/*` alias (configured in `tsconfig.json`)
3. **Logging**: Console logs with emojis for visual scanning (🎵, ✅, ❌, ⚠️)
4. **Error messages**: User-friendly strings from Rust `AppError::to_user_message()`
5. **Singleton pattern**: All hooks return same instance to avoid duplicate listeners
6. **GSAP cleanup**: Always `kill()` timelines and `revert()` contexts on unmount

---

## Development Workflows

### Running the App
```bash
# Development (both frontend + Tauri hot-reload)
pnpm tauri:dev

# Type checking
pnpm check

# Build production
pnpm tauri:build

# Rust checks (in src-tauri/)
cargo check
```

### Frontend Structure
```
src/lib/
├── stores/          # Pure state ($state, $derived)
├── hooks/           # I/O + orchestration (singleton pattern)
├── services/        # Business logic (EnrichmentService)
├── utils/           # Pure utilities (tauriCommands, audioManager)
├── components/      # UI components (consume hooks)
├── api/             # External APIs (Last.fm)
└── types/           # TypeScript definitions
```

### Backend Structure (Rust)
```
src-tauri/src/
├── commands/        # Thin controllers (ApiResponse<T>)
├── services/        # Business logic (pure functions)
├── domain/          # DTOs and type definitions
├── errors/          # thiserror-based typed errors
└── utils/           # Utilities (path validation, etc.)
```

**Commands Pattern**:
```rust
#[tauri::command]
pub async fn scan_music_folder(folder_path: String) -> ApiResponse<Vec<MusicFile>> {
    service::scan_folder(&folder_path)
        .map_err(|e| e.to_user_message())
}
```

**Error Handling**: All errors use `AppError` (thiserror) → converted to `String` for frontend via `ApiResponse<T>`.

**Events**: Use `app_handle.emit("event-name", payload)` for progress updates (e.g., `download-progress`).

