# 🎵 Music Player - Spotify Data Viewer# 🎵 Music Player - Spotify Data Viewer# 🎵 Music Player - Documentación Técnica# 🎵 Music Player - Tauri + SvelteKit + Spotify



Aplicación de escritorio construida con **Tauri 2.x** y **Svelte 5** que obtiene y visualiza datos de tu biblioteca de **Spotify**.



![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)Aplicación de escritorio construida con **Tauri 2.x** y **Svelte 5** que obtiene y visualiza datos de tu biblioteca de **Spotify**.

![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)

![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)

![License](https://img.shields.io/badge/license-MIT-blue.svg)Aplicación de escritorio construida con **Tauri 2.x** y **Svelte 5** que integra datos de **Spotify** con reproducción mediante **YouTube/yt-dlp**.Aplicación de escritorio para gestionar tu biblioteca de Spotify. Obtén todos tus datos de Spotify e implementa tu propia lógica de reproducción.

---

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)

## 📋 Descripción General

![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)

Esta aplicación permite **obtener todos los datos de tu cuenta de Spotify** sin capacidades de reproducción integradas. Ideal para:

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)

- 📊 **Visualizar tu biblioteca completa** de canciones guardadas

- 🎼 **Explorar tus playlists** con filtros y búsqueda![License](https://img.shields.io/badge/license-MIT-blue.svg)![License](https://img.shields.io/badge/license-MIT-blue.svg)

- 📈 **Ver estadísticas** de artistas, álbumes, popularidad

- 🔝 **Descubrir tus top tracks y artistas** por período de tiempo---

- 💾 **Exportar datos** para integrar con tu propio sistema de reproducción

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)

### Flujo Principal:

1. **Autenticación OAuth con Spotify** → Token seguro## 📋 Descripción General

2. **Carga progresiva de datos** → Miles de canciones sin bloquear UI

3. **Visualización y filtros** → Interfaz moderna con glassmorphism![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)![SvelteKit](https://img.shields.io/badge/SvelteKit-latest-orange.svg)

4. **Datos estructurados** → Listos para usar con tu lógica personalizada

Esta aplicación permite **obtener todos los datos de tu cuenta de Spotify** sin capacidades de reproducción integradas. Ideal para:

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)

## 🔧 Arquitectura

- 📊 **Visualizar tu biblioteca completa** de canciones guardadas

```

┌─────────────────────────────────────────────────────────────┐- 🎼 **Explorar tus playlists** con filtros y búsqueda

│                    Frontend (Svelte 5)                       │

│  - Interfaz de usuario con animaciones                       │- 📈 **Ver estadísticas** de artistas, álbumes, popularidad

│  - Gestión de estado ($state, $derived)                     │

│  - Llamadas a comandos Tauri                                 │- 🔝 **Descubrir tus top tracks y artistas** por período de tiempo---## ✨ Características

└──────────────────┬──────────────────────────────────────────┘

                   │ invoke()- 💾 **Exportar datos** para integrar con tu propio sistema de reproducción

                   ▼

┌─────────────────────────────────────────────────────────────┐

│                   Backend (Rust/Tauri)                       │

│  - Autenticación OAuth 2.0                                   │### Flujo Principal:

│  - Cliente rspotify 0.13                                     │

│  - Streaming progresivo de datos                             │1. **Autenticación OAuth con Spotify** → Token seguro## 📋 Descripción General### 📚 Integración con Spotify

│  - Escaneo de archivos locales                               │

└──────────────────┬──────────────────────────────────────────┘2. **Carga progresiva de datos** → Miles de canciones sin bloquear UI

                   │

                   ▼3. **Visualización y filtros** → Interfaz moderna con glassmorphism

              ┌─────────┐

              │ Spotify │4. **Datos estructurados** → Listos para usar con tu lógica personalizada

              │   API   │

              └─────────┘### Flujo Principal:- **OAuth 2.0**: Autenticación segura

```

---

---

1. **Autenticación con Spotify** → Obtener datos de canciones, playlists, artistas- **Biblioteca completa**: Accede a todas tus canciones guardadas (2000+)

## 📡 API - Comandos Disponibles

## 🔧 Arquitectura

### 🎧 Spotify API

2. **Seleccionar canción** → Buscar en YouTube usando nombre + artista- **Streaming progresivo**: Carga por batches de 50 canciones

#### **1. Autenticación**

- `spotify_authenticate()`: Inicia flujo OAuth 2.0```

- `spotify_is_authenticated()`: Verifica si hay token válido

- `spotify_logout()`: Elimina token OAuth del cache┌─────────────────────────────────────────────────────────────┐3. **Descargar con yt-dlp** → Archivo temporal .webm- **Playlists**: Lista completa del usuario



#### **2. Perfil de Usuario**│                    Frontend (Svelte 5)                       │

- `spotify_get_profile()`: Obtiene datos del usuario (nombre, email, país, etc.)

│  - Interfaz de usuario con animaciones                       │4. **Reproducir** → HTML5 Audio API- **Perfil**: Información detallada de la cuenta

#### **3. Canciones**

- `spotify_get_saved_tracks(limit, offset)`: Obtiene canciones guardadas por lotes│  - Gestión de estado ($state, $derived)                     │

- `spotify_stream_all_liked_songs()`: ⭐ **(Recomendado)** Carga TODAS las canciones guardadas progresivamente con eventos en tiempo real (`spotify-tracks-start`, `spotify-tracks-batch`, `spotify-tracks-complete`).

│  - Llamadas a comandos Tauri                                 │- **Top Artists & Tracks**: Música más escuchada

#### **4. Playlists**

- `spotify_get_playlists(limit)`: Obtiene las playlists del usuario└──────────────────┬──────────────────────────────────────────┘



#### **5. Top Artistas y Canciones**                   │ invoke()---- **Cache de sesión**: Login persistente

- `spotify_get_top_artists(limit, timeRange)`: Top artistas por período (`short_term`, `medium_term`, `long_term`)

- `spotify_get_top_tracks(limit, timeRange)`: Top canciones por período                   ▼



---┌─────────────────────────────────────────────────────────────┐



### 📁 Archivos Locales│                   Backend (Rust/Tauri)                       │



#### **1. Escanear Carpeta**│  - Autenticación OAuth 2.0                                   │## 🔧 Arquitectura### 🎨 Interfaz de Usuario

- `scan_music_folder(path)`: Escanea recursivamente una carpeta en busca de archivos de audio (`.mp3`, `.m4a`, etc.)

│  - Cliente rspotify 0.13                                     │

#### **2. Obtener Metadata**

- `get_audio_metadata(path)`: Lee tags ID3 de un archivo (título, artista, álbum, duración, etc.)│  - Streaming progresivo de datos                             │



#### **3. Carpeta de Música por Defecto**└──────────────────┬──────────────────────────────────────────┘

- `get_default_music_folder()`: Obtiene la ruta a la carpeta de música del sistema operativo

                   │```- **Diseño moderno**: Glassmorphism con gradientes

