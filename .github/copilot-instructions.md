# Music Player - AI Coding Guide

## 🎯 Quick Reference

**Desktop app** con **Tauri 2.x** + **Svelte 5** combinando reproducción local con Spotify.

### Stack
- **Frontend**: Svelte 5 (runes only), SvelteKit 2.x, Tailwind CSS 4.x, shadcn-svelte
- **Backend**: Rust (Tauri 2.x), rspotify, audiotags, tokio, thiserror

---

## 🏗️ Arquitectura

### Patrón de Comunicación
```
Frontend → TauriCommands → Command (thin) → Service → Domain
              ↓
        Eventos Tauri (streaming)
```

### Estructura
```
src/lib/
├── stores/          # Estado global (singleton classes con $state/$derived)
├── hooks/           # Estado local por componente con lifecycle
└── utils/
    └── tauriCommands.ts  # ⚠️ TODOS los invokes aquí

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

### 1. Stores Globales (Singleton Classes)

**Cuándo usar**: Estado compartido entre componentes, servicios únicos, datos persistentes

```typescript
// src/lib/stores/player.store.ts
class PlayerStore {
  // Propiedades reactivas
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  isPlaying = $state(false);
  volume = $state(70);
  
  // Valores derivados
  hasNext = $derived(this.queue.length > 1);
  hasPrevious = $derived(this.currentIndex > 0);
  
  // Métodos
  playTrack(track: Track) {
    untrack(() => {  // Batch updates
      this.current = track;
      this.isPlaying = true;
    });
  }
}

export const playerStore = new PlayerStore();  // Singleton
```

**Stores disponibles**:
- `playerStore` - Reproducción y controles
- `libraryStore` - Biblioteca local (con eventos scan-progress)
- `musicDataStore` - Cache Last.fm
- `enrichmentStore` - Progreso enriquecimiento
- `playlistStore` - Playlists Spotify
- `uiStore` - Preferencias UI

### 2. Hooks (Estado Local)

**Cuándo usar**: Lógica con lifecycle, event listeners que requieren cleanup

**Hooks disponibles**:
- `useLibrary()` - Biblioteca local con eventos de escaneo
- `useSpotifyAuth()` - OAuth + profile
- `useSpotifyTracks()` - Liked songs (streaming progresivo)
- `useDownload()` - spotdl con progreso (auto-refresh de library)
- `useLibrarySync()` - Añade `isDownloaded` flag
- `usePersistedState()` - Persistencia localStorage
- `usePlayerPersistence()` - Persistir volumen

**Patrón de uso**:
```typescript
const library = useLibrary();
const tracks = $derived(library.tracks);  // Auto-reactive
```

### 3. Persistencia

```typescript
import { usePersistedState } from '@/lib/hooks';

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
import { TauriCommands } from '@/lib/utils/tauriCommands';

// Archivos
await TauriCommands.scanMusicFolder(path);
await TauriCommands.getDefaultMusicFolder();

// Spotify
await TauriCommands.authenticateSpotify();
await TauriCommands.streamAllLikedSongs();  // Streaming progresivo
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
  console.log(event.payload.current);  // Archivos procesados
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
    app_handle: AppHandle  // Para emitir eventos
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
        // Emit start
        app_handle?.emit("library-scan-start", { "path": folder_path });
        
        // ... escaneo ...
        
        // Emit progress cada 50 files
        if count % 50 == 0 {
            app_handle?.emit("library-scan-progress", {
                "current": count,
                "path": current_file
            });
        }
        
        // Emit complete
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
// Continuar sin lock
```

---

## 🔄 Flujos Críticos

### 1. Spotify → Download → Library Sync
```
1. useSpotifyTracks() obtiene liked songs (streaming)
2. Usuario descarga track
3. useDownload() escucha download-finished
4. Auto-llama libraryStore.loadLibrary()
5. useLibrarySync() añade isDownloaded flag
6. UI actualiza automáticamente
```

### 2. Library Scan con Progreso
```
1. Frontend: libraryStore.loadLibrary()
2. Frontend: Setup listeners (scan-start/progress/complete)
3. Backend: Emite eventos cada 50 files
4. Frontend: scanProgress reactivo actualiza UI
5. Frontend: Cleanup listeners en finally
```

### 3. Enriquecimiento Last.fm
```
1. libraryStore carga tracks
2. EnrichmentService.enrichTracksBatch()
3. Resultados cachean en musicDataStore
4. useAlbumArt() lee cache para portadas
```

---

## ⚠️ Common Pitfalls

- ❌ **Svelte 4 syntax**: Usar `$state` no `let`, `$derived` no `$:`
- ❌ **Direct invokes**: Siempre usar `TauriCommands`
- ❌ **Sin cleanup**: Llamar `cleanup()` en hooks con listeners
- ❌ **Path conversion**: Usar `convertFileSrc()` para archivos locales
- ❌ **Mutex deadlocks**: Liberar guards temprano
- ❌ **Destructuring proxies**: Rompe reactividad en Svelte 5

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

- `src/lib/stores/player.store.ts` - Audio player
- `src/lib/stores/library.store.ts` - Biblioteca (con scan progress)
- `src/lib/utils/tauriCommands.ts` - **Todos los invokes**
- `src/lib/hooks/usePlayerPersistence.svelte.ts` - Persistir volumen
- `src-tauri/src/commands/file.rs` - File commands
- `src-tauri/src/services/file.rs` - Scan con eventos

---

**⚡ Recuerda**: Svelte 5 runes only, TauriCommands wrapper obligatorio, cleanup de event listeners.
