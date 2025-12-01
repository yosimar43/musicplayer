# Music Player - AI Coding Guide

## 🎯 Quick Reference

**Desktop app** con **Tauri 2.x** + **Svelte 5** combinando reproducción local con Spotify.

### Stack
- **Frontend**: Svelte 5 (runes only), SvelteKit 2.x, Tailwind CSS 4.x, shadcn-svelte, GSAP
- **Backend**: Rust (Tauri 2.x), rspotify, audiotags, tokio, thiserror

---

## 🏗️ Arquitectura

### Patrón de Separación de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTES                            │
│  (UI pura, consume hooks para acciones)                     │
│  Ejemplo: MusicCard3D usa usePlayer hook                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        HOOKS                                │
│  (Orquestación, I/O, eventos, side effects)                 │
│  usePlayer, useLibrary, useSpotifyAuth, etc.                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       STORES                                │
│  (Estado PURO, sin I/O, sin side effects)                   │
│  playerStore, libraryStore, musicDataStore, etc.            │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Archivos
```
src/lib/
├── stores/          # Estado PURO (sin I/O, sin side effects)
│   ├── player.store.svelte.ts    # Estado reproducción
│   ├── library.store.svelte.ts   # Estado biblioteca
│   ├── musicData.store.svelte.ts # Cache Last.fm
│   └── ...
├── hooks/           # ORQUESTACIÓN (I/O, eventos, lifecycle)
│   ├── usePlayer.svelte.ts       # 🎵 Orquesta playerStore + audioManager
│   ├── useLibrary.svelte.ts      # Biblioteca con eventos Tauri
│   ├── useMasterHook.svelte.ts   # ⚠️ Orquestador central
│   └── ...
└── utils/
    ├── tauriCommands.ts          # ⚠️ TODOS los invokes aquí
    └── audioManager.ts           # Audio via callbacks (sin imports stores)

src-tauri/src/
├── commands/        # Thin controllers
├── services/        # Business logic
├── domain/          # DTOs
└── errors/          # thiserror types
```

---

## ⚡ Svelte 5 Runes (OBLIGATORIO)

**NO uses sintaxis de Svelte 4. Solo runes.**

### Core Runes
```typescript
// ✅ $state - Variables reactivas
let count = $state(0);
let user = $state({ name: 'John', age: 25 });

// ✅ $derived - Valores computados
let doubled = $derived(count * 2);
let isAdult = $derived(user.age >= 18);

// ✅ $derived.by - Computaciones complejas
let total = $derived.by(() => {
  let sum = 0;
  for (const item of items) sum += item.price;
  return sum;
});

// ✅ $effect - Efectos secundarios
$effect(() => {
  console.log('Count changed:', count);
  return () => console.log('cleanup');
});

// ✅ $props - Props de componentes
let { title, onClick, disabled = false } = $props();
```

### Eventos (Sin colon)
```svelte
<!-- ✅ Correcto -->
<button onclick={handleClick}>Click</button>

<!-- ❌ Incorrecto -->
<button on:click={handleClick}>Click</button>
```

---

## 🏪 Sistema de Estado

### 1. Stores = Estado PURO

**Regla**: Los stores contienen SOLO estado reactivo. Sin I/O, sin side effects, sin imports de audioManager o TauriCommands.

```typescript
// src/lib/stores/player.store.svelte.ts
class PlayerStore {
  // Estado reactivo
  current = $state<Track | null>(null);
  isPlaying = $state(false);
  volume = $state(70);
  currentTime = $state(0);
  duration = $state(0);
  
  // Derivados
  hasTrack = $derived(!!this.current);
  progress = $derived(this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0);
  
  // ✅ Solo setters simples (sin lógica de I/O)
  setCurrent(track: Track | null) { this.current = track; }
  setIsPlaying(value: boolean) { this.isPlaying = value; }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(100, value)); }
  setCurrentTime(time: number) { this.currentTime = time; }
  setDuration(duration: number) { this.duration = duration; }
}

export const playerStore = new PlayerStore();
```

**Reglas de Stores**:
1.  **Sin I/O**: No importar audioManager, TauriCommands, fetch, localStorage
2.  **Sin Listeners**: No usar `window.addEventListener`
3.  **Sin Referencias DOM**: No guardar `HTMLElement`
4.  **Solo Setters**: Métodos solo cambian estado, no ejecutan lógica

**Stores disponibles**:
- `playerStore` - Estado de reproducción (sin audio)
- `libraryStore` - Estado de biblioteca (sin Tauri)
- `musicDataStore` - Cache Last.fm
- `enrichmentStore` - Progreso enriquecimiento
- `playlistStore` - Playlists Spotify
- `uiStore` - Preferencias UI
- `searchStore` - Estado de búsqueda