---

                   ▼

## 📊 Estructuras de Datos

              ┌─────────┐┌─────────────────────────────────────────────────────────────┐- **Animaciones**: Transiciones con Anime.js

### SpotifyTrack (Canción de Spotify)

```typescript              │ Spotify │

interface SpotifyTrack {

  id: string;              │   API   ││                    Frontend (Svelte 5)                       │- **Búsqueda y filtros**: En tiempo real

  name: string;

  artists: string[];              └─────────┘

  album: string;

  album_image: string | null;```│  - Interfaz de usuario                                       │- **Estadísticas**: Canciones, artistas, álbumes

  duration_ms: number;

  popularity: number | null;

  preview_url: string | null;

  external_url: string;---│  - Gestión de estado ($state, $derived)                     │- **Ordenamiento**: Por nombre, artista, álbum, duración, popularidad

  added_at: string;

}

```

## 📡 API de Spotify - Comandos Disponibles│  - Llamadas a comandos Tauri                                 │- **Responsive**: Adaptable a diferentes tamaños

### MusicFile (Archivo Local)

```typescript

interface MusicFile {

  path: string;### 🔐 Autenticación└──────────────────┬──────────────────────────────────────────┘- **Tema oscuro**: Paleta cyan/blue/purple

  title: string | null;

  artist: string | null;

  album: string | null;

  duration: number | null; // segundos#### **1. Autenticar con Spotify**                   │ invoke()- **Paginación virtual**: Manejo eficiente de listas grandes

  year: number | null;

  genre: string | null;```rust

}

```#[tauri::command]                   ▼



---pub async fn spotify_authenticate() -> Result<(), String>



## 🚀 Instalación```┌─────────────────────────────────────────────────────────────┐### 🎵 Datos de Canciones Disponibles



### Prerequisitos- **Propósito**: Iniciar flujo OAuth 2.0 con Spotify



1. **Node.js** v18+- **Scopes utilizados**:│                   Backend (Rust/Tauri)                       │

2. **pnpm**

3. **Rust** (para Tauri)  - `user-read-private` - Información del perfil

4. **Credenciales de Spotify API**

  - `user-read-email` - Email del usuario│  - Autenticación OAuth Spotify                               │Al hacer clic en una canción, obtienes:

### Configuración de Spotify API

  - `user-library-read` - Canciones guardadas

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

2. Crea una nueva aplicación  - `user-top-read` - Top artistas/canciones│  - Búsqueda y descarga con yt-dlp                           │

3. Obtén **Client ID** y **Client Secret**

4. Añade `http://localhost:8888/callback` como **Redirect URI**  - `playlist-read-private` - Playlists privadas

5. Crea archivo `.env` en la raíz del proyecto:

  - `playlist-read-collaborative` - Playlists colaborativas│  - Gestión de archivos temporales                           │```typescript

```env

SPOTIFY_CLIENT_ID=tu_client_id_aqui- **Retorna**: Token OAuth guardado en cache (duración: ~1 hora, se refresca automático)

SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui

SPOTIFY_REDIRECT_URI=http://localhost:8888/callback└──────────────────┬──────────────────────────────────────────┘{

```

#### **2. Verificar Autenticación**

### Instalación del Proyecto

```rust                   │  id: string,              // ID único de Spotify

```bash

# Clonar repositorio#[tauri::command]

git clone https://github.com/tu-usuario/music-player.git

cd music-playerpub fn spotify_is_authenticated() -> bool        ┌──────────┴──────────┐  name: string,            // Nombre de la canción



# Instalar dependencias```

pnpm install

- **Retorna**: `true` si hay token válido, `false` si necesita re-autenticar        ▼                     ▼  artists: string[],       // Array de artistas

# Desarrollo

pnpm tauri dev



# Compilar para producción#### **3. Cerrar Sesión**   ┌─────────┐          ┌──────────┐  album: string,           // Nombre del álbum

pnpm tauri build

``````rust



El ejecutable estará en `src-tauri/target/release/`#[tauri::command]   │ Spotify │          │ YouTube  │  album_image: string,     // URL de la imagen



---pub fn spotify_logout() -> Result<(), String>



## 🛠️ Stack Tecnológico```   │   API   │          │ (yt-dlp) │  duration_ms: number,     // Duración en milisegundos



- **Frontend**: Svelte 5 (Runes API)- **Propósito**: Eliminar token OAuth del cache

- **Backend**: Rust + Tauri 2.x

- **Spotify API**: rspotify 0.13   └─────────┘          └──────────┘  uri: string,             // URI de Spotify

- **Estilos**: TailwindCSS + shadcn-svelte

- **Animaciones**: Anime.js---

- **Build**: Vite + pnpm

```  popularity: number,      // 0-100

---

### 👤 Perfil de Usuario

## 🔐 Seguridad

  external_url: string     // Link a Spotify

- **OAuth 2.0**: Token guardado en cache local (manejado por rspotify)

- **Refresh Token**: Automático cada hora#### **Obtener Perfil**

- **Scopes de solo lectura**: No modifica tu biblioteca de Spotify

- **Permisos de Tauri**: Mínimos necesarios para lectura de archivos y diálogos del sistema. No incluye ejecución de shell ni acceso a red externa (excepto Spotify API).```rust---}



---#[tauri::command]



## 💡 Casos de Usopub async fn spotify_get_profile() -> Result<SpotifyUserProfile, String>```



### 1. Exportar biblioteca a JSON```

```typescript

const tracks = await getAllTracks(); // Usando spotify_stream_all_liked_songs- **Información recibida**:## 📡 APIs y Comandos Tauri

const json = JSON.stringify(tracks, null, 2);

// Guardar en archivo o enviar a otro servicio```json

