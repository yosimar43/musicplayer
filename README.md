# 🎵 Music Player - Tauri + SvelteKit + Spotify

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)
![SvelteKit](https://img.shields.io/badge/SvelteKit-latest-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> Aplicación de escritorio moderna construida con **Tauri 2.x** y **Svelte 5** que integra datos de **Spotify** con reproducción de archivos locales.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Mejoras Recientes](#-mejoras-recientes-noviembre-2025)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API y Comandos](#-api-y-comandos)
- [Contribuir](#-contribuir)

---

## 📋 Descripción General

Music Player es una aplicación de escritorio multiplataforma que combina lo mejor de dos mundos:

- 🎵 **Reproducción Local**: Escanea y reproduce archivos de música de tu sistema
- 📊 **Datos de Spotify**: Visualiza tu biblioteca, playlists y estadísticas (solo lectura, sin reproducción)
- 🎨 **UI Moderna**: Diseño glassmorphism con animaciones fluidas
- ⚡ **Alto Rendimiento**: Backend en Rust con frontend reactivo

---

## ✨ Características

### 🎵 Reproducción de Audio

- ✅ Soporte multi-formato (MP3, FLAC, WAV, OGG, AAC, etc.)
- ✅ Extracción automática de metadata (ID3 tags)
- ✅ Cola de reproducción inteligente
- ✅ Modos shuffle y repeat (off/one/all)
- ✅ Controles del sistema operativo (MediaSession API)
- ✅ Control de volumen con mute
- ✅ Búsqueda y filtrado en tiempo real
- ✅ Prevención de duplicados en cola
- ✅ Manejo robusto de errores

### 📚 Integración con Spotify

- ✅ Autenticación OAuth 2.0 segura
- ✅ Visualización de biblioteca completa (2000+ tracks)
- ✅ Carga progresiva por batches (50 tracks)
- ✅ Exploración de playlists personales
- ✅ Top tracks y artistas por período
- ✅ Estadísticas detalladas (popularidad, géneros, etc.)
- ✅ **Descarga de canciones con spotdl** (requiere instalación)
- ✅ Progreso en tiempo real de descargas
- ✅ Descarga individual o masiva
- ⚠️ **Sin reproducción de Spotify** (solo visualización de datos)

### 🎨 Interfaz de Usuario

- ✅ Diseño glassmorphism moderno (2025)
- ✅ Animaciones suaves con Anime.js v4
- ✅ Tema oscuro con gradientes cyan/blue
- ✅ Componentes UI estilo shadcn (bits-ui + Tailwind)
- ✅ Responsive y adaptable
- ✅ Navegación por teclado en lista de tracks (Enter/Space/Tab)
- ✅ Controles multimedia del sistema operativo (MediaSession API)
- ✅ ARIA labels y accesibilidad completa

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Svelte 5)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │    State     │  │  Components  │      │
│  │  (SvelteKit) │  │  ($state)    │  │   (UI/UX)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │ invoke()                         │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Rust/Tauri)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Spotify    │  │  File System │  │    Audio     │      │
│  │    OAuth     │  │   Scanning   │  │   Metadata   │      │
│  │  (rspotify)  │  │  (walkdir)   │  │ (audiotags)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │     Spotify API             │
              │     Local File System       │
              └─────────────────────────────┘
```

**Flujo de Datos:**

1. **Frontend** → `invoke('comando')` → **Backend Rust**
2. **Backend** → Procesa y retorna datos → **Frontend**
3. **Frontend** → Actualiza estado reactivo (`$state`) → Re-render automático

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Svelte** | 5.x | Framework reactivo con Runes |
| **SvelteKit** | Latest | Meta-framework y routing |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Styling utility-first |
| **bits-ui** | Latest | Componentes UI accesibles |
| **Anime.js** | 4.x | Animaciones suaves |
| **Lucide Svelte** | Latest | Iconos modernos |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Tauri** | 2.x | Framework desktop |
| **Rust** | Stable | Backend seguro y rápido |
| **rspotify** | 0.13 | Cliente Spotify API |
| **audiotags** | Latest | Lectura de metadata |
| **walkdir** | Latest | Escaneo recursivo de archivos |
| **tokio** | Latest | Runtime async |
| **serde** | Latest | Serialización JSON |

---

## 📦 Instalación

### Prerrequisitos

- **Node.js** 18+ y **pnpm**
- **Rust** stable (instalado automáticamente por Tauri)
- **Visual Studio Build Tools** (Windows) o **build-essential** (Linux)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/musicplayer.git
cd musicplayer
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar Spotify (Opcional)

Si quieres usar la integración con Spotify, crea un `.env` en la raíz:

```env
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