### 2. Hooks = Orquestación

**Regla**: Los hooks manejan TODA la lógica de I/O, eventos y side effects. Orquestan stores con servicios externos.

```typescript
// src/lib/hooks/usePlayer.svelte.ts
export function usePlayer() {
  let isInitialized = $state(false);
  
  // Inicializar audioManager con callbacks que actualizan el store
  const initialize = () => {
    if (isInitialized) return;
    
    audioManager.initialize({
      onEnded: () => playerStore.setIsPlaying(false),
      onTimeUpdate: (time) => playerStore.setCurrentTime(time),
      onDurationChange: (duration) => playerStore.setDuration(duration),
      onError: (error) => console.error('Audio error:', error),
    });
    
    isInitialized = true;
  };

  // Orquestar store + audioManager
  const play = async (track: MusicFile, addToQueue = false) => {
    const src = convertFileSrc(track.path);
    await audioManager.play(src);
    playerStore.setCurrent(track);
    playerStore.setIsPlaying(true);
  };

  const pause = () => {
    audioManager.pause();
    playerStore.setIsPlaying(false);
  };

  return {
    // Estado reactivo (getters del store)
    get current() { return playerStore.current; },
    get isPlaying() { return playerStore.isPlaying; },
    get volume() { return playerStore.volume; },
    get progress() { return playerStore.progress; },
    get isInitialized() { return isInitialized; },
    
    // Acciones (orquestan store + audio)
    initialize,
    play,
    pause,
    resume: () => { audioManager.resume(); playerStore.setIsPlaying(true); },
    next: () => { /* lógica de cola */ },
    previous: () => { /* lógica de historial */ },
    seek: (percent: number) => audioManager.seek(percent),
    setVolume: (vol: number) => { audioManager.setVolume(vol); playerStore.setVolume(vol); },
  };
}
```

### 3. audioManager = Callbacks

**Regla**: audioManager NO importa stores. Usa callbacks para notificar cambios.

```typescript
// src/lib/utils/audioManager.ts
interface AudioCallbacks {
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onError?: (error: Error) => void;
}

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private callbacks: AudioCallbacks = {};

  initialize(callbacks: AudioCallbacks) {
    this.callbacks = callbacks;
    this.audio = new Audio();
    
    this.audio.addEventListener('ended', () => this.callbacks.onEnded?.());
    this.audio.addEventListener('timeupdate', () => {
      this.callbacks.onTimeUpdate?.(this.audio!.currentTime);
    });
    // ...más listeners
  }
  
  async play(src: string) {
    if (!this.audio) throw new Error('AudioManager not initialized');
    this.audio.src = src;
    await this.audio.play();
  }
  
  // ...más métodos
}

export const audioManager = new AudioManager();
```

### 4. Componentes = UI Pura

**Regla**: Los componentes usan HOOKS para acciones, no stores directamente para operaciones.

```svelte
<!-- src/lib/components/tracks/MusicCard3D.svelte -->
<script lang="ts">
  import { usePlayer } from '$lib/hooks';
  import type { MusicFile } from '$lib/types';
  
  interface Props {
    track: MusicFile;
    onPlay?: (track: MusicFile) => void;
    addToQueue?: boolean;
  }
  
  let { track, onPlay, addToQueue = false } = $props<Props>();
  
  const player = usePlayer();
  
  // Estado derivado local
  const isCurrentTrack = $derived(player.current?.path === track.path);
  const isPlaying = $derived(isCurrentTrack && player.isPlaying);
  
  const handlePlayTrack = async () => {
    if (onPlay) {
      onPlay(track);
    } else {
      await player.play(track, addToQueue);
    }
  };
</script>

<div 
  class="music-card" 
  class:is-playing={isPlaying}
  class:is-current={isCurrentTrack}
  onclick={handlePlayTrack}
>
  <!-- contenido -->
</div>
```

### 5. Hooks Disponibles

| Hook | Responsabilidad | Dependencias |
|------|-----------------|--------------|
| `usePlayer` | 🎵 Reproducción (store + audio) | audioManager |
| `useLibrary` | Biblioteca + eventos Tauri | TauriCommands |
| `useSpotifyAuth` | OAuth Spotify base | TauriCommands |
| `useSpotifyTracks` | Liked songs streaming | useSpotifyAuth |
| `useSpotifyPlaylists` | Playlists Spotify | useSpotifyAuth |
| `useDownload` | Descargas spotdl | useSpotifyAuth |
| `useLibrarySync` | Sync flags descarga | useLibrary |
| `usePlayerPersistence` | Persistir volumen | localStorage |
| `usePlayerUI` | UI + album art loader | musicDataStore |
| `useAlbumArt` | Cache portadas Last.fm | musicDataStore |
| `useTrackFilters` | Filtros y búsqueda | searchStore |
| `useUI` | Preferencias UI | uiStore |
| `useNavbarAutoHide` | Lógica DOM navbar | - |
| `usePersistedState` | Estado persistido | localStorage |