```

{## 🚀 Tecnologías

### 2. Análisis de gustos musicales

```typescript  "id": "usuario123",

const topArtists = await invoke('spotify_get_top_artists', {

  limit: 50,  "display_name": "Juan Pérez",### 🎧 Spotify API (rspotify)

  timeRange: 'long_term'

});  "email": "juan@example.com",

// Analizar géneros, popularidad, etc.

```  "country": "CO",### Frontend



### 3. Crear sistema de reproducción personalizado  "product": "premium",

```typescript

// Obtener datos de Spotify  "followers": 42,#### **1. Autenticación**

const track = tracks[0];

  "images": ["https://i.scdn.co/image/..."]

// Usar datos para búsqueda en otro servicio o archivo local

const query = `${track.artists[0]} ${track.name}`;}```rust- **SvelteKit**: Framework con Svelte 5 (runes)

// Implementar tu lógica de reproducción aquí

``````



---#[tauri::command]- **TypeScript**: Tipado estático



## 📝 Notas Importantes---



1. **Esta aplicación NO reproduce música** - Solo obtiene datos de Spotify y archivos locales.pub async fn spotify_authenticate() -> Result<(), String>- **TailwindCSS v4**: Estilos utility-first

2. **Solo metadatos** - Información de canciones, artistas, álbumes.

3. **Streaming progresivo** - Maneja miles de canciones sin bloquear la UI.### 🎵 Canciones

4. **Scopes de solo lectura** - No modifica tu biblioteca de Spotify.

5. **Cache local** - Sesión persistente entre reinicios.```- **shadcn-svelte**: Componentes UI



---#### **Obtener Canciones Guardadas (Por Lotes)**



## 📄 Licencia```rust- **Propósito**: Iniciar flujo OAuth 2.0 con Spotify- **Anime.js**: Animaciones



MIT License#[tauri::command]



---pub async fn spotify_get_saved_tracks(limit: usize, offset: usize) -> Result<Vec<SpotifyTrack>, String>- **Scopes utilizados**:- **Lucide Icons**: Iconografía



**Última actualización**: Noviembre 2025```


- **Parámetros**:  - `user-read-private` - Información del perfil

  - `limit` - Canciones por lote (máx: 50)

  - `offset` - Desde qué posición empezar  - `user-read-email` - Email del usuario### Backend

- **Información por canción**:

```json  - `user-library-read` - Canciones guardadas

{

  "id": "3n3Ppam7vgaVa1iaRUc9Lp",  - `user-top-read` - Top artistas/canciones- **Tauri 2.x**: Framework de escritorio

  "name": "Mr. Brightside",

  "artists": ["The Killers"],  - `playlist-read-private` - Playlists privadas- **Rust**: Alto rendimiento

  "album": "Hot Fuss",

  "album_image": "https://i.scdn.co/image/...",  - `playlist-read-collaborative` - Playlists colaborativas- **RSpotify 0.13**: Cliente de Spotify

  "duration_ms": 222973,

  "popularity": 85,- **Información devuelta**: Token OAuth guardado en cache- **audiotags**: Metadata de archivos

  "preview_url": "https://p.scdn.co/mp3-preview/...",

  "external_url": "https://open.spotify.com/track/...",- **Duración token**: ~1 hora (se refresca automáticamente)- **walkdir**: Escaneo de directorios

  "added_at": "2024-03-15T10:30:00Z"

}

```

---## 📦 Instalación

#### **Streaming de Todas las Canciones (RECOMENDADO)** ⭐

```rust

#[tauri::command]

pub async fn spotify_stream_all_liked_songs(app: AppHandle) -> Result<usize, String>#### **2. Verificar Autenticación**### Prerequisitos

```

- **Propósito**: Cargar TODAS las canciones guardadas progresivamente```rust

- **Eventos emitidos al frontend**:

#[tauri::command]1. **Node.js** v18+

```javascript

// Iniciopub fn spotify_is_authenticated() -> bool2. **pnpm**

'spotify-tracks-start' → { total: 1234 }

```3. **Rust** (para Tauri)

// Por cada batch (50 canciones)

'spotify-tracks-batch' → {- **Propósito**: Verificar si hay token válido4. **Credenciales de Spotify API**

  tracks: [...],  // Array de 50 SpotifyTrack

  progress: 25,   // Porcentaje (0-100)- **Información devuelta**: `true` o `false`

  loaded: 300,    // Canciones cargadas hasta ahora

  total: 1234     // Total de canciones### Configuración de Spotify

}

---

// Completado

'spotify-tracks-complete' → { total: 1234 }1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)



// Error#### **3. Obtener Perfil del Usuario**2. Crea una aplicación

'spotify-tracks-error' → { message: "Error..." }

``````rust3. Obtén **Client ID** y **Client Secret**



**Ventajas:**#[tauri::command]4. Añade `http://localhost:8888/callback` como Redirect URI

- ✅ Sin límite de 50 canciones

- ✅ Carga progresiva sin bloquear UIpub async fn spotify_get_profile() -> Result<SpotifyUserProfile, String>5. Crea `.env` en la raíz:

- ✅ Barra de progreso en tiempo real

- ✅ Maneja automáticamente rate limiting```



---- **Información recibida**:```env



### 🎼 Playlists```jsonSPOTIFY_CLIENT_ID=tu_client_id



#### **Obtener Playlists**{SPOTIFY_CLIENT_SECRET=tu_client_secret

```rust

#[tauri::command]  "id": "usuario123",SPOTIFY_REDIRECT_URI=http://localhost:8888/callback

pub async fn spotify_get_playlists(limit: usize) -> Result<Vec<SpotifyPlaylist>, String>

```  "display_name": "Juan Pérez",```

- **Parámetros**: `limit` - Número máximo (default: 50)

- **Información por playlist**:  "email": "juan@example.com",

```json

