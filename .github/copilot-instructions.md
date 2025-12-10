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

## GSAP Animations (v3.x)

### Core Principles

**CRITICAL**: Use `gsap.context()` for Svelte component lifecycle management to ensure proper cleanup:

```typescript
import gsap from 'gsap';

let ctx: gsap.Context | null = null;

onMount(() => {
  // Create context for all animations
  ctx = gsap.context(() => {
    // All GSAP code here is scoped to this context
    gsap.to(element, { x: 100, duration: 1 });
  }, componentRef); // optional scope
  
  return () => ctx?.revert(); // Auto-cleanup on unmount
});
```

### Essential GSAP Methods

#### Animation Methods
- **`gsap.to(target, vars)`**: Animate TO end values
- **`gsap.from(target, vars)`**: Animate FROM start values  
- **`gsap.fromTo(target, fromVars, toVars)`**: Animate FROM → TO with full control
- **`gsap.set(target, vars)`**: Instantly set properties (no animation)

#### Timing & Control
- **`gsap.timeline(vars)`**: Create coordinated animation sequences
- **`gsap.delayedCall(delay, callback, params)`**: Schedule function calls
- **`.kill()`**: Stop/remove tweens or timelines
- **`.pause()` / `.play()` / `.resume()`**: Control playback
- **`.progress(value)`**: Jump to specific progress (0-1)
- **`.reverse()`**: Play animation backwards

#### Performance Optimizers
- **`gsap.quickTo(target, property, vars)`**: Ultra-fast repeated property updates (mousemove, scroll)
- **`gsap.quickSetter(target, property, unit)`**: Fast property setter without tweening
- **`gsap.ticker`**: GSAP's internal RAF loop for custom logic

#### Utility Methods
- **`gsap.utils.clamp(min, max, value)`**: Constrain value between min/max
- **`gsap.utils.interpolate(start, end, progress)`**: Calculate value at progress
- **`gsap.utils.mapRange(inMin, inMax, outMin, outMax, value)`**: Remap value ranges
- **`gsap.utils.random(min, max, snap, array)`**: Random number/array element
- **`gsap.utils.snap(increment, value)`**: Snap value to nearest increment
- **`gsap.utils.toArray(selector)`**: Convert selector/NodeList to array
- **`gsap.utils.wrap(values, value)`**: Loop value through array
- **`gsap.utils.distribute(config)`**: Generate stagger values for multiple targets

### Timeline Pattern (Coordinated Animations)

Timelines sequence multiple animations with precise timing control:

```typescript
let hoverTimeline: gsap.core.Timeline | null = null;

function handleMouseEnter() {
  // Kill previous timeline to avoid conflicts
  hoverTimeline?.kill();
  
  // Create coordinated timeline
  hoverTimeline = gsap.timeline({
    defaults: { duration: 0.4, ease: "power2.out", overwrite: true },
    onComplete: () => console.log('Animation done')
  });
  
  // Add tweens with position parameter (3rd arg)
  hoverTimeline
    .to(circle, { scale: 1.05, ease: "back.out(1.7)" }, 0)        // at 0s
    .to(album, { scale: 1.12, ease: "elastic.out(1, 0.5)" }, 0)   // at 0s (parallel)
    .to(background, { filter: "blur(6px)", scale: 1.15 }, 0)      // at 0s (parallel)
    .to(text, { opacity: 1 }, "+=0.2");                           // 0.2s after previous
}

// Always cleanup
function cleanup() {
  hoverTimeline?.kill();
  hoverTimeline = null;
}
```

**Position Parameter** (3rd argument in timeline methods):
- `0` - absolute time (seconds)
- `"+=1"` - relative to previous end
- `"-=0.5"` - overlap by 0.5s
- `"<"` - start of previous
- `">"` - end of previous
- `"label"` - start at label created with `.addLabel("label")`

### quickTo() for High-Performance Updates

Use for **repeated property updates** (mousemove, scroll, drag):

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
  
  quickToRotX?.(rotateX); // No garbage collection overhead
  quickToRotY?.(rotateY);
}
```

### Common Easing Functions

- **Enter animations**: `"back.out(1.7)"`, `"elastic.out(1, 0.5)"`, `"expo.out"`
- **Exit animations**: `"power3.out"`, `"power2.out"`, `"expo.in"`
- **Smooth movement**: `"power2.inOut"`, `"sine.inOut"`
- **Continuous/linear**: `"none"`
- **Bounce**: `"bounce.out"`, `"bounce.inOut"`
- **Steps**: `"steps(12)"` (frame-by-frame)

**Ease visualizer**: https://gsap.com/docs/v3/Eases

### Infinite Loops & Yoyo

```typescript
// Continuous rotation
gsap.to(element, { 
  rotation: 360, 
  duration: 10, 
  ease: "none",  // linear for smooth rotation
  repeat: -1     // infinite
});

