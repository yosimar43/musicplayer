# 🎵 Music Player - Tauri + SvelteKit

Un reproductor de música de escritorio moderno construido con **Tauri 2**, **SvelteKit** y **Spotify API**. Obtén todos los datos de tu biblioteca de Spotify e implementa tu propia lógica de reproducción.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![SvelteKit](https://img.shields.io/badge/SvelteKit-latest-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)

## ✨ Características

### 📚 Integración con Spotify (Solo Datos)
- **Autenticación OAuth 2.0**: Login seguro con Spotify
- **Biblioteca completa**: Acceso a todas tus canciones guardadas (2000+ soportadas)
- **Playlists**: Lista completa de playlists del usuario
- **Perfil**: Nombre, foto, país, tipo de cuenta
- **Top Artists & Tracks**: Tu música más escuchada
- **Metadata completa**: Nombre, artista, álbum, imágenes, duración, URI
- **Streaming optimizado**: Carga por batches de 50 canciones
- **Cache de tokens**: Sesión persistente

### 🎨 Interfaz de Usuario
- **Diseño moderno**: Glassmorphism con gradientes dinámicos
- **Animaciones fluidas**: Anime.js para transiciones suaves
- **Búsqueda en tiempo real**: Filtra canciones instantáneamente
- **Filtros avanzados**: Ordena por nombre, artista, álbum, duración
- **Estadísticas**: Total de canciones, artistas únicos, álbumes
- **Responsive**: Adaptable a diferentes tamaños de ventana
- **Tema oscuro**: Paleta de colores cyan/blue/green
- **Virtual scrolling**: Manejo eficiente de listas grandes

### �️ Características Desktop
- **Aplicación nativa**: Construida con Tauri (bajo consumo de recursos)
- **Escaneo de archivos locales**: Soporta MP3, M4A, FLAC, WAV, OGG, AAC, WMA
- **Carpeta de música por defecto**: Detección automática del sistema
- **Metadata de archivos**: Extracción con audiotags

## ⚠️ Reproducción de Música

**IMPORTANTE**: Esta aplicación **NO** incluye lógica de reproducción. Solo obtiene datos de Spotify.

### Lo que SÍ hace:
✅ Obtiene metadatos completos de Spotify
✅ Lista todas tus canciones guardadas
✅ Muestra playlists y estadísticas
✅ Proporciona UI completa con búsqueda y filtros

### Lo que NO hace:
❌ Reproducir música
❌ Streaming de audio
❌ Previews de 30 segundos
❌ Integración con servicios de streaming

### Implementa tu propia reproducción

En `src/routes/playlists/+page.svelte`, la función `playPreview()` te da acceso a:

```typescript
{
  id: string,              // ID único de Spotify
  name: string,            // Nombre de la canción
  artists: string[],       // Array de artistas
  album: string,           // Nombre del álbum
  album_image: string,     // URL de la imagen
  duration_ms: number,     // Duración en ms
  uri: string              // URI de Spotify (spotify:track:xxx)
}
```

**Usa estos datos para**:
- Buscar la canción en YouTube, SoundCloud, etc.
- Conectar con tu propio backend de streaming
- Implementar cualquier sistema de reproducción que prefieras

Ver `CLEAN_PLAYLIST_TEMPLATE.md` para más detalles.

## 🚀 Tecnologías

### Frontend
- **SvelteKit**: Framework con Svelte 5 (runes mode)
- **TypeScript**: Tipado estático
- **TailwindCSS v4**: Estilos utility-first
- **shadcn-svelte**: Componentes UI accesibles
- **Anime.js v4**: Animaciones
- **Lucide Icons**: Iconografía moderna

### Backend (Tauri)
- **Rust**: Lenguaje de sistemas de alto rendimiento
- **Tauri 2.x**: Framework de aplicaciones de escritorio
- **RSpotify 0.13**: Cliente de Spotify para Rust
- **audiotags**: Extracción de metadata de audio
- **walkdir**: Escaneo de directorios

### APIs
- **Spotify Web API**: Acceso a biblioteca de usuario (solo metadatos)

## 📦 Instalación

### Prerequisitos

1. **Node.js** (v18 o superior)
2. **pnpm** (gestor de paquetes)
3. **Rust** (para compilar Tauri)
4. **Credenciales de Spotify API**

### Configuración de Spotify API

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva aplicación
3. Copia tu **Client ID** y **Client Secret**
4. Añade `http://localhost:8888/callback` como Redirect URI
5. Crea un archivo `.env` en la raíz:

```env
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/music-player.git
cd music-player

# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm tauri dev

# Compilar para producción
pnpm tauri build
```

## 🎮 Uso

### Primera vez

1. **Iniciar sesión con Spotify**
   - Haz clic en "Conectar con Spotify"
   - Autoriza la aplicación en tu navegador
   - Serás redirigido automáticamente

2. **Cargar tu biblioteca**
   - La app carga automáticamente tus canciones guardadas
   - El progreso se muestra en tiempo real (0-100%)

3. **Reproducir música**
   - Haz clic en cualquier canción para reproducir su preview
   - Usa los controles de reproducción en la barra inferior

### Navegación

- **Home**: Vista principal con reproductor
- **Library**: Escanea y reproduce archivos locales
- **Playlists**: Accede a tus canciones de Spotify

### Búsqueda

- Usa el campo de búsqueda en el navbar (disponible globalmente)
- Filtra canciones por título, artista o álbum
- Los resultados se actualizan en tiempo real

### Atajos de teclado

- `Space`: Play/Pausa
- `→`: Siguiente canción
- `←`: Canción anterior

## 📁 Estructura del Proyecto

```
musicplayer/
├── src/                          # Código fuente del frontend
│   ├── components/               # Componentes de Svelte
│   │   ├── musicplayerapp.svelte # Reproductor principal
│   │   ├── Navbar.svelte         # Barra de navegación
│   │   ├── TrackListItem.svelte  # Item de lista de canciones
│   │   └── ...
│   ├── lib/
│   │   ├── api/
│   │   │   └── lastfm.ts         # Cliente de Last.fm API
│   │   ├── components/
│   │   │   ├── AudioPlayer.svelte
│   │   │   ├── AnimatedBackground.svelte
│   │   │   └── ui/               # Componentes shadcn
│   │   ├── state/
│   │   │   ├── player.svelte.ts  # Estado global del reproductor
│   │   │   └── library.svelte.ts # Estado de la biblioteca
│   │   ├── stores/
│   │   │   ├── searchStore.svelte.ts    # Estado de búsqueda
│   │   │   └── trackMetadata.ts         # Cache de metadata
│   │   ├── utils/
│   │   │   ├── audioManager.ts   # Gestión del HTML5 Audio
│   │   │   └── musicLibrary.ts   # Utilidades de biblioteca
│   │   └── types/
│   │       ├── music.ts          # Tipos de TypeScript
│   │       └── lastfm.ts
│   ├── routes/
│   │   ├── +layout.svelte        # Layout principal
│   │   ├── +page.svelte          # Página home
│   │   ├── library/              # Ruta de biblioteca local
│   │   ├── playlists/            # Ruta de Spotify
│   │   └── api/                  # API routes
│   └── styles/
│       └── app.css               # Estilos globales
│
├── src-tauri/                    # Código fuente del backend
│   ├── src/
│   │   ├── main.rs               # Punto de entrada
│   │   ├── lib.rs                # Biblioteca principal
│   │   └── rspotify_auth.rs      # Módulo de autenticación Spotify
│   ├── Cargo.toml                # Dependencias de Rust
│   └── tauri.conf.json           # Configuración de Tauri
│
├── static/                       # Archivos estáticos
├── .env                          # Variables de entorno (no en git)
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.js
```

## 🔧 Configuración Avanzada

### CSP (Content Security Policy)

La aplicación está configurada para permitir:
- Recursos locales (`asset:`, `https://asset.localhost`)
- Dominios de Spotify (`*.scdn.co`, `*.spotifycdn.com`)
- Blob URLs para audio local
- Conexiones API necesarias

### Last.fm Integration (Opcional)

Para metadata adicional, agrega a `.env`:

```env
LASTFM_API_KEY=tu_api_key
```

### Formatos de audio soportados

- **MP3**: MPEG Audio Layer 3
- **M4A/AAC**: Advanced Audio Coding
- **FLAC**: Free Lossless Audio Codec
- **WAV**: Waveform Audio File
- **OGG**: Ogg Vorbis
- **WMA**: Windows Media Audio

## 🎨 Personalización

### Temas de color

Edita `src/styles/app.css` para cambiar la paleta:

```css
:root {
  --primary: 200 100% 50%;      /* Cyan */
  --secondary: 270 100% 50%;    /* Purple */
  --accent: 160 100% 50%;       /* Green */
}
```

### Animaciones

Ajusta las animaciones en los componentes que usan Anime.js:

```typescript
animate({
  targets: '.card',
  translateY: [20, 0],
  opacity: [0, 1],
  duration: 600,
  easing: 'easeOutQuad'
});
```

## 🐛 Solución de Problemas

### No se reproducen las canciones

**Problema**: Las canciones no tienen preview disponible
**Solución**: Spotify solo proporciona previews de 30s para algunas canciones. No todas tienen preview_url.

### Error de autenticación

**Problema**: "Error al autenticar con Spotify"
**Solución**: 
1. Verifica tus credenciales en `.env`
2. Asegúrate de que `http://localhost:8888/callback` está en tus Redirect URIs
3. Cierra y reabre la aplicación

### Carga lenta de canciones

**Problema**: Las canciones tardan en cargar
**Solución**: El streaming progresivo carga en batches. Con 2000+ canciones puede tomar ~30 segundos.

### Audio no se reproduce

**Problema**: Error al reproducir audio

**Solución**:

1. Si la canción no tiene preview de Spotify, la app intentará YouTube Music automáticamente
2. Revisa la consola del navegador (F12) para errores
3. Asegúrate de tener conexión a internet
4. Verifica que la API de Piped esté disponible (https://pipedapi.kavin.rocks)

## 🎵 Cómo Funciona la Reproducción

La aplicación usa un sistema inteligente de fallback:

1. **Intenta primero Spotify Preview** (30 segundos)
   - Si la canción tiene `preview_url`, se reproduce directamente
   
2. **Fallback automático a YouTube Music** (canción completa)
   - Si no hay preview, busca en YouTube Music
   - Usa la API de Piped (privada, sin tracking)
   - Selecciona automáticamente el mejor stream de audio
   - Reproduce la canción completa en alta calidad

### Ventajas de esta implementación

- ✅ **Sin límites**: No depende de rate limiting de APIs públicas
- ✅ **Alta calidad**: Selección automática del mejor bitrate disponible
- ✅ **Privacidad**: Usa Piped, una alternativa privada a YouTube
- ✅ **Offline potencial**: Posibilidad de cachear búsquedas
- ✅ **Rendimiento**: Todo el procesamiento se hace en Rust nativo

## 📄 Licencia

MIT License - Ver archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/) - Framework de aplicaciones desktop
- [SvelteKit](https://kit.svelte.dev/) - Framework web
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - API de música
- [shadcn-svelte](https://www.shadcn-svelte.com/) - Componentes UI
- [Anime.js](https://animejs.com/) - Librería de animaciones

## 📞 Contacto

- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@example.com

---

**Nota**: Esta aplicación integra Spotify (previews de 30s) con YouTube Music (canciones completas) para ofrecerte la mejor experiencia de reproducción sin límites.