{  "country": "CO",### Instalación

  "id": "37i9dQZF1DXcBWIGoYBM5M",

  "name": "Today's Top Hits",  "product": "premium",

  "description": "Ed Sheeran is on top!",

  "owner": "Spotify",  "followers": 42,```bash

  "tracks_total": 50,

  "image": "https://i.scdn.co/image/...",  "images": ["https://i.scdn.co/image/..."]# Clonar

  "public": true,

  "collaborative": false,}git clone https://github.com/tu-usuario/music-player.git

  "external_url": "https://open.spotify.com/playlist/..."

}```cd music-player

```



---

---# Instalar dependencias

### 🎤 Top Artistas y Canciones

pnpm install

#### **Obtener Top Artistas**

```rust#### **4. Obtener Playlists**

#[tauri::command]

pub async fn spotify_get_top_artists(limit: usize, time_range: String) -> Result<Vec<SpotifyArtist>, String>```rust# Desarrollo

```

- **Parámetros**:#[tauri::command]pnpm tauri dev

  - `limit` - Número de artistas (máx: 50)

  - `time_range` - Período de tiempo:pub async fn spotify_get_playlists(limit: usize) -> Result<Vec<SpotifyPlaylist>, String>

    - `"short_term"` - Últimas 4 semanas

    - `"medium_term"` - Últimos 6 meses (default)```# Compilar

    - `"long_term"` - Varios años

- **Parámetros**: pnpm tauri build

- **Información por artista**:

```json  - `limit` (usize) - Número máximo de playlists (default: 50)```

{

  "id": "53XhwfbYqKCa1cC15pYq2q",- **Información recibida por cada playlist**:

  "name": "Imagine Dragons",

  "genres": ["modern rock", "pop"],```json## 🎯 Uso

  "popularity": 88,

  "followers": 32000000,{

  "image": "https://i.scdn.co/image/...",

  "external_url": "https://open.spotify.com/artist/..."  "id": "37i9dQZF1DXcBWIGoYBM5M",### Desarrollo

}

```  "name": "Today's Top Hits",



#### **Obtener Top Canciones**  "description": "Ed Sheeran is on top of the Hottest 50!",```bash

```rust

#[tauri::command]  "owner": "Spotify",pnpm tauri dev

pub async fn spotify_get_top_tracks(limit: usize, time_range: String) -> Result<Vec<SpotifyTrack>, String>

```  "tracks_total": 50,```

- **Parámetros**: Iguales que top artistas

- **Información**: Misma estructura que `spotify_get_saved_tracks`  "image": "https://i.scdn.co/image/...",



---  "public": true,### Producción



## 📊 Estructuras de Datos  "collaborative": false,



### SpotifyTrack (Canción)  "external_url": "https://open.spotify.com/playlist/..."```bash

```typescript

interface SpotifyTrack {}pnpm tauri build

  id: string;                    // ID único de Spotify

  name: string;                  // Nombre de la canción``````

  artists: string[];             // Array de artistas

  album: string;                 // Nombre del álbum

  album_image: string | null;    // URL de portada

  duration_ms: number;           // Duración en milisegundos---El ejecutable estará en `src-tauri/target/release/`

  popularity: number | null;     // 0-100 (popularidad)

  preview_url: string | null;    // URL de preview 30s

  external_url: string;          // URL de Spotify Web

  added_at: string;              // ISO timestamp#### **5. Obtener Canciones Guardadas**## 📂 Estructura del Proyecto

}

``````rust



### SpotifyPlaylist#[tauri::command]```

```typescript

interface SpotifyPlaylist {pub async fn spotify_get_saved_tracks(limit: usize, offset: usize) -> Result<Vec<SpotifyTrack>, String>musicplayer/

  id: string;

  name: string;```├── src/                          # Frontend (SvelteKit)

  description: string;

  owner: string;- **Parámetros**:│   ├── routes/

  tracks_total: number;

  image: string | null;  - `limit` (usize) - Canciones por lote (máx: 50)│   │   ├── +page.svelte         # Página principal

  public: boolean;

  collaborative: boolean;  - `offset` (usize) - Desde qué posición empezar│   │   ├── playlists/           # Vista de playlists

  external_url: string;

}- **Información recibida por cada canción**:│   │   ├── library/             # Biblioteca

```

```json│   │   └── spotify/             # Integración Spotify

### SpotifyArtist

```typescript{│   ├── lib/

interface SpotifyArtist {

  id: string;  "id": "3n3Ppam7vgaVa1iaRUc9Lp",│   │   ├── components/          # Componentes UI

  name: string;

  genres: string[];  "name": "Mr. Brightside",│   │   ├── state/               # Estado global

  popularity: number;

  followers: number;  "artists": ["The Killers"],│   │   └── utils/               # Utilidades

  image: string | null;

  external_url: string;  "album": "Hot Fuss",│   └── styles/                  # Estilos CSS

}

```  "album_image": "https://i.scdn.co/image/...",├── src-tauri/                   # Backend (Rust)



### SpotifyUserProfile  "duration_ms": 222973,│   ├── src/

```typescript

interface SpotifyUserProfile {  "popularity": 85,│   │   ├── main.rs             # Entry point

  id: string;

  display_name: string | null;  "preview_url": "https://p.scdn.co/mp3-preview/...",│   │   ├── lib.rs              # Comandos Tauri

  email: string | null;

  country: string | null;  "external_url": "https://open.spotify.com/track/...",│   │   └── rspotify_auth.rs   # OAuth Spotify

  product: string | null;        // "free", "premium"

  followers: number;  "added_at": "2024-03-15T10:30:00Z"│   └── Cargo.toml              # Dependencias Rust

  images: string[];

}}└── README.md

```

``````

---

- **Campos importantes**:

## 🎮 Ejemplo de Uso Completo

  - `duration_ms`: Duración en milisegundos (222973 = 3:42)## 🔧 Comandos Tauri Disponibles

### Frontend (Svelte)

  - `popularity`: Número de 0-100 (85 = muy popular)

```typescript

import { invoke } from '@tauri-apps/api/core';  - `preview_url`: Audio de 30 segundos (puede ser `null`)### Spotify

import { listen } from '@tauri-apps/api/event';



// 1. Autenticar

async function login() {---- `spotify_authenticate()` - Iniciar OAuth

  await invoke('spotify_authenticate');

  const isAuth = await invoke('spotify_is_authenticated');- `spotify_get_profile()` - Perfil del usuario

  console.log('Autenticado:', isAuth);

}#### **6. Streaming de Todas las Canciones (RECOMENDADO)**- `spotify_get_playlists(limit)` - Playlists



// 2. Obtener perfil```rust- `spotify_stream_all_liked_songs()` - Streaming de canciones

async function getProfile() {

  const profile = await invoke('spotify_get_profile');#[tauri::command]- `spotify_get_top_artists(limit)` - Top artistas

  console.log('Usuario:', profile.display_name);

}pub async fn spotify_stream_all_liked_songs(app: AppHandle) -> Result<usize, String>- `spotify_get_top_tracks(limit)` - Top canciones



