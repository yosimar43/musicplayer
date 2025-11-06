# 🎵 Sistema de Estado Global - Music Player

## 📁 Estructura de Archivos

```
src/lib/
├── state/
│   ├── library.svelte.ts    # Estado de la biblioteca musical
│   ├── player.svelte.ts      # Estado del reproductor
│   ├── ui.svelte.ts          # Preferencias y UI
│   └── index.ts              # Re-exportaciones centralizadas
├── types/
│   └── music.ts              # Tipos TypeScript
└── utils/
    └── musicLibrary.ts       # Funciones de Tauri (legacy - usar state/)
```

## 🧩 Módulos de Estado

### 1️⃣ **library.svelte.ts** - Biblioteca Musical

**Responsabilidad:** Gestionar la colección de música

**Estado:**
- `tracks`: Array de canciones
- `isLoading`: Estado de carga
- `error`: Mensajes de error
- `currentDirectory`: Directorio actual
- `totalTracks`, `artists`, `albums`: Estadísticas derivadas

**Funciones:**
```typescript
await loadLibrary(directory)      // Carga desde directorio específico
await loadDefaultLibrary()         // Carga carpeta Music del sistema
searchTracks(query)                // Busca por título/artista/álbum
getTracksByArtist(artist)         // Filtra por artista
getTracksByAlbum(album)           // Filtra por álbum
```

### 2️⃣ **player.svelte.ts** - Reproductor

**Responsabilidad:** Control de reproducción

**Estado:**
- `current`: Canción actual
- `queue`: Cola de reproducción
- `isPlaying`: Estado play/pause
- `volume`: Volumen (0-100)
- `progress`: Progreso (0-100)
- `repeatMode`: "off" | "one" | "all"
- `isShuffle`: Modo aleatorio

**Funciones:**
```typescript
play(track)              // Reproduce una canción
pause()                  // Pausa
resume()                 // Reanuda
next()                   // Siguiente
previous()               // Anterior
setVolume(volume)        // Ajusta volumen
seek(percentage)         // Busca posición
toggleShuffle()          // Alterna shuffle
toggleRepeat()           // Cicla modo repeat
setQueue(tracks)         // Establece cola
addToQueue(track)        // Agrega a cola
```

### 3️⃣ **ui.svelte.ts** - Interfaz

**Responsabilidad:** Preferencias y estado visual

**Estado:**
- `theme`: "dark" | "light" | "system"
- `sidebarOpen`: Visibilidad sidebar
- `viewMode`: "grid" | "list" | "compact"
- `notifications`: Array de notificaciones
- `animationsEnabled`: Preferencia de animaciones

**Funciones:**
```typescript
setTheme(theme)          // Cambia tema
toggleSidebar()          // Alterna sidebar
setViewMode(mode)        // Cambia vista
notify(message)          // Muestra notificación
loadPreferences()        // Carga desde localStorage
savePreferences()        // Guarda en localStorage
```

## 🔄 Flujo de Datos

### Carga de Biblioteca

```
[Usuario clic "Cargar"]
    ↓
loadDefaultLibrary()
    ↓
invoke("get_default_music_folder")  ← Rust
    ↓
invoke("scan_music_folder", path)   ← Rust + walkdir + audiotags
    ↓
library.tracks = [...resultados]
    ↓
UI actualiza automáticamente (reactividad $state)
```

### Reproducción de Canción

```
[Usuario clic en canción]
    ↓
play(track)
    ↓
player.current = track
player.isPlaying = true
player.queue actualizado
    ↓
Componentes reactivos se actualizan
    ↓
(Futuro: invoke("play_audio", path) para playback real)
```

## 💻 Uso en Componentes

### Importación

```typescript
// Importar todo
import { library, player, ui } from '@/lib/state';

// Importar específico
import { loadLibrary, play, notify } from '@/lib/state';
```

### Ejemplo Completo

```svelte
<script lang="ts">
  import { library, player, loadDefaultLibrary, play } from '@/lib/state';
  
  async function handleLoad() {
    await loadDefaultLibrary();
  }
  
  function handlePlay(track) {
    play(track);
  }
</script>

<!-- Estadísticas reactivas -->
<p>Canciones: {library.totalTracks}</p>
<p>Artistas: {library.artists.length}</p>

<!-- Estado de carga -->
{#if library.isLoading}
  <p>Cargando...</p>
{/if}

<!-- Lista de canciones -->
{#each library.tracks as track}
  <div onclick={() => handlePlay(track)}>
    {track.title}
    {#if player.current?.path === track.path}
      <span>▶ Reproduciendo</span>
    {/if}
  </div>
{/each}

<!-- Controles -->
<button onclick={handleLoad}>Cargar Música</button>
```

## 🔐 Integración con Tauri

### Backend (Rust)

Los comandos ya están implementados en `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn scan_music_folder(folder_path: String) -> Result<Vec<MusicFile>, String>

#[tauri::command]
fn get_audio_metadata(file_path: String) -> Result<MusicFile, String>

#[tauri::command]
fn get_default_music_folder() -> Result<String, String>
```

### Frontend

El estado llama a estos comandos via `invoke()`:

```typescript
const result = await invoke<Track[]>("scan_music_folder", { 
  folderPath: directory 
});
```

## 📊 Ventajas del Sistema

✅ **Centralizado**: Un solo lugar para todo el estado  
✅ **Reactivo**: UI se actualiza automáticamente  
✅ **Type-safe**: TypeScript completo  
✅ **Modular**: Cada estado en su archivo  
✅ **Persistente**: Guarda preferencias en localStorage  
✅ **Derivado**: Cálculos automáticos (totalTracks, etc.)  

## 🚀 Próximos Pasos

1. **Audio Playback Real**
   - Integrar con HTMLAudioElement o Howler.js
   - Conectar player state con reproducción real

2. **Persistencia Avanzada**
   - Usar `tauri-plugin-store` para datos más complejos
   - Guardar última canción reproducida
   - Cache de biblioteca

3. **Playlists**
   - Crear módulo `playlists.svelte.ts`
   - CRUD de playlists
   - Sincronización con archivo/DB

4. **Favoritos**
   - Marcar canciones favoritas
   - Sincronizar con metadata

## 📝 Ejemplo de Uso Real

Ver implementación en:
- `src/routes/+page.svelte` - Página principal con biblioteca
- `src/components/musicplayerapp.svelte` - Player controls
- `src/routes/test/+page.svelte` - Tests de integración
