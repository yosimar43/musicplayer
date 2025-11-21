# 🎵 Music Player - Tauri + SvelteKit + Spotify

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)

> Aplicación de escritorio multiplataforma con **Tauri 2.x** y **Svelte 5** que combina reproducción de archivos locales con datos de **Spotify** y descarga de canciones.

---

## ✨ Características

### 🎵 Reproducción Local
- ✅ Multi-formato (MP3, FLAC, WAV, OGG, AAC)
- ✅ Extracción automática de metadata (ID3 tags)
- ✅ Enriquecimiento con Last.fm (portadas, géneros, bios)
- ✅ Escaneo con progreso en tiempo real
- ✅ Cola, shuffle y repeat
- ✅ MediaSession API integrada

### 📊 Integración Spotify
- ✅ Autenticación OAuth 2.0
- ✅ Biblioteca completa (streaming progresivo)
- ✅ Playlists y top tracks
- ✅ **Descarga con spotdl**
- ✅ Auto-sync: marca canciones descargadas

### 🎨 Interfaz
- ✅ Diseño glassmorphism con tema azul-gris
- ✅ Componentes accesibles (shadcn-svelte)
- ✅ Animaciones fluidas
- ✅ Persistencia de preferencias

---

## 🏗️ Arquitectura

### Frontend (Svelte 5 + Runes)
```
src/lib/
├── stores/          # Estado global (singleton classes)
│   ├── player.store.ts       # Reproductor y controles
│   ├── library.store.ts      # Biblioteca local
│   ├── musicData.store.ts    # Cache Last.fm
│   ├── enrichment.store.ts   # Progreso enriquecimiento
│   ├── playlist.store.ts     # Playlists de Spotify
│   └── ui.store.ts           # Preferencias UI
├── hooks/           # Estado local por componente
│   ├── useLibrary.svelte.ts
│   ├── useSpotifyTracks.svelte.ts
│   ├── useDownload.svelte.ts
│   ├── useLibrarySync.svelte.ts
│   ├── usePersistedState.svelte.ts
│   └── usePlayerPersistence.svelte.ts
└── utils/
    └── tauriCommands.ts  # ⚠️ TODOS los invokes van aquí
```

### Backend (Rust + Tauri)
```
src-tauri/src/
├── commands/        # Thin controllers
├── services/        # Lógica de negocio
│   ├── file.rs          # Escaneo + metadata
│   ├── spotify.rs       # OAuth + API
│   ├── download.rs      # spotdl wrapper
│   └── enrichment.rs    # (Opcional futuro)
├── domain/          # DTOs y modelos
└── errors/          # thiserror types
```

### Flujo de Datos
```
Frontend (Svelte)
    ↓ TauriCommands wrapper
Command (thin)
    ↓
Service (business logic)
    ↓
Domain/Utils → External APIs
    ↓
Eventos Tauri (progreso en tiempo real)
    ↓
Frontend actualiza stores reactivos
```

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

## 📖 Uso

### Reproducir Música Local
1. **Cargar Biblioteca** → Escanea tu carpeta de música
2. Observa el **progreso en tiempo real**
3. Click en cualquier track para reproducir

### Conectar con Spotify
1. **Spotify tab** → **"Conectar con Spotify"**
2. Autoriza en tu navegador
3. Tu biblioteca se carga progresivamente

### Descargar Canciones
1. Click en ícono 📥 junto a track/playlist
2. **"Descargar Todas"** para descarga masiva
3. Tracks se guardan en `Music/{Artista}/{Álbum}/{Título}.mp3`
4. **Auto-actualización**: librería local se refresca automáticamente

---

## 🎯 Patrones Clave

### Stores Globales (Singleton)
```typescript
// src/lib/stores/player.store.ts
class PlayerStore {
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  isPlaying = $state(false);
  
  hasNext = $derived(this.queue.length > 1);
  
  playTrack(track: Track) {
    untrack(() => {
      this.current = track;
      this.isPlaying = true;
    });
  }
}
export const playerStore = new PlayerStore();
```

### Hooks con Persistencia
```typescript
// Persistir volumen automáticamente
const persistedVolume = usePersistedState({
  key: 'player-volume',
  defaultValue: 70
});

// Sync bidireccional con playerStore
$effect(() => { playerStore.volume = persistedVolume.value; });
```

### TauriCommands (Centralizado)
```typescript
import { TauriCommands } from '@/lib/utils/tauriCommands';

// ✅ Correcto
const tracks = await TauriCommands.scanMusicFolder(path);

// ❌ Incorrecto
import { invoke } from '@tauri-apps/api/core';
const tracks = await invoke('scan_music_folder', { folderPath: path });
```

### Eventos de Progreso
```typescript
// Backend Rust emite
app.emit("library-scan-progress", { current: 150, path: "..." });

// Frontend escucha
await listen('library-scan-progress', (event) => {
  scanProgress.current = event.payload.current;
});
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Svelte 5** - Runes (`$state`, `$derived`, `$effect`)
- **SvelteKit 2.x** - Routing y SSR
- **TypeScript 5.x**
- **Tailwind CSS 4.x** 
- **shadcn-svelte** - Componentes UI
- **Anime.js** - Animaciones

### Backend
- **Tauri 2.x**
- **Rust** stable
- **rspotify** - Spotify Web API
- **audiotags** - Metadata extraction
- **tokio** - Async runtime
- **thiserror** - Error handling

---

## 🔧 Comandos

```bash
# Desarrollo
pnpm tauri dev

# Solo frontend
pnpm dev

# Lint y check
pnpm check
cd src-tauri && cargo check

# Build producción
pnpm tauri build
```

---

## 📄 Licencia

MIT License - Ver `LICENSE` para más detalles.

---

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/)
- [Svelte](https://svelte.dev/)
- [Spotify API](https://developer.spotify.com/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Last.fm API](https://www.last.fm/api)

---

**⭐ Dale star si te gusta el proyecto!**