// 3. Cargar todas las canciones con progreso```- `spotify_logout()` - Cerrar sesión

async function loadAllTracks() {

  let allTracks = [];- **Propósito**: Cargar TODAS las canciones guardadas progresivamente- `spotify_is_authenticated()` - Estado de autenticación

  

  // Escuchar eventos- **Eventos emitidos al frontend**:

  await listen('spotify-tracks-start', (e) => {

    console.log(`Iniciando carga de ${e.payload.total} canciones`);### Archivos Locales

  });

  **Inicio:**

  await listen('spotify-tracks-batch', (e) => {

    allTracks = [...allTracks, ...e.payload.tracks];```javascript- `scan_music_folder(path)` - Escanear carpeta

    console.log(`Progreso: ${e.payload.progress}%`);

  });'spotify-tracks-start' → { total: 1234 }- `get_audio_metadata(path)` - Metadata de archivo

  

  await listen('spotify-tracks-complete', (e) => {```- `get_default_music_folder()` - Carpeta Music del sistema

    console.log(`✅ ${e.payload.total} canciones cargadas`);

  });

  

  // Iniciar streaming**Por cada batch (50 canciones):**## 💡 Implementar Reproducción

  await invoke('spotify_stream_all_liked_songs');

}```javascript



// 4. Obtener top artistas'spotify-tracks-batch' → {La función `playPreview()` en `src/routes/playlists/+page.svelte` está lista para que implementes tu lógica:

async function getTopArtists() {

  const artists = await invoke('spotify_get_top_artists', {  tracks: [...], // Array de 50 canciones

    limit: 20,

    timeRange: 'medium_term'  progress: 25,   // Porcentaje (0-100)```typescript

  });

  console.log('Top artistas:', artists);  loaded: 300,    // Canciones cargadasasync function playPreview(track: SpotifyTrack) {

}

```  total: 1234     // Total de canciones  console.log('🎵 Seleccionada:', track.name);



---}  



## ⚡ Rendimiento y Límites```  // TODO: Implementa aquí tu lógica de reproducción



### Spotify API  // Opciones:

- **Rate Limit**: ~100 requests/minuto

- **Canciones por request**: 50 (máximo)**Completado:**  // 1. Buscar en YouTube/SoundCloud con track.name + track.artists

- **Solución**: Usar `spotify_stream_all_liked_songs` para cargas masivas

- **Token duración**: 1 hora (se refresca automáticamente)```javascript  // 2. Usar tu propio backend de streaming



### Aplicación'spotify-tracks-complete' → { total: 1234 }  // 3. Conectar con otro servicio de música

- **Carga inicial**: ~2-5 segundos para 1000 canciones

- **Streaming progresivo**: UI no se bloquea durante carga```  // 4. Reproducir archivos locales si existen

- **Memoria**: ~50MB + (0.5KB × número de canciones)

}

---

**Error:**```

## 🚀 Instalación

```javascript

### Prerequisites

'spotify-tracks-error' → { message: "Error..." }## 🐛 Solución de Problemas

1. **Node.js** v18+

2. **pnpm**```

3. **Rust** (para Tauri)

4. **Credenciales de Spotify API**### No se cargan las canciones



### Configuración de Spotify API- **Ventajas**:



1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)  - ✅ No hay límite de 50 canciones- Verifica que `.env` tenga las credenciales correctas

2. Crea una nueva aplicación

3. Obtén **Client ID** y **Client Secret**  - ✅ Carga progresiva sin bloquear UI- Revisa que el Redirect URI sea exactamente `http://localhost:8888/callback`

4. Añade `http://localhost:8888/callback` como **Redirect URI**

5. Crea archivo `.env` en la raíz del proyecto:  - ✅ Barra de progreso en tiempo real- Comprueba que tienes canciones guardadas en Spotify



```env  - ✅ Maneja automáticamente rate limiting de Spotify

SPOTIFY_CLIENT_ID=tu_client_id_aqui

SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui### Error de autenticación

SPOTIFY_REDIRECT_URI=http://localhost:8888/callback

```---



### Instalación del Proyecto- Elimina el cache: Borra carpeta de cache de Tauri



```bash#### **7. Obtener Top Artistas**- Vuelve a autorizar la aplicación

# Clonar repositorio

git clone https://github.com/tu-usuario/music-player.git```rust- Verifica que las credenciales sean válidas

cd music-player

#[tauri::command]

# Instalar dependencias

pnpm installpub async fn spotify_get_top_artists(limit: usize, time_range: String) -> Result<Vec<SpotifyArtist>, String>### La app no compila



# Desarrollo```

pnpm tauri dev

- **Parámetros**:```bash

# Compilar para producción

pnpm tauri build  - `limit` (usize) - Número de artistas (máx: 50)# Limpiar y reconstruir

```

  - `time_range` (String) - `"short_term"`, `"medium_term"`, `"long_term"`cd src-tauri

El ejecutable estará en `src-tauri/target/release/`

    - `short_term` = últimas 4 semanascargo clean

---

    - `medium_term` = últimos 6 mesescd ..

## 🛠️ Comandos Útiles

    - `long_term` = varios añospnpm install

### Desarrollo

```bash- **Información recibida por cada artista**:pnpm tauri dev

# Iniciar en modo desarrollo

pnpm tauri dev```json```



# Build para producción{

pnpm tauri build

  "id": "53XhwfbYqKCa1cC15pYq2q",## 📝 Notas

# Linter

pnpm lint  "name": "Imagine Dragons",



# Format  "genres": ["modern rock", "pop"],- **Sin reproducción integrada**: Esta app solo obtiene datos de Spotify

pnpm format

```  "popularity": 88,- **Solo metadatos**: No reproduce música directamente



---  "followers": 32000000,- **Personalizable**: Implementa tu propia lógica de reproducción



## 📞 Referencia Rápida  "image": "https://i.scdn.co/image/...",- **Alta performance**: Optimizado para manejar miles de canciones



### Comandos Más Usados  "external_url": "https://open.spotify.com/artist/..."



| Comando | Uso Principal | Parámetros |}## 🤝 Contribuir

|---------|---------------|------------|

