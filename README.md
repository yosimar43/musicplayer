# 🎵 Music Player - Tauri + SvelteKit + Spotify

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)

> Aplicación de escritorio multiplataforma con **Tauri 2.x** y **Svelte 5** que combina reproducción de archivos locales con datos de **Spotify** y descarga de canciones.

---

## ✨ Características

### 🎵 Reproducción Local
- ✅ **Auto-carga de biblioteca**: Recuerda tu última carpeta y carga al inicio.
- ✅ **Persistencia**: Volumen y preferencias guardadas automáticamente.
- ✅ Multi-formato (MP3, FLAC, WAV, OGG, AAC).
- ✅ Extracción automática de metadata (ID3 tags).
- ✅ Enriquecimiento con Last.fm (portadas, géneros, bios).
- ✅ Escaneo con progreso en tiempo real.
- ✅ Cola, shuffle y repeat.
- ✅ MediaSession API integrada.

### 📊 Integración Spotify
- ✅ Autenticación OAuth 2.0.
- ✅ Biblioteca completa (streaming progresivo).
- ✅ Playlists y top tracks.
- ✅ **Descarga con spotdl**.
- ✅ Auto-sync: marca canciones descargadas.

### 🎨 Interfaz
- ✅ Diseño glassmorphism con tema azul-gris.
- ✅ Componentes accesibles (shadcn-svelte).
- ✅ **Tailwind CSS 4**: Estilos modernos y performantes.
- ✅ Animaciones fluidas (CSS Transitions + GSAP).

---

## 🏗️ Arquitectura

### Patrón de Separación de Responsabilidades

El proyecto sigue un patrón claro de **separación de responsabilidades**:

```
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTES                            │
│  (UI pura, consume hooks para acciones)                     │
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
│  (Estado puro, sin I/O, sin side effects)                   │
│  playerStore, libraryStore, musicDataStore, etc.            │
└─────────────────────────────────────────────────────────────┘
```

### Frontend (Svelte 5 + Runes)

```
src/lib/
├── stores/          # Estado PURO (sin I/O, sin side effects)
│   ├── player.store.svelte.ts       # Estado de reproducción
│   ├── library.store.svelte.ts      # Estado de biblioteca
│   ├── musicData.store.svelte.ts    # Cache Last.fm
│   ├── enrichment.store.svelte.ts   # Progreso enriquecimiento
│   ├── playlist.store.svelte.ts     # Playlists de Spotify
│   ├── ui.store.svelte.ts           # Preferencias UI
│   ├── search.store.svelte.ts       # Estado de búsqueda
│   └── index.ts
├── hooks/           # ORQUESTACIÓN (I/O, eventos, lifecycle)
│   ├── useMasterHook.svelte.ts      # ⚠️ Orquestador central
│   ├── usePlayer.svelte.ts          # 🎵 Orquesta playerStore + audioManager
│   ├── useLibrary.svelte.ts         # Biblioteca con eventos Tauri
│   ├── useSpotifyAuth.svelte.ts     # OAuth base
│   ├── useSpotifyTracks.svelte.ts   # Liked songs (streaming)
│   ├── useSpotifyPlaylists.svelte.ts
│   ├── useDownload.svelte.ts        # spotdl con progreso
│   ├── useLibrarySync.svelte.ts     # Sync flags descarga
│   ├── usePersistedState.svelte.ts  # Persistencia localStorage
│   ├── usePlayerPersistence.svelte.ts
│   ├── usePlayerUI.svelte.ts        # UI con album art
│   ├── useTrackFilters.svelte.ts
│   ├── useUI.svelte.ts
│   ├── useAlbumArt.svelte.ts        # Cache portadas Last.fm
│   ├── useNavbarAutoHide.svelte.ts
│   └── index.ts
├── utils/
│   ├── tauriCommands.ts  # ⚠️ TODOS los invokes
│   └── audioManager.ts   # Audio via callbacks (sin imports de stores)
└── components/
    └── tracks/
        └── MusicCard3D.svelte  # Usa usePlayer hook
```

### Backend (Rust + Tauri)
```
src-tauri/src/
├── commands/        # Thin controllers
├── services/        # Lógica de negocio
│   ├── file.rs          # Escaneo + metadata
│   ├── spotify.rs       # OAuth + API
│   └── download.rs      # spotdl wrapper
├── domain/          # DTOs y modelos
└── errors/          # thiserror types
```

---

## 🏪 Sistema de Estado

### Stores = Estado Puro

Los stores contienen **solo estado reactivo**, sin lógica de I/O ni side effects.

```typescript
// src/lib/stores/player.store.svelte.ts
class PlayerStore {
  // Estado reactivo
  current = $state<Track | null>(null);
  isPlaying = $state(false);
  volume = $state(70);
  
  // Derivados
  hasTrack = $derived(!!this.current);
  
  // Setters simples (sin I/O)
  setCurrent(track: Track | null) {
    this.current = track;
  }
  
  setIsPlaying(value: boolean) {
    this.isPlaying = value;
  }
}

export const playerStore = new PlayerStore();
```

### Hooks = Orquestación

Los hooks manejan **toda la lógica de I/O**, eventos y side effects.