**Obtener credenciales:**

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva app
3. Añade `http://localhost:8888/callback` como Redirect URI
4. Copia el Client ID y Client Secret

### 4. Ejecutar en desarrollo

```bash
pnpm tauri dev
```

### 5. Compilar para producción

```bash
pnpm tauri build
```

El instalador se generará en `src-tauri/target/release/bundle/`

---

## ⚙️ Configuración

### Carpeta de Música por Defecto

El app automáticamente detecta tu carpeta de música del sistema:

- **Windows**: `C:\Users\{user}\Music`
- **macOS**: `~/Music`
- **Linux**: `~/Music`

Puedes cambiarla desde la UI o configurar manualmente en `tauri.conf.json`:

```json
{
  "allowlist": {
    "fs": {
      "scope": ["$MUSIC/**"]
    }
  }
}
```

---

## 🚀 Uso

### Reproducir Música Local

1. Haz clic en **"Cargar Biblioteca"**
2. El app escaneará tu carpeta de música
3. Haz clic en cualquier track para reproducir
4. Usa los controles de reproducción en la parte inferior

### Conectar con Spotify

1. Ve a la pestaña **"Spotify"** o **"Playlists"**
2. Haz clic en **"Conectar con Spotify"**
3. Autoriza la app en tu navegador
4. ¡Explora tu biblioteca y playlists!

### Descargar Canciones de Spotify

> ✅ **Funcionalidad Completamente Operativa** - Descarga tus canciones de Spotify a MP3

#### Requisitos Previos

1. **Instalar spotdl**:
   ```bash
   pip install spotdl
   ```

2. **Actualizar dependencias** (recomendado para evitar errores):
   ```bash
   pip install --upgrade yt-dlp spotdl
   ```

3. **Verificar instalación**:
   ```bash
   spotdl --version
   ```

> 📚 Ver [SPOTDL_SETUP.md](./SPOTDL_SETUP.md) para instrucciones detalladas de instalación.

#### Descarga Individual

1. En la vista **"Playlists"**, haz hover sobre cualquier canción
2. Haz clic en el ícono de **descarga** (📥)
3. La canción se descargará automáticamente en `C:\Users\{tu_usuario}\Music\{Artista}\{Álbum}\{Título}.mp3`
4. El progreso se muestra en el panel de descargas

#### Descarga Masiva

1. En la vista **"Playlists"**, haz clic en el botón **"Descargar Todas"** en el header
2. El panel de progreso se expandirá automáticamente
3. Las canciones se descargan en segmentos de 10 con 2 segundos de espera entre cada una
4. Ubicación: `C:\Users\{tu_usuario}\Music\{Artista}\{Álbum}\{Título}.mp3`

**Características:**

- ✅ Progreso en tiempo real con eventos Tauri
- ✅ Control de segmentos y pausas automáticas (evita bloqueos de YouTube)
- ✅ Manejo de errores robusto con reintentos
- ✅ Animaciones fluidas con Anime.js
- ✅ Panel de descarga expandible/colapsable
- ✅ Contador de éxitos y fallos
- ✅ Logs detallados en consola del desarrollador

#### Solución de Problemas de Descarga

Si las descargas fallan con error `AudioProviderError` o `YT-DLP download error`:

1. **Actualiza yt-dlp** (YouTube cambia su API frecuentemente):
   ```bash
   pip install --upgrade yt-dlp spotdl
   ```

2. **Verifica la instalación**:
   ```bash
   yt-dlp --version  # Debe ser 2024.x.x o superior
   spotdl --version  # Debe ser 4.4.3 o superior
   ```

3. **Para errores persistentes**, consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) para soluciones avanzadas (cookies de YouTube, etc.)

> 💡 **Consejo**: Abre la consola del desarrollador (Ctrl+Shift+I) para ver logs detallados de cada descarga

### Atajos de Teclado

#### Navegación en Lista de Tracks

| Tecla | Acción |
|-------|--------|
| `Enter` | Reproducir track enfocado |
| `Space` | Reproducir track enfocado |
| `Tab` | Navegar entre tracks |

#### Controles del Sistema (MediaSession API)

Los controles multimedia de tu teclado o sistema operativo funcionan automáticamente:

- ⏯️ **Play/Pause** - Tecla multimedia o notificación del sistema
- ⏭️ **Siguiente** - Tecla multimedia
- ⏮️ **Anterior** - Tecla multimedia

> **Nota**: Los atajos globales adicionales (Space para play/pause, flechas para navegación, etc.) están planificados para futuras versiones.

---