| `spotify_authenticate()` | Login OAuth | - |```

| `spotify_is_authenticated()` | Verificar sesión | - |

| `spotify_get_profile()` | Info usuario | - |Las contribuciones son bienvenidas. Por favor:

| `spotify_stream_all_liked_songs()` | Cargar todas las canciones | - |

| `spotify_get_playlists(limit)` | Obtener playlists | `limit: usize` |---

| `spotify_get_top_artists(limit, timeRange)` | Top artistas | `limit: usize, timeRange: string` |

| `spotify_get_top_tracks(limit, timeRange)` | Top canciones | `limit: usize, timeRange: string` |1. Fork el proyecto

| `spotify_logout()` | Cerrar sesión | - |

#### **8. Obtener Top Canciones**2. Crea una rama para tu feature

### Eventos Frontend

```rust3. Commit tus cambios

| Evento | Payload | Cuándo se emite |

|--------|---------|-----------------|#[tauri::command]4. Push a la rama

| `spotify-tracks-start` | `{ total: number }` | Inicio carga masiva |

| `spotify-tracks-batch` | `{ tracks: [], progress: number, loaded: number, total: number }` | Cada 50 canciones |pub async fn spotify_get_top_tracks(limit: usize, time_range: String) -> Result<Vec<SpotifyTrack>, String>5. Abre un Pull Request

| `spotify-tracks-complete` | `{ total: number }` | Fin carga masiva |

| `spotify-tracks-error` | `{ message: string }` | Error durante carga |```



---- **Parámetros**: Igual que top artistas## 📄 Licencia



## 📁 Estructura del Proyecto- **Información recibida**: Misma estructura que `spotify_get_saved_tracks`



```MIT License - Ver archivo LICENSE para más detalles

musicplayer/

├── src/                          # Frontend (Svelte 5)---

│   ├── routes/

│   │   ├── +page.svelte         # Página principal## 🙏 Agradecimientos

│   │   ├── playlists/           # Vista de playlists ⭐

│   │   ├── library/             # Biblioteca local#### **9. Cerrar Sesión**

│   │   └── spotify/             # Debug Spotify