### 6. Master Hook (Orquestador Central)

**useMasterHook** coordina todos los hooks con dependencias correctas y cleanup automático.

```typescript
import { useMasterHook } from '$lib/hooks';

const master = useMasterHook();

// En +layout.svelte
$effect(() => {
  master.initializeApp();
  return () => master.cleanup();
});
```

**Dependencias forzadas**:
- `useSpotifyTracks` → requiere `useSpotifyAuth`
- `useSpotifyPlaylists` → requiere `useSpotifyAuth`
- `useDownload` → requiere `useSpotifyAuth`
- `useLibrarySync` → actualiza flags inmediatamente

### 7. Persistencia

```typescript
import { usePersistedState } from '$lib/hooks';

const theme = usePersistedState({
  key: 'ui-theme',
  defaultValue: 'dark',
  syncAcrossTabs: true
});

// Auto-guarda en localStorage
```

---

## 🔌 Tauri Integration

### TauriCommands (OBLIGATORIO)

**⚠️ NUNCA uses `invoke()` directo. Solo `TauriCommands`.**

```typescript
import { TauriCommands } from '$lib/utils/tauriCommands';

// Archivos
await TauriCommands.scanMusicFolder(path);
await TauriCommands.getDefaultMusicFolder();

// Spotify
await TauriCommands.authenticateSpotify();
await TauriCommands.streamAllLikedSongs();
await TauriCommands.getPlaylists();

// Descargas
await TauriCommands.downloadTrack(track);
await TauriCommands.downloadTracksSegmented(tracks, 10, 2);
```

### Eventos Tauri

```typescript
import { listen } from '@tauri-apps/api/event';

// Spotify streaming
await listen('spotify-tracks-batch', (event) => {
  // Batch de tracks
});

// Progreso escaneo
await listen('library-scan-progress', (event) => {
  console.log(event.payload.current);
});

// Progreso descarga
await listen('download-progress', (event) => {
  // Actualizar UI
});
```

---

## 🎨 UI Design System - "Azul Premium Suave"

### Paleta (Solo Tailwind)
**Fondos**: `slate-900`, `slate-800`, `slate-700`  
**Acentos**: `sky-400`, `sky-500`, `cyan-400`, `blue-400`  
**Texto**: `slate-300`, `slate-400`, blanco con opacidades

### Características
- ✅ Glassmorphism ligero
- ✅ Gradientes azul-gris profundos
- ✅ Ambient glow suave (sombras con cyan/blue)
- ✅ Borders redondeados (2xl+)
- ✅ Sombras amplias y difusas
- ✅ Animaciones GSAP para 3D effects

### Componentes (shadcn-svelte)
```typescript
import { Button } from '$lib/components/ui/button';
import { Card, CardContent } from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
```

**Disponibles**: Button, Card, Input, Select, Dialog, Dropdown, Tooltip, Badge, Progress, Skeleton, Tabs, y más.

---

## 🦀 Backend (Rust)

### Arquitectura de Comandos

```rust
// commands/file.rs - Thin controller
#[tauri::command]
pub fn scan_music_folder(
    folder_path: String,
    app_handle: AppHandle
) -> ApiResponse<Vec<MusicFile>> {
    FileService::scan_music_folder(&folder_path, Some(&app_handle))
        .map_err(|e| e.to_user_message())
}

// services/file.rs - Business logic + eventos
impl FileService {
    pub fn scan_music_folder(
        folder_path: &str,
        app_handle: Option<&AppHandle>
    ) -> Result<Vec<MusicFile>> {
        app_handle?.emit("library-scan-start", { "path": folder_path });
        
        // ... escaneo ...
        
        if count % 50 == 0 {
            app_handle?.emit("library-scan-progress", {
                "current": count,
                "path": current_file
            });
        }
        
        app_handle?.emit("library-scan-complete", { "total": count });
        
        Ok(files)
    }
}
```

### Patrones Importantes

**Emit Eventos**:
```rust
use tauri::{AppHandle, Emitter};
app_handle.emit("event-name", serde_json::json!({ "key": value }))?;
```

**Error Handling**:
```rust
// services/ - Usar ?
let data = api_call()?;

// commands/ - Convertir a user message
ServiceCall::method().map_err(|e| e.to_user_message())
```