## 🎉 Mejoras Recientes (Noviembre 2025)

### 🎧 **Descarga de Canciones de Spotify** (NUEVA - Completamente Funcional)

- ✅ **Integración con spotdl** - Backend Rust con comandos Tauri
- ✅ **Descarga individual** con un clic desde la UI
- ✅ **Descarga masiva** por segmentos con control de ritmo
- ✅ **Panel de progreso en tiempo real** con eventos Tauri
- ✅ **Organización automática** - `Music/{Artista}/{Álbum}/{Título}.mp3`
- ✅ **Detección de errores** de YouTube/yt-dlp con mensajes útiles
- ✅ **Logs detallados** en consola del desarrollador
- ✅ **Animaciones fluidas** para feedback visual
- ✅ **Documentación completa** - SPOTDL_SETUP.md y TROUBLESHOOTING.md

### 🔧 Optimizaciones de Performance

- ✅ **Eliminado `setInterval` redundante** en AudioManager
- ✅ **Batch updates optimizados** usando `untrack()` en Svelte 5
- ✅ **Threshold de 0.5s** para evitar actualizaciones innecesarias de tiempo
- ✅ **Cleanup automático** de event listeners con Map

### ❌ Manejo de Errores Robusto

- ✅ Nuevo campo `error` en PlayerState
- ✅ Try-catch en funciones async (`play()`, `setQueue()`)
- ✅ Propagación y logging detallado de errores
- ✅ Manejo en componentes con feedback al usuario
- ✅ Detección de errores de descarga con soluciones sugeridas

### ♿ Accesibilidad Mejorada

- ✅ ARIA labels en todos los botones e interactivos
- ✅ `role="button"` y `tabindex` apropiados
- ✅ Navegación por teclado (Enter/Space)
- ✅ `aria-pressed` para estados
- ✅ `aria-hidden` en elementos decorativos

### 🎨 CSS Limpio y Mantenible

- ✅ Clases reutilizables (`.gradient-cyan-blue`, `.bg-gradient-page`, etc.)
- ✅ Eliminados estilos inline redundantes
- ✅ Tema unificado con variables CSS
- ✅ Clase `.track-active` para estado de reproducción
- ✅ Scrollbar personalizada para panel de descargas

### 🎵 Funciones de Cola Mejoradas

- ✅ `removeFromQueue(index)` - Eliminar tracks específicos
- ✅ `clearQueue()` - Limpiar toda la cola
- ✅ `addToQueue()` - Prevención de duplicados
- ✅ Ajuste automático de índices

### 📊 Estados Derivados Útiles

- ✅ `formattedTime` y `formattedDuration` (MM:SS)
- ✅ `hasNext` y `hasPrevious` calculados automáticamente
- ✅ `queueLength` reactivo

### 🎮 MediaSession API

- ✅ Integración con controles del sistema operativo
- ✅ Actualización automática de metadata
- ✅ Soporte para notificaciones de reproducción

### 🧹 Cleanup de Recursos

- ✅ Método `destroy()` en AudioManager
- ✅ Limpieza automática con `beforeunload`
- ✅ Prevención de memory leaks

### 📝 Logging Consistente

- ✅ Logs con emojis informativos (✅, ❌, ⚠️, 🎵, 🔍, etc.)
- ✅ Contexto detallado en cada operación
- ✅ Facilita debugging y troubleshooting
- ✅ Logs de descarga con progreso y errores

### 🔮 Próximas Mejoras Planificadas

- 🔜 Atajos de teclado globales (Space, flechas, M, S, R)
- 🔜 Preload de siguiente track para transiciones instantáneas
- 🔜 Virtual scrolling para listas de 1000+ tracks
- 🔜 Ecualizador visual con Web Audio API
- 🔜 Persistencia de cola y posición en localStorage
- 🔜 Tests unitarios con Vitest

---

## 📁 Estructura del Proyecto

