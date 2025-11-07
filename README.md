# 🎵 Music Player - Tauri + SvelteKit + Spotify

Aplicación de escritorio para gestionar tu biblioteca de Spotify. Obtén todos tus datos de Spotify e implementa tu propia lógica de reproducción.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![SvelteKit](https://img.shields.io/badge/SvelteKit-latest-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)

## ✨ Características

### 📚 Integración con Spotify

- **OAuth 2.0**: Autenticación segura
- **Biblioteca completa**: Accede a todas tus canciones guardadas (2000+)
- **Streaming progresivo**: Carga por batches de 50 canciones
- **Playlists**: Lista completa del usuario
- **Perfil**: Información detallada de la cuenta
- **Top Artists & Tracks**: Música más escuchada
- **Cache de sesión**: Login persistente

### 🎨 Interfaz de Usuario

- **Diseño moderno**: Glassmorphism con gradientes
- **Animaciones**: Transiciones con Anime.js
- **Búsqueda y filtros**: En tiempo real
- **Estadísticas**: Canciones, artistas, álbumes
- **Ordenamiento**: Por nombre, artista, álbum, duración, popularidad
- **Responsive**: Adaptable a diferentes tamaños
- **Tema oscuro**: Paleta cyan/blue/purple
- **Paginación virtual**: Manejo eficiente de listas grandes

### 🎵 Datos de Canciones Disponibles

Al hacer clic en una canción, obtienes:

```typescript
{
  id: string,              // ID único de Spotify
  name: string,            // Nombre de la canción
  artists: string[],       // Array de artistas
  album: string,           // Nombre del álbum
  album_image: string,     // URL de la imagen
  duration_ms: number,     // Duración en milisegundos
  uri: string,             // URI de Spotify
  popularity: number,      // 0-100
  external_url: string     // Link a Spotify
}
```

## 🚀 Tecnologías

### Frontend

- **SvelteKit**: Framework con Svelte 5 (runes)
- **TypeScript**: Tipado estático
- **TailwindCSS v4**: Estilos utility-first
- **shadcn-svelte**: Componentes UI
- **Anime.js**: Animaciones
- **Lucide Icons**: Iconografía

### Backend

- **Tauri 2.x**: Framework de escritorio
- **Rust**: Alto rendimiento
- **RSpotify 0.13**: Cliente de Spotify
- **audiotags**: Metadata de archivos
- **walkdir**: Escaneo de directorios

## 📦 Instalación

### Prerequisitos

1. **Node.js** v18+
2. **pnpm**
3. **Rust** (para Tauri)
4. **Credenciales de Spotify API**

### Configuración de Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una aplicación
3. Obtén **Client ID** y **Client Secret**
4. Añade `http://localhost:8888/callback` como Redirect URI
5. Crea `.env` en la raíz:

```env
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

### Instalación

```bash
# Clonar
git clone https://github.com/tu-usuario/music-player.git
cd music-player

# Instalar dependencias
pnpm install

# Desarrollo
pnpm tauri dev

# Compilar
pnpm tauri build
```

## 🎯 Uso

### Desarrollo

```bash
pnpm tauri dev
```

### Producción

```bash
pnpm tauri build
```

El ejecutable estará en `src-tauri/target/release/`

## 📂 Estructura del Proyecto

```
musicplayer/
├── src/                          # Frontend (SvelteKit)
│   ├── routes/
│   │   ├── +page.svelte         # Página principal
│   │   ├── playlists/           # Vista de playlists
│   │   ├── library/             # Biblioteca
│   │   └── spotify/             # Integración Spotify
│   ├── lib/
│   │   ├── components/          # Componentes UI
│   │   ├── state/               # Estado global
│   │   └── utils/               # Utilidades
│   └── styles/                  # Estilos CSS
├── src-tauri/                   # Backend (Rust)
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── lib.rs              # Comandos Tauri
│   │   └── rspotify_auth.rs   # OAuth Spotify
│   └── Cargo.toml              # Dependencias Rust
└── README.md
```

## 🔧 Comandos Tauri Disponibles

### Spotify

- `spotify_authenticate()` - Iniciar OAuth
- `spotify_get_profile()` - Perfil del usuario
- `spotify_get_playlists(limit)` - Playlists
- `spotify_stream_all_liked_songs()` - Streaming de canciones
- `spotify_get_top_artists(limit)` - Top artistas
- `spotify_get_top_tracks(limit)` - Top canciones
- `spotify_logout()` - Cerrar sesión
- `spotify_is_authenticated()` - Estado de autenticación

### Archivos Locales

- `scan_music_folder(path)` - Escanear carpeta
- `get_audio_metadata(path)` - Metadata de archivo
- `get_default_music_folder()` - Carpeta Music del sistema

## 💡 Implementar Reproducción

La función `playPreview()` en `src/routes/playlists/+page.svelte` está lista para que implementes tu lógica:

```typescript
async function playPreview(track: SpotifyTrack) {
  console.log('🎵 Seleccionada:', track.name);
  
  // TODO: Implementa aquí tu lógica de reproducción
  // Opciones:
  // 1. Buscar en YouTube/SoundCloud con track.name + track.artists
  // 2. Usar tu propio backend de streaming
  // 3. Conectar con otro servicio de música
  // 4. Reproducir archivos locales si existen
}
```

## 🐛 Solución de Problemas

### No se cargan las canciones

- Verifica que `.env` tenga las credenciales correctas
- Revisa que el Redirect URI sea exactamente `http://localhost:8888/callback`
- Comprueba que tienes canciones guardadas en Spotify

### Error de autenticación

- Elimina el cache: Borra carpeta de cache de Tauri
- Vuelve a autorizar la aplicación
- Verifica que las credenciales sean válidas

### La app no compila

```bash
# Limpiar y reconstruir
cd src-tauri
cargo clean
cd ..
pnpm install
pnpm tauri dev
```

## 📝 Notas

- **Sin reproducción integrada**: Esta app solo obtiene datos de Spotify
- **Solo metadatos**: No reproduce música directamente
- **Personalizable**: Implementa tu propia lógica de reproducción
- **Alta performance**: Optimizado para manejar miles de canciones

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/) - Framework de aplicaciones
- [SvelteKit](https://kit.svelte.dev/) - Framework web
- [RSpotify](https://github.com/ramsayleung/rspotify) - Cliente Spotify en Rust
- [shadcn-svelte](https://www.shadcn-svelte.com/) - Componentes UI

---

**Nota**: Esta aplicación requiere una cuenta de Spotify. No incluye capacidades de reproducción - solo acceso a metadatos y organización de biblioteca.
