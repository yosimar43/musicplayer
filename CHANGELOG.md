# Changelog - Music Player

Todos los cambios notables del proyecto serán documentados en este archivo.

## [Unreleased]

### 🎧 Descarga de Canciones de Spotify (Noviembre 10, 2025)

#### Agregado

- **Backend Rust (download_commands.rs)**:
  - `download_single_spotify_track()` - Descarga individual con spotdl
  - `download_spotify_tracks_segmented()` - Descarga masiva por segmentos
  - `check_spotdl_installed()` - Verificación de spotdl
  - Eventos Tauri: `download-progress`, `download-segment-finished`, `download-finished`, `download-error`
  - Logs detallados con emojis para depuración
  - Detección automática de errores de YouTube/yt-dlp

- **Frontend (playlists/+page.svelte)**:
  - Estado de descarga: `isDownloading`, `downloadProgress`, `downloadStats`, `spotdlInstalled`
  - `downloadSingleTrack()` - Función para descargar una canción
  - `downloadAllTracks()` - Función para descarga masiva
  - `checkSpotdlInstallation()` - Verificación desde frontend
  - Panel de progreso expandible/colapsable con animaciones
  - Botón de descarga en cada fila de track (hover)
  - Botón "Descargar Todas" en header
  - Event listeners para progreso en tiempo real
  - Logs detallados en consola del desarrollador

- **UI/UX**:
  - Panel glassmorphism con progreso visual
  - Animaciones con Anime.js para feedback
  - Scrollbar personalizada en lista de descargas
  - Contador de éxitos/fallos
  - Iconos de estado (✅, ❌, ⏳)

- **Documentación**:
  - `SPOTDL_SETUP.md` - Guía de instalación de spotdl
  - `TROUBLESHOOTING.md` - Solución de problemas comunes
  - README actualizado con instrucciones de descarga

#### Corregido

- Comando spotdl ahora usa `--output` en lugar de `--output-directory` (argumento incorrecto)
- Ruta de salida combina carpeta de música del sistema con template
- Detección de errores de YouTube en STDOUT de spotdl
- Carpeta de música del sistema se obtiene automáticamente (`get_default_music_folder`)

#### Mejorado

- Opciones de spotdl: `--audio youtube-music youtube` para mejor compatibilidad
- Logs en frontend y backend para depuración completa
- Manejo de errores con mensajes útiles y soluciones sugeridas
- Organización automática: `Music/{Artista}/{Álbum}/{Título}.mp3`

---

## Versión Anterior (Noviembre 8, 2025)

### 🔧 Optimizaciones de Performance

#### Corregido

- Eliminado `setInterval` redundante en AudioManager que causaba actualizaciones innecesarias
- Removida función duplicada `startTimeTracking()` que no existía
- Corregido tipo de `tabindex` de string a number en TrackListItem.svelte

#### Agregado

- MediaSession API para controles del sistema operativo
- Map de event listeners para cleanup automático
- Método `destroy()` en AudioManager
- Threshold de 0.5s para actualizaciones de tiempo

### ❌ Manejo de Errores

#### Agregado

- Campo `error` en PlayerState
- Try-catch en funciones async (`play()`, `setQueue()`)
- Logging detallado con emojis

### ♿ Accesibilidad

#### Agregado

- ARIA labels en todos los botones
- `role="button"` y `tabindex` en elementos interactivos
- Navegación por teclado (Enter/Space) en TrackListItem
- `aria-hidden` en elementos decorativos

### 🎨 CSS y Estilos

#### Agregado

- Clases reutilizables: `.gradient-cyan-blue`, `.bg-gradient-page`, `.text-gradient-cyan`
- `.bg-orb-cyan` y `.bg-orb-blue` para efectos de fondo
- `.track-active` para estado de reproducción

#### Corregido

- Eliminados estilos inline en +page.svelte
- Tema unificado con variables CSS

### 🎵 Funciones de Player

#### Agregado

- `removeFromQueue(index)` - Eliminar tracks específicos
- `clearQueue()` - Limpiar toda la cola
- Estados derivados: `formattedTime`, `formattedDuration`
- Optimización con `untrack()` en batch updates

#### Mejorado

- `play()` y `setQueue()` ahora son async con error handling
- `updateTime()` con threshold para evitar renders innecesarios
- `loadTrack()` con batch update usando `untrack()`

### 📝 Documentación

#### Agregado

- README actualizado con atajos de teclado reales
- Sección "Próximas Mejoras Planificadas"
- Documentación de todas las nuevas funciones

---

## Roadmap

### 🔮 Próximas Funcionalidades

#### Alta Prioridad

- [ ] Atajos de teclado globales
  - Space: Play/Pause
  - Flechas: Siguiente/Anterior
  - M: Mute/Unmute
  - S: Shuffle
  - R: Repeat cycle

- [ ] Preload de siguiente track
  - Carga en background para transiciones instantáneas
  - Cache inteligente

#### Media Prioridad

- [ ] Virtual scrolling para listas grandes
  - Soporte para 1000+ tracks sin lag
  - Integración con svelte-virtual

- [ ] Persistencia de estado
  - Cola guardada en localStorage
  - Posición de reproducción
  - Configuración del usuario

#### Baja Prioridad

- [ ] Ecualizador visual
  - Web Audio API
  - AnalyserNode con visualización en canvas
  - Presets de ecualizador

- [ ] Tests unitarios
  - Vitest para funciones de player
  - Playwright para E2E
  - Coverage > 80%

- [ ] Mejoras de descarga
  - Selector de calidad (128k, 192k, 320k)
  - Selector de formato (mp3, flac, ogg)
  - Configuración de cookies de YouTube
  - Descarga de álbumes completos
  - Descarga de playlists

---

## Formato

Este changelog sigue el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

### Tipos de Cambios

- `Agregado` - Para nuevas funcionalidades
- `Cambiado` - Para cambios en funcionalidades existentes
- `Obsoleto` - Para funcionalidades que serán eliminadas
- `Eliminado` - Para funcionalidades eliminadas
- `Corregido` - Para correcciones de bugs
- `Seguridad` - Para vulnerabilidades corregidas