```
musicplayer/
├── src/                          # Frontend (SvelteKit + Svelte 5)
│   ├── lib/
│   │   ├── state/               # Estado global reactivo
│   │   │   ├── player.svelte.ts # Estado del reproductor
│   │   │   ├── library.svelte.ts # Biblioteca de música
│   │   │   └── ui.svelte.ts     # Estado de UI
│   │   ├── utils/
│   │   │   ├── audioManager.ts  # Gestión de audio HTML5
│   │   │   ├── musicLibrary.ts  # Helpers de biblioteca
│   │   │   └── youtubeStream.ts # Streaming de YouTube
│   │   ├── components/          # Componentes reutilizables
│   │   │   └── ui/              # Componentes UI (bits-ui)
│   │   └── animations.ts        # Animaciones Anime.js
│   ├── routes/                  # Rutas de SvelteKit
│   │   ├── +page.svelte        # Página principal
│   │   ├── library/            # Biblioteca local
│   │   ├── spotify/            # Integración Spotify
│   │   └── playlists/          # Gestión de playlists
│   └── styles/
│       └── app.css             # Estilos globales + Tailwind
├── src-tauri/                   # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── lib.rs              # Comandos de archivos
│   │   ├── rspotify_auth.rs    # OAuth + API Spotify
│   │   └── main.rs             # Entry point
│   ├── tauri.conf.json         # Configuración Tauri
│   └── Cargo.toml              # Dependencias Rust
├── .env                         # Variables de entorno
├── package.json                 # Dependencias Node
└── README.md                    # Este archivo
```

---

## 📡 API y Comandos

### Comandos Rust (invoke desde Frontend)

#### 🎧 Spotify

```typescript
// Autenticación
await invoke('spotify_authenticate');
await invoke('spotify_is_authenticated');
await invoke('spotify_logout');

// Perfil
const profile = await invoke<SpotifyProfile>('spotify_get_profile');

// Canciones
const tracks = await invoke<SpotifyTrack[]>('spotify_get_saved_tracks', {
  limit: 50,
  offset: 0
});

// Streaming progresivo (recomendado para +1000 tracks)
await listen('spotify-tracks-batch', (event) => {
  console.log('Batch recibido:', event.payload.tracks);
});
await invoke('spotify_stream_all_liked_songs');

// Playlists
const playlists = await invoke('spotify_get_playlists', { limit: 50 });

// Top artistas/tracks
const topArtists = await invoke('spotify_get_top_artists', {
  limit: 20,
  timeRange: 'short_term' // 'medium_term', 'long_term'
});
```

#### 📁 Archivos Locales

```typescript
// Escanear carpeta
const tracks = await invoke<Track[]>('scan_music_folder', {
  folderPath: 'C:\\Music'
});

// Obtener metadata
const metadata = await invoke<Track>('get_audio_metadata', {
  filePath: 'C:\\Music\\song.mp3'
});

// Carpeta por defecto
const defaultFolder = await invoke<string>('get_default_music_folder');
```

### Estado Reactivo (Frontend)

#### Player State

```typescript
import { player, play, pause, next, previous } from '@/lib/state';

// Propiedades reactivas
player.current        // Track actual
player.isPlaying      // Está reproduciendo?
player.queue          // Cola de reproducción
player.currentIndex   // Índice actual
player.volume         // Volumen (0-100)
player.progress       // Progreso (0-100)
player.currentTime    // Tiempo en segundos
player.duration       // Duración en segundos
player.isShuffle      // Modo shuffle
player.repeatMode     // 'off' | 'one' | 'all'

// Estados derivados
player.hasNext        // Hay siguiente track?
player.hasPrevious    // Hay track anterior?
player.formattedTime  // "3:45"
player.formattedDuration // "4:20"

// Funciones
play(track)           // Reproducir
pause()               // Pausar
next()                // Siguiente
previous()            // Anterior
setVolume(70)         // Cambiar volumen
seek(50)              // Buscar a 50%
toggleShuffle()       // Toggle shuffle
toggleRepeat()        // Cycle repeat
setQueue(tracks, 0)   // Establecer cola
addToQueue(track)     // Agregar a cola
removeFromQueue(2)    // Eliminar índice 2
clearQueue()          // Limpiar cola
```

#### Library State

```typescript
import { library, loadLibrary } from '@/lib/state';

library.tracks        // Array de tracks
library.isLoading     // Está cargando?
library.error         // Error message o null
library.totalTracks   // Contador de tracks
library.artists       // Array de artistas únicos
library.albums        // Array de álbumes únicos
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Estilo

- **TypeScript**: Usar tipos explícitos, evitar `any`
- **Svelte 5**: Usar Runes (`$state`, `$derived`, `$effect`)
- **Naming**: camelCase para variables, PascalCase para componentes
- **Commits**: Formato `Type: description` (Add, Fix, Update, Refactor, etc.)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/) - Framework desktop increíble
- [Svelte](https://svelte.dev/) - Reactivity sin igual
- [Spotify API](https://developer.spotify.com/) - Datos musicales
- [bits-ui](https://www.bits-ui.com/) - Componentes accesibles
- [Anime.js](https://animejs.com/) - Animaciones fluidas

---

## 📞 Contacto

¿Preguntas? ¿Sugerencias? ¡Abre un issue!

**⭐ Si te gusta el proyecto, dale una estrella en GitHub!**