// Back-and-forth oscillation
const idleTimeline = gsap.timeline({ 
  repeat: -1,  // Infinite
  yoyo: true,  // A-B-B-A pattern (forward then reverse)
  defaults: { ease: "sine.inOut" }
});

idleTimeline.to(element, { y: -4, duration: 1.8 });
```

### SVG Text on Circular Path

```svelte
<svg bind:this={titleSvgRef}>
  <defs>
    <path id={pathId} d="M 0,80 A 80,80 0 0,1 160,80" />
  </defs>
  <text>
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

### Special Properties & Modifiers

- **`stagger`**: Delay between animating multiple targets
  ```typescript
  gsap.to(".box", { 
    x: 100, 
    stagger: 0.1  // 0.1s between each
    // OR stagger: { each: 0.1, from: "center", grid: "auto" }
  });
  ```

- **`keyframes`**: CSS-like keyframe arrays
  ```typescript
  gsap.to(element, {
    keyframes: [
      { x: 100, duration: 1 },
      { y: 50, duration: 0.5 },
      { rotation: 180, duration: 1 }
    ]
  });
  ```

- **`modifiers`**: Transform values during animation
  ```typescript
  gsap.to(element, {
    x: 500,
    modifiers: {
      x: gsap.utils.snap(50)  // snap to increments of 50
    }
  });
  ```

### ScrollTrigger Integration

```typescript
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

gsap.to(element, {
  x: 500,
  scrollTrigger: {
    trigger: element,
    start: "top center",    // when top of trigger hits center of viewport
    end: "bottom top",
    scrub: 1,               // smooth scrubbing with 1s catch-up
    markers: true,          // debug markers (remove in production)
    pin: true,              // pin element during scroll
    toggleActions: "play pause resume reset"
  }
});
```

### Critical Gotchas

❌ **DON'T**:
```typescript
// Forget to kill timelines - causes memory leaks
function animate() {
  gsap.to(element, { x: 100 }); // Creates new tween each call
}

// Mix quickTo with regular tweens on same property
gsap.to(element, { x: 100 });
quickToX(200); // Conflict!

// Forget to cleanup on unmount
onMount(() => {
  gsap.to(element, { x: 100 });
  // Missing return cleanup!
});

// Mutate state inside gsap callbacks without untrack()
gsap.to(element, {
  onUpdate: () => {
    myState = progress; // Triggers Svelte reactivity loops
  }
});
```

✅ **DO**:
```typescript
// Always cleanup timelines/tweens
let tl: gsap.core.Timeline | null = null;
onMount(() => {
  tl = gsap.timeline();
  return () => tl?.kill();
});

// Use overwrite for conflicting animations
gsap.to(element, { x: 100, overwrite: true });

// Kill quickTo references on cleanup
onMount(() => {
  const qt = gsap.quickTo(element, "x");
  return () => { qt = null; };
});

// Use untrack() for state updates in GSAP callbacks
import { untrack } from 'svelte';
gsap.to(element, {
  onUpdate: () => {
    untrack(() => { myState = progress; });
  }
});

// Use gsap.context() for automatic cleanup
onMount(() => {
  const ctx = gsap.context(() => {
    gsap.to(".box", { x: 100 });
    gsap.to(".circle", { rotation: 360 });
  }, container);
  
  return () => ctx.revert(); // Kills all animations in context
});
```

### Performance Best Practices

1. **CSS `will-change`**: Hint browser for animated properties
   ```css
   .animated { will-change: transform, opacity; }
   ```

2. **Hardware acceleration**: GSAP enables `force3D: true` by default (uses GPU)

3. **Batch DOM reads/writes**: Use `gsap.ticker` or `.call()` to batch measurements

4. **Kill unused animations**: Use `.kill()` when animations are no longer needed

5. **Use `quickTo()` for repeated updates**: Avoids garbage collection overhead

6. **Avoid layout thrashing**: Don't read layout properties (offsetWidth, getBoundingClientRect) during animation loops

7. **ScrollTrigger optimization**: Use `scrub: true` (boolean) for instant scrubbing without smoothing

### Plugin Usage

Register plugins before use:
```typescript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, Draggable, Flip);
```

**Common Plugins**:
- **ScrollTrigger**: Scroll-driven animations
- **Draggable**: Drag/throw interactions
- **Flip**: Layout transitions (FLIP technique)
- **MotionPath**: Animate along SVG paths
- **SplitText**: Split text into chars/words/lines (Club GreenSock)
- **MorphSVG**: Morph between SVG shapes (Club GreenSock)

### Config & Defaults

```typescript
// Global config
gsap.config({
  autoSleep: 60,        // garbage collection after 60s idle
  force3D: true,        // enable hardware acceleration
  nullTargetWarn: false // disable "invalid target" warnings
});

// Set defaults for all future tweens
gsap.defaults({
  duration: 1,
  ease: "power2.out"
});

// Timeline-specific defaults
const tl = gsap.timeline({
  defaults: { duration: 0.5, ease: "power1.inOut" }
});
```

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