```typescript
// src/lib/hooks/usePlayer.svelte.ts
export function usePlayer() {
  // Inicializa audioManager con callbacks
  const initialize = () => {
    audioManager.initialize({
      onEnded: () => playerStore.setIsPlaying(false),
      onTimeUpdate: (time) => playerStore.setCurrentTime(time),
      // ...más callbacks
    });
  };

  // Orquesta store + audioManager
  const play = async (track: MusicFile, addToQueue = false) => {
    const src = convertFileSrc(track.path);
    await audioManager.play(src);
    playerStore.setCurrent(track);
    playerStore.setIsPlaying(true);
  };

  return {
    // Estado reactivo del store
    get current() { return playerStore.current; },
    get isPlaying() { return playerStore.isPlaying; },
    
    // Acciones
    initialize,
    play,
    pause: () => { audioManager.pause(); playerStore.setIsPlaying(false); },
    // ...
  };
}
```

### Componentes = UI Pura

Los componentes usan hooks para acciones, no stores directamente.

```svelte
<script lang="ts">
  import { usePlayer } from '$lib/hooks';
  
  const player = usePlayer();
  
  // Estado derivado local
  const isCurrentTrack = $derived(player.current?.path === track.path);
  const isPlaying = $derived(isCurrentTrack && player.isPlaying);
</script>

<button onclick={() => player.play(track)}>
  {isPlaying ? 'Pause' : 'Play'}
</button>
```

---

## 🎼 Sistema de Hooks

### usePlayer (Nuevo)

Hook principal para reproducción, orquesta `playerStore` + `audioManager`.

```typescript
const player = usePlayer();

// Estado (reactivo)
player.current      // Track actual
player.isPlaying    // Estado reproducción
player.volume       // Volumen (0-100)
player.progress     // Progreso (0-100)

// Acciones
player.initialize() // Inicializar audio
player.play(track)  // Reproducir track
player.pause()      // Pausar
player.resume()     // Reanudar
player.next()       // Siguiente
player.previous()   // Anterior
player.seek(50)     // Ir a 50%
player.setVolume(80)// Cambiar volumen
```

### useMasterHook (Orquestador)

Coordina todos los hooks con dependencias correctas y cleanup automático.

```typescript
// En +layout.svelte
const master = useMasterHook();

$effect(() => {
  master.initializeApp();
  return () => master.cleanup();
});
```

### Hooks Disponibles

| Hook | Responsabilidad | Dependencias |
|------|-----------------|--------------|
| `usePlayer` | Reproducción audio | audioManager |
| `useLibrary` | Biblioteca local + eventos Tauri | TauriCommands |
| `useSpotifyAuth` | OAuth Spotify | TauriCommands |
| `useSpotifyTracks` | Liked songs streaming | useSpotifyAuth |
| `useSpotifyPlaylists` | Playlists Spotify | useSpotifyAuth |
| `useDownload` | Descargas spotdl | useSpotifyAuth |
| `useLibrarySync` | Sync flags descarga | useLibrary |
| `usePlayerPersistence` | Persistir volumen | localStorage |
| `usePlayerUI` | UI + album art | musicDataStore |
| `useAlbumArt` | Cache portadas | musicDataStore |
| `useTrackFilters` | Filtros búsqueda | searchStore |
| `useUI` | Preferencias UI | uiStore |
| `useNavbarAutoHide` | DOM navbar | - |
| `usePersistedState` | Estado persistido | localStorage |

---

## 🎨 UI Components

### MusicCard3D

Tarjeta 3D con animaciones GSAP para mostrar tracks.

```svelte
<script lang="ts">
  import MusicCard3D from '$lib/components/tracks/MusicCard3D.svelte';
</script>

<MusicCard3D 
  track={track}
  onPlay={(t) => console.log('Playing:', t)}
  addToQueue={false}
/>
```

**Características**:
- ✅ Animación 3D con GSAP
- ✅ Click para reproducir (usa usePlayer)
- ✅ Estado visual: `is-current`, `is-playing`
- ✅ Carga de album art desde Last.fm
- ✅ Accesible (keyboard navigation)

### Navbar Components

- **Logo.svelte**: Logo animado con reactor effect
- **SearchBar.svelte**: Búsqueda con efectos de foco
- **NavLinks.svelte**: Enlaces con indicadores activos

---

## 🚀 Instalación

### Prerrequisitos
- **Node.js** 18+ y **pnpm**
- **Rust** stable (instalado automáticamente por Tauri)
- **Python 3.8+** con pip (para spotdl, opcional)

### Pasos

1. **Clonar e instalar:**
   ```bash
   git clone https://github.com/tu-usuario/musicplayer.git
   cd musicplayer
   pnpm install
   ```

2. **Configurar Spotify (opcional):**
   Crea `.env` en la raíz:
   ```env
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
   ```

3. **Instalar spotdl (para descargas):**
   ```bash
   pip install spotdl yt-dlp
   ```

4. **Desarrollo:**
   ```bash
   pnpm tauri dev
   ```

5. **Build producción:**
   ```bash
   pnpm tauri build
   ```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo (Frontend + Backend)
pnpm tauri dev

# Chequeo de Tipos (Svelte + TS)
pnpm check

# Chequeo de Rust
cd src-tauri && cargo check

# Build
pnpm tauri build
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Svelte 5** - Runes (`$state`, `$derived`, `$effect`)
- **SvelteKit 2.x** - Routing y SSR
- **TypeScript 5.x**
- **Tailwind CSS 4.x** - Styling
- **shadcn-svelte** - Componentes UI
- **GSAP** - Animaciones avanzadas

### Backend
- **Tauri 2.x**
- **Rust** stable
- **rspotify** - Spotify Web API
- **audiotags** - Metadata extraction
- **tokio** - Async runtime

---

## 📄 Licencia

MIT License - Ver `LICENSE` para más detalles.