**Mutex Guards** - Liberar temprano:
```rust
let data = {
    let guard = state.lock().unwrap();
    guard.data.clone()
};  // Guard dropped aquí
```

---

## 🔄 Flujos Críticos

### 1. Reproducción de Audio
```
1. Componente: player.play(track)
2. usePlayer: audioManager.play(src) + playerStore.setCurrent(track)
3. audioManager: Notifica via callbacks (onTimeUpdate, onEnded)
4. usePlayer: Actualiza store via callbacks
5. Componentes: Reaccionan a cambios en store
```

### 2. Spotify → Download → Library Sync
```
1. useMasterHook inicializa useSpotifyAuth
2. useSpotifyTracks() obtiene liked songs (streaming)
3. Usuario descarga track → useDownload()
4. useDownload() actualiza flags inmediatamente
5. useLibrarySync() añade isDownloaded flag
6. UI actualiza reactivamente
```

### 3. Library Scan con Progreso
```
1. useMasterHook inicializa useLibrary()
2. Frontend: useLibrary.loadLibrary()
3. Frontend: Setup listeners (scan-start/progress/complete)
4. Backend: Emite eventos cada 50 files
5. Frontend: scanProgress reactivo actualiza UI
6. Frontend: Cleanup automático via useMasterHook
```

### 4. Inicialización de App
```
1. +layout.svelte usa useMasterHook + usePlayer + useLibrary
2. usePlayer.initialize() configura callbacks
3. useLibrary.loadLibrary() carga biblioteca
4. Inicialización ordenada via useMasterHook
5. Cleanup automático al desmontar
```

---

## ⚠️ Common Pitfalls

- ❌ **Svelte 4 syntax**: Usar `$state` no `let`, `$derived` no `$:`
- ❌ **Store con I/O**: Stores solo estado puro, hooks manejan I/O
- ❌ **Direct invokes**: Siempre usar `TauriCommands`
- ❌ **Sin cleanup**: Llamar `cleanup()` en hooks con listeners
- ❌ **Path conversion**: Usar `convertFileSrc()` para archivos locales
- ❌ **Mutex deadlocks**: Liberar guards temprano
- ❌ **Destructuring proxies**: Rompe reactividad en Svelte 5
- ❌ **audioManager en stores**: Usar callbacks desde hooks

---

## 📝 Workflows

### Desarrollo
```bash
pnpm tauri dev     # App completa (recomendado)
pnpm dev           # Solo frontend (:1420)
```

### Spotify Setup
1. Crear app en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Redirect URI: `http://localhost:8888/callback`
3. `.env`: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

### spotdl Troubleshooting
```bash
pip install --upgrade yt-dlp spotdl
```

---

## 📚 Key Files

### Stores (Estado Puro)
- `src/lib/stores/player.store.svelte.ts` - Estado reproducción (sin audio)
- `src/lib/stores/library.store.svelte.ts` - Estado biblioteca (sin Tauri)
- `src/lib/stores/musicData.store.svelte.ts` - Cache Last.fm
- `src/lib/stores/search.store.svelte.ts` - Estado de búsqueda

### Hooks (Orquestación)
- `src/lib/hooks/usePlayer.svelte.ts` - 🎵 **Orquesta playerStore + audioManager**
- `src/lib/hooks/useMasterHook.svelte.ts` - Orquestador central
- `src/lib/hooks/useLibrary.svelte.ts` - Biblioteca con eventos Tauri
- `src/lib/hooks/useSpotifyAuth.svelte.ts` - OAuth base
- `src/lib/hooks/useDownload.svelte.ts` - Descargas spotdl
- `src/lib/hooks/usePlayerUI.svelte.ts` - UI con album art

### Componentes
- `src/lib/components/tracks/MusicCard3D.svelte` - Card 3D con GSAP (usa usePlayer)
- `src/lib/components/app/NavBarApp.svelte` - Navbar principal
- `src/lib/components/app/Logo.svelte` - Logo animado

### Utils
- `src/lib/utils/tauriCommands.ts` - **Todos los invokes**
- `src/lib/utils/audioManager.ts` - Audio via callbacks (sin stores)

### Backend
- `src-tauri/src/commands/file.rs` - File commands con eventos
- `src-tauri/src/services/file.rs` - Scan con progreso
- `src-tauri/src/services/spotify.rs` - OAuth y API

---

**⚡ Recuerda**: 
- Svelte 5 runes only
- Stores = estado puro (sin I/O)
- Hooks = orquestación (con I/O)
- audioManager = callbacks (sin stores)
- TauriCommands wrapper obligatorio
- Cleanup de event listeners
- Usar usePlayer hook en componentes
