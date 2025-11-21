# 🎵 Music Player - Tauri + SvelteKit + Spotify

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)
![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> Aplicación de escritorio multiplataforma construida con **Tauri 2.x** y **Svelte 5** que integra reproducción de archivos locales con datos de **Spotify** y descarga de canciones.

---

## 📋 Características

### 🎵 Reproducción Local
- ✅ Soporte multi-formato (MP3, FLAC, WAV, OGG, AAC)
- ✅ Extracción automática de metadata (ID3 tags)
- ✅ Cola de reproducción con shuffle y repeat
- ✅ Controles del sistema (MediaSession API)
- ✅ Búsqueda y filtrado en tiempo real

### 📊 Integración Spotify
- ✅ Autenticación OAuth 2.0
- ✅ Visualización de biblioteca completa (carga progresiva)
- ✅ Playlists, top tracks y artistas
- ✅ **Descarga de canciones con spotdl**
- ✅ Progreso en tiempo real con eventos Tauri

### 🎨 Interfaz Moderna
- ✅ Diseño glassmorphism con animaciones fluidas
- ✅ Tema oscuro con gradientes cyan/blue
- ✅ Componentes UI accesibles (bits-ui + Tailwind)
- ✅ Responsive y adaptable

---

## 🏗️ Arquitectura

### Frontend (Svelte 5)

- **Stores Reactivos**: `src/lib/stores/` - Estado tipado por dominio (`$state`, `$derived`)
- **Hooks**: `src/lib/hooks/` - Estado local por componente
- **Componentes**: `src/lib/components/` - UI reutilizable
- **Rutas**: `src/routes/` - SvelteKit file-based routing

### Backend (Rust + Tauri)

- **Commands**: `src-tauri/src/commands/` - Thin controllers
- **Services**: `src-tauri/src/services/` - Lógica de negocio
- **Domain**: `src-tauri/src/domain/` - Modelos y DTOs
- **Errors**: `src-tauri/src/errors/` - Manejo centralizado con `thiserror`

### Flujo de Datos
```
Frontend → TauriCommands → Command → Service → Domain/Utils → External APIs
                ↓
         Eventos Tauri (streaming progresivo)
```

### 🏪 Arquitectura de Estado Consolidada

**Versión 2.0** - Arquitectura unificada con stores reactivos usando **Svelte 5 runes**.

#### ✅ Beneficios

- **Sin duplicación**: Eliminada la confusión entre `state/` y `stores/`
- **Reactividad nativa**: `$state`, `$derived`, `$effect` para estado tipado
- **Mantenibilidad**: Una sola fuente de verdad para cada dominio
- **Performance**: Actualizaciones granulares y eficientes

#### 📁 Estructura de Stores

```text
src/lib/stores/
├── player.store.ts      # Reproducción, cola, controles
├── ui.store.ts          # Tema, navegación, notificaciones
├── library.store.ts     # Biblioteca local de archivos
├── musicData.store.ts   # Cache Last.fm (artistas, álbumes, tracks)
├── search.store.ts      # Estado de búsqueda y filtros
└── enrichment.store.ts  # Progreso de enriquecimiento de datos
```

#### 🔄 Patrón de Estado Global

```typescript
class PlayerState {
  // Estado reactivo
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  isPlaying = $state(false);
  
  // Valores derivados
  hasNext = $derived(this.queue.length > 1);
  
  // Acciones
  playTrack(track: Track) { /* ... */ }
}

// Export singleton
export const playerStore = new PlayerState();
```

#### 🔄 Comunicación Reactiva

```typescript
// ✅ Comunicación directa entre stores
class DownloadManager {
  async completeDownload() {
    // Después de descarga exitosa
    await libraryStore.loadLibrary(undefined, true);
  }
}

// Los componentes reaccionan automáticamente
$: tracks = libraryStore.tracks; // Reactividad automática
$: isPlaying = playerStore.isPlaying; // Sin eventos manuales
```

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** 18+ y **pnpm**
- **Rust** stable 1.70+ (instalado automáticamente por Tauri)
- **Python 3.8+** con pip (para spotdl, opcional)

### Pasos

1. **Clonar e instalar dependencias:**

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

4. **Ejecutar en desarrollo:**

   ```bash
   pnpm tauri dev
   ```

5. **Compilar para producción:**

   ```bash
   pnpm tauri build
   ```

---

## 📖 Uso

### Reproducir Música Local

1. Haz clic en **"Cargar Biblioteca"**
2. El app escaneará tu carpeta de música del sistema
3. Haz clic en cualquier track para reproducir

### Conectar con Spotify
1. Ve a la pestaña **"Spotify"** o **"Playlists"**
2. Haz clic en **"Conectar con Spotify"**
3. Autoriza la app en tu navegador

### Descargar Canciones
1. En la vista de playlists, haz clic en el ícono de descarga (📥)
2. O usa **"Descargar Todas"** para descarga masiva
3. Las canciones se guardan en `Music/{Artista}/{Álbum}/{Título}.mp3`

**Solución de problemas:** Si las descargas fallan, actualiza yt-dlp:
```bash
pip install --upgrade yt-dlp spotdl
```

---

## 🎯 Sistema de Estado

### Stores Reactivos Tipados
**Ubicación:** `src/lib/stores/`

```typescript
import { libraryStore, enrichmentStore, musicDataStore } from '@/lib/stores';

// Estado reactivo por dominio
libraryStore.tracks      // Biblioteca local
enrichmentStore.progress // Progreso Last.fm
musicDataStore.trackCache // Cache de datos
```

### Hooks (Estado Local)
**Ubicación:** `src/lib/hooks/`

```typescript
import {
  useLibrary,        // Gestión de biblioteca
  useSpotifyAuth,    // Autenticación OAuth
  useSpotifyTracks,  // Tracks con streaming progresivo
  useDownload,       // Descargas con spotdl
  useUI              // UI y notificaciones
} from '@/lib/hooks';
```

// En componentes Svelte 5
const library = useLibrary();
const tracks = $derived(library.tracks);  // ✅ Usar $derived
```

### ⚠️ Reglas Svelte 5
- ✅ Usar `$state` para estado reactivo
- ✅ Usar `$derived` para valores computados
- ✅ Usar `$effect` para efectos secundarios
- ❌ NO destructure proxies reactivos (rompe reactividad)

---

## 📡 API Tauri

### Wrapper Centralizado
**Todos los comandos en:** `src/lib/utils/tauriCommands.ts`

```typescript
import { TauriCommands } from '@/lib/utils/tauriCommands';

// Archivos locales
await TauriCommands.scanMusicFolder('C:\\Music');
await TauriCommands.getDefaultMusicFolder();

// Spotify Auth
await TauriCommands.authenticateSpotify();
await TauriCommands.checkSpotifyAuth();

// Spotify Data
await TauriCommands.streamAllLikedSongs();  // Streaming progresivo
await TauriCommands.getPlaylists();
await TauriCommands.getTopTracks(20, 'medium_term');

// Descargas
await TauriCommands.downloadTrack(track);
await TauriCommands.downloadTracksSegmented(tracks, 10, 2);
```

### Eventos Tauri
```typescript
import { listen } from '@tauri-apps/api/event';

// Spotify streaming
await listen('spotify-tracks-batch', (event) => {
  // Procesar batch de tracks
});

// Progreso de descargas
await listen('download-progress', (event) => {
  // Actualizar UI
});
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Svelte 5** - Framework reactivo con Runes
- **SvelteKit 2.x** - Meta-framework y routing
- **TypeScript 5.x** - Type safety
- **Tailwind CSS 4.x** - Styling utility-first
- **bits-ui** - Componentes accesibles
- **Anime.js 4.x** - Animaciones

### Backend
- **Tauri 2.x** - Framework desktop
- **Rust** - Backend seguro y performante
- **rspotify** - Cliente Spotify Web API
- **audiotags** - Extracción de metadata
- **tokio** - Runtime async
- **tracing** - Logging estructurado
- **thiserror** - Manejo de errores tipados

---

## 📁 Estructura del Proyecto

```
musicplayer/
├── src/                          # Frontend (SvelteKit)
│   ├── lib/
│   │   ├── stores/              # Stores reactivos tipados
│   │   ├── hooks/                # Hooks personalizados
│   │   ├── components/          # Componentes UI
│   │   └── utils/               # Utilidades (TauriCommands)
│   └── routes/                  # Rutas SvelteKit
├── src-tauri/                   # Backend (Rust)
│   └── src/
│       ├── commands/            # Thin controllers
│       ├── services/            # Business logic
│       ├── domain/              # Modelos y DTOs
│       └── errors/              # Manejo de errores
└── package.json
```

---

## 🔧 Comandos de Desarrollo

```bash
# Desarrollo completo
pnpm tauri dev

# Solo frontend
pnpm dev

# Verificar backend
cd src-tauri && cargo check

# Build producción
pnpm tauri build
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Estilo
- **TypeScript**: Tipos explícitos, evitar `any`
- **Svelte 5**: Usar Runes (`$state`, `$derived`, `$effect`)
- **Commits**: Formato `Type: description` (Add, Fix, Update, etc.)

---

## 📄 Licencia

MIT License - Ver `LICENSE` para más detalles.

---

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/) - Framework desktop
- [Svelte](https://svelte.dev/) - Reactivity sin igual
- [Spotify API](https://developer.spotify.com/) - Datos musicales
- [bits-ui](https://www.bits-ui.com/) - Componentes accesibles

---

**⭐ Si te gusta el proyecto, dale una estrella en GitHub!**