│   ├── lib/```rust- [Tauri](https://tauri.app/) - Framework de aplicaciones

│   │   ├── components/          # Componentes UI

│   │   │   ├── StatsCard.svelte#[tauri::command]- [SvelteKit](https://kit.svelte.dev/) - Framework web

│   │   │   ├── PlaylistSlider.svelte

│   │   │   ├── AnimatedBackground.sveltepub fn spotify_logout() -> Result<(), String>- [RSpotify](https://github.com/ramsayleung/rspotify) - Cliente Spotify en Rust

│   │   │   └── ui/             # shadcn-svelte

│   │   ├── state/              # Estado global (Svelte 5)```- [shadcn-svelte](https://www.shadcn-svelte.com/) - Componentes UI

│   │   │   ├── player.svelte.ts

│   │   │   └── library.svelte.ts- **Propósito**: Eliminar token OAuth del cache

│   │   └── utils/              # Utilidades

│   │       └── audioManager.ts- **Información devuelta**: Confirmación de logout---

│   └── styles/                 # CSS

├── src-tauri/                  # Backend (Rust)

│   ├── src/

│   │   ├── main.rs            # Entry point---**Nota**: Esta aplicación requiere una cuenta de Spotify. No incluye capacidades de reproducción - solo acceso a metadatos y organización de biblioteca.

│   │   ├── lib.rs             # Comandos Tauri

│   │   └── rspotify_auth.rs   # OAuth + API Spotify

│   ├── Cargo.toml             # Dependencias Rust### 🎥 YouTube API (yt-dlp)

│   └── tauri.conf.json        # Config Tauri

└── README.md#### **1. Buscar y Obtener Stream**

``````rust

#[tauri::command]

---pub async fn search_youtube_stream(query: String) -> Result<SongStreamInfo, String>

```

## 🛠️ Stack Tecnológico- **Parámetros**:

  - `query` (String) - Búsqueda (ej: "Imagine Dragons Radioactive audio")

- **Frontend**: Svelte 5 (Runes API)- **Información recibida**:

- **Backend**: Rust + Tauri 2.x```json

- **Spotify API**: rspotify 0.13{

- **Estilos**: TailwindCSS + shadcn-svelte  "title": "Imagine Dragons - Radioactive (Official)",

- **Animaciones**: Anime.js  "artist": "Imagine Dragons",

- **Build**: Vite + pnpm  "album": null,

  "duration": 186,

---  "stream_url": "https://rr4---sn-ab5l6n7s.googlevideo.com/...",

  "thumbnail": "https://i.ytimg.com/vi/ktvTqknDobU/maxresdefault.jpg",

## 🔐 Seguridad  "video_id": "ktvTqknDobU"

}

### OAuth 2.0```

- Token guardado en cache local (manejado por rspotify)- **Nota**: `stream_url` expira en ~6 horas

- Refresh token automático cada hora

- Scopes mínimos necesarios (solo lectura)---



### Permisos de Tauri#### **2. Regenerar URL de Streaming**

Configurados en `capabilities/default.json`:```rust

- `fs:allow-read-dir` - Lectura de directorios#[tauri::command]

- `fs:allow-read-file` - Lectura de archivospub async fn get_stream_url(video_id: String) -> Result<String, String>

- `dialog:allow-open` - Diálogos del sistema```

- **Parámetros**:

**NO incluye:**  - `video_id` (String) - ID del video (ej: "ktvTqknDobU")

- Permisos de escritura innecesarios- **Información devuelta**:

- Ejecución de shell```json

- Acceso a red externa (solo Spotify API)"https://rr4---sn-ab5l6n7s.googlevideo.com/videoplayback?expire=..."

```

---- **Uso**: Cuando la URL anterior expiró (error 403)



## 🐛 Solución de Problemas---



### "Error de autenticación"#### **3. Descargar Audio (Bytes)**

- **Causa**: Credenciales incorrectas o Redirect URI mal configurado```rust

- **Solución**: Verifica `.env` y que el Redirect URI sea exactamente `http://localhost:8888/callback`#[tauri::command]

pub async fn download_youtube_audio(video_id: String) -> Result<Vec<u8>, String>

### "Token expirado"```

- **Causa**: Token de 1 hora expiró- **Parámetros**:

- **Solución**: Se refresca automáticamente. Si falla, volver a autenticar con `spotify_authenticate()`  - `video_id` (String) - ID del video

- **Información devuelta**: Array de bytes del archivo .m4a

### "No se cargan las canciones"- **Proceso**:

- **Causa**: No hay canciones guardadas o problemas de red  1. Descarga a archivo temporal

- **Solución**: Verifica que tengas canciones en "Liked Songs" de Spotify  2. Lee los bytes

  3. Elimina archivo temporal

### "Rate limit excedido"  4. Retorna bytes

- **Causa**: Demasiadas requests en poco tiempo

- **Solución**: Usar `spotify_stream_all_liked_songs` que maneja rate limiting automáticamente---



---#### **4. Descargar y Reproducir con Progreso (RECOMENDADO)**

```rust

## 💡 Casos de Uso#[tauri::command]

pub fn play_song_stream(app: AppHandle, query: String) -> Result<String, String>

### 1. Exportar biblioteca a JSON```

```typescript- **Parámetros**:

const tracks = await getAllTracks();  - `query` (String) - Búsqueda (ej: "The Killers Mr Brightside audio")

const json = JSON.stringify(tracks, null, 2);- **Información devuelta**: Ruta al archivo temporal

// Guardar en archivo o enviar a otro servicio```json

```"C:\\Users\\Usuario\\AppData\\Local\\Temp\\current_song.webm"

```

### 2. Análisis de gustos musicales- **Eventos emitidos durante descarga**:

```typescript```javascript

const topArtists = await invoke('spotify_get_top_artists', {'download_progress' → {

  limit: 50,  progress: 45.3,  // Porcentaje (0-100)

  timeRange: 'long_term'  status: "downloading"

});}

// Analizar géneros, popularidad, etc.```

```- **Proceso**:

  1. Busca en YouTube (`ytsearch1:query`)

### 3. Crear sistema de reproducción personalizado  2. Descarga mejor audio disponible (formato webm)

```typescript  3. Guarda en `%TEMP%/current_song.webm`

// Obtener datos de Spotify  4. Emite progreso cada línea de yt-dlp

const track = tracks[0];  5. Retorna ruta del archivo



// Usar datos para búsqueda en otro servicio---

const query = `${track.artists[0]} ${track.name}`;

// Implementar tu lógica de reproducción aquí#### **5. Eliminar Archivo Temporal**

``````rust

#[tauri::command]

---pub fn delete_temp_audio() -> Result<(), String>

```

## 📝 Notas Importantes- **Propósito**: Limpiar `%TEMP%/current_song.webm`

- **Uso**: Llamar después de reproducir o al cerrar app

1. **Esta aplicación NO reproduce música** - Solo obtiene datos de Spotify

2. **Solo metadatos** - Información de canciones, artistas, álbumes---

3. **Streaming progresivo** - Maneja miles de canciones sin bloquear UI

4. **Scopes de solo lectura** - No modifica tu biblioteca de Spotify## 🎮 Flujo Completo de Reproducción

5. **Cache local** - Sesión persistente entre reinicios

### Paso a Paso:

---

```javascript

## 📄 Licencia// 1. Usuario selecciona canción de Spotify

const track = {

MIT License  name: "Radioactive",

  artists: ["Imagine Dragons"],

---  // ... más datos

};

## 🙏 Agradecimientos

// 2. Construir query de búsqueda

- [Tauri](https://tauri.app/) - Framework de aplicaciones de escritorioconst query = `${track.artists[0]} ${track.name} audio`;

- [SvelteKit](https://kit.svelte.dev/) - Framework web// → "Imagine Dragons Radioactive audio"

- [RSpotify](https://github.com/ramsayleung/rspotify) - Cliente Spotify en Rust

- [shadcn-svelte](https://www.shadcn-svelte.com/) - Componentes UI// 3. Descargar desde YouTube con progreso

const filePath = await invoke('play_song_stream', { query });

---// → "C:\\Users\\...\\Temp\\current_song.webm"



**Última actualización**: Noviembre 2025// Mientras descarga, escuchar progreso:

await listen('download_progress', (event) => {

**⚠️ Disclaimer**: Esta aplicación es solo para visualización de datos. No incluye capacidades de reproducción de música. Requiere cuenta de Spotify.  console.log(`Progreso: ${event.payload.progress}%`);

  // Actualizar barra de progreso en UI
});

// 4. Convertir ruta para Tauri
const audioUrl = convertFileSrc(filePath);
// → "asset://localhost/C:/Users/.../current_song.webm"

// 5. Reproducir con HTML5 Audio
const audio = new Audio(audioUrl);
await audio.play();

// 6. Al terminar, limpiar archivo
audio.addEventListener('ended', async () => {
  await invoke('delete_temp_audio');
});
```

---

## 📊 Estructuras de Datos Principales

### SpotifyTrack (Canción)
```typescript
interface SpotifyTrack {
  id: string;              // ID único de Spotify
  name: string;            // Nombre de la canción
  artists: string[];       // Array de artistas
  album: string;           // Nombre del álbum
  album_image: string | null;  // URL de portada
  duration_ms: number;     // Duración en milisegundos
  popularity: number | null;   // 0-100
  preview_url: string | null;  // URL de preview 30s
  external_url: string;    // URL de Spotify
  added_at: string;        // ISO timestamp
}
```

### SpotifyPlaylist
```typescript
interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: string;
  tracks_total: number;
  image: string | null;
  public: boolean;
  collaborative: boolean;
  external_url: string;
}
```

### SpotifyArtist
```typescript
interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  image: string | null;
  external_url: string;
}
```

### SongStreamInfo (YouTube)
```typescript
interface SongStreamInfo {
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;  // segundos
  stream_url: string;       // expira en 6h
  thumbnail: string | null;
  video_id: string | null;
}
```

---

## 🔐 Seguridad

### Sanitización de Queries
Todas las búsquedas de YouTube pasan por sanitización:
```rust
fn sanitize_query(query: &str) -> String {
    query
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '\'')
        .take(200)
        .collect()
}
```
- **Permite**: Letras, números, espacios, guiones, apóstrofes
- **Límite**: 200 caracteres
- **Previene**: Inyección de comandos

### Permisos de Tauri
Configurados en `capabilities/default.json`:
- `shell:allow-execute` - Ejecutar yt-dlp
- `shell:allow-spawn` - Procesos background
- `fs:allow-remove` - Eliminar archivos temp
- `fs:allow-write-file` - Escribir en temp

---

## 📁 Gestión de Archivos

### Archivos Temporales
- **Ubicación**: `%TEMP%/current_song.webm` (Windows)
- **Formato**: WebM (audio only)
- **Limpieza**: 
  - Automática al terminar reproducción
  - Manual con `delete_temp_audio()`
  - Al sobrescribir con nueva descarga

### Cache de Spotify
- **Ubicación**: Manejado por `rspotify` automáticamente
- **Contiene**: Token OAuth, refresh token
- **Duración**: Token expira en ~1 hora, se refresca automático

---

## ⚡ Rendimiento y Límites

### Spotify API
- **Rate Limit**: ~100 requests/minuto
- **Canciones por request**: 50 (máximo)
- **Solución**: Usar `spotify_stream_all_liked_songs` para cargas masivas

### yt-dlp
- **Velocidad descarga**: Depende de conexión (típico: 1-5 MB/s)
- **Formato recomendado**: `bestaudio[ext=webm]/bestaudio`
- **Timeout**: 30 segundos por socket

### Reproducción
- **Formato soportado**: WebM, M4A, MP3, OGG
- **Codec**: Opus, AAC, MP3
- **Buffer**: Manejado por navegador (Chromium)

---

## 🐛 Manejo de Errores Comunes

### "Error ejecutando yt-dlp"
- **Causa**: yt-dlp no instalado o no en PATH
- **Solución**: Instalar con `pip install yt-dlp` o descargar binario

### "Descarga fallida"
- **Causa**: Video no disponible, región bloqueada
- **Solución**: Usar `--geo-bypass` (ya incluido)

### "Archivo temporal está vacío"
- **Causa**: Fallo en descarga, disco lleno
- **Solución**: Verificar espacio en disco, permisos

### Token Spotify expirado
- **Causa**: Token de 1 hora expiró
- **Solución**: Se refresca automáticamente, re-autenticar si falla

---

## 🚀 Instalación y Uso

### Prerequisitos

1. **Node.js** v18+
2. **pnpm**
3. **Rust** (para Tauri)
4. **yt-dlp** instalado
5. **Credenciales de Spotify API**

### Instalación de yt-dlp

**Windows (PowerShell):**
```powershell
# Opción 1: Con pip
pip install yt-dlp

# Opción 2: Binario directo
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "$env:LOCALAPPDATA\Microsoft\WindowsApps\yt-dlp.exe"

# Verificar instalación
yt-dlp --version
```

### Configuración de Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una aplicación
3. Obtén **Client ID** y **Client Secret**
4. Añade `http://localhost:8888/callback` como Redirect URI
5. Crea `.env` en la raíz del proyecto:

```env
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

### Instalación del Proyecto

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/music-player.git
cd music-player

# Instalar dependencias
pnpm install

# Desarrollo
pnpm tauri dev

# Compilar para producción
pnpm tauri build
```

---

## 🛠️ Comandos Útiles

### Desarrollo
```bash
# Iniciar app en modo desarrollo
pnpm tauri dev

# Build para producción
pnpm tauri build

# Linter
pnpm lint

# Format
pnpm format
```

### Verificar yt-dlp
```bash
# Ver versión
yt-dlp --version

# Buscar canción
yt-dlp "ytsearch1:imagine dragons radioactive" --dump-json

# Descargar audio
yt-dlp -f bestaudio --no-playlist "ytsearch1:the killers mr brightside"
```

---

## 📞 Referencia Rápida

### Comandos Más Usados

| Comando | Uso Principal |
|---------|---------------|
| `spotify_authenticate()` | Login inicial |
| `spotify_stream_all_liked_songs()` | Cargar biblioteca completa |
| `spotify_get_profile()` | Info del usuario |
| `play_song_stream(query)` | Descargar y reproducir |
| `delete_temp_audio()` | Limpiar archivos |

### Eventos Frontend

| Evento | Payload | Cuándo se emite |
|--------|---------|-----------------|
| `spotify-tracks-start` | `{ total }` | Inicio carga masiva |
| `spotify-tracks-batch` | `{ tracks, progress, loaded, total }` | Cada 50 canciones |
| `spotify-tracks-complete` | `{ total }` | Fin carga masiva |
| `download_progress` | `{ progress, status }` | Durante descarga YouTube |

---

## 📂 Estructura del Proyecto

```
musicplayer/
├── src/                          # Frontend (Svelte 5)
│   ├── routes/
│   │   ├── +page.svelte         # Página principal
│   │   ├── playlists/           # Vista de playlists (principal)
│   │   ├── library/             # Biblioteca local
│   │   └── spotify/             # Debug Spotify
│   ├── lib/
│   │   ├── components/          # Componentes UI
│   │   │   ├── AudioPlayer.svelte
│   │   │   ├── AnimatedBackground.svelte
│   │   │   └── ui/             # shadcn-svelte components
│   │   ├── state/              # Estado global (Svelte 5 runes)
│   │   │   ├── player.svelte.ts
│   │   │   └── library.svelte.ts
│   │   └── utils/              # Utilidades
│   │       ├── audioManager.ts
│   │       └── youtubeStream.ts
│   └── styles/                 # Estilos CSS
├── src-tauri/                  # Backend (Rust)
│   ├── src/
│   │   ├── main.rs            # Entry point
│   │   ├── lib.rs             # Registro de comandos
│   │   ├── rspotify_auth.rs   # OAuth Spotify + comandos
│   │   └── youtube_stream.rs  # Integración yt-dlp
│   ├── Cargo.toml             # Dependencias Rust
│   └── tauri.conf.json        # Configuración Tauri
└── README.md
```

---

## 🛠️ Stack Tecnológico

- **Frontend**: Svelte 5 (Runes API)
- **Backend**: Rust + Tauri 2.x
- **Spotify**: rspotify 0.13
- **YouTube**: yt-dlp (CLI)
- **Audio**: HTML5 Audio API
- **Estilos**: TailwindCSS + shadcn-svelte
- **Build**: Vite + pnpm

---

## 📝 Notas Importantes

1. **NO usamos Spotify para reproducir música** - Solo para obtener datos
2. **YouTube es la fuente de audio** - Descargado con yt-dlp
3. **Streaming progresivo** - UI no se bloquea mientras carga
4. **Archivos temporales** - Se limpian automáticamente
5. **OAuth 2.0** - Token se refresca automáticamente cada hora

---

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles

---

**Última actualización**: Noviembre 2025
