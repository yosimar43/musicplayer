# 🎵 Guía Completa de Integración Spotify API

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Comandos Disponibles](#comandos-disponibles)
3. [Ejemplos de Uso en Frontend](#ejemplos-de-uso-en-frontend)
4. [Tipos TypeScript](#tipos-typescript)
5. [Mejores Prácticas](#mejores-prácticas)

---

## 🔧 Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env` en `src-tauri/.env`:

```env
RSPOTIFY_CLIENT_ID=tu_client_id_aqui
RSPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
RSPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

### 2. Scopes Configurados

La aplicación solicita los siguientes permisos:

- ✅ `user-read-private` - Leer información privada del usuario
- ✅ `user-read-email` - Leer email del usuario
- ✅ `user-library-read` - Leer canciones guardadas
- ✅ `playlist-read-private` - Leer playlists privadas
- ✅ `playlist-read-collaborative` - Leer playlists colaborativas
- ✅ `user-read-playback-state` - Leer estado de reproducción
- ✅ `user-modify-playback-state` - Controlar reproducción
- ✅ `user-read-currently-playing` - Ver canción actual
- ✅ `user-top-read` - Ver artistas y canciones top
- ✅ `user-read-recently-played` - Ver canciones recientes

### 3. Características Avanzadas

- ✅ **Token Caching**: Los tokens se guardan automáticamente
- ✅ **Token Refreshing**: Refresco automático cuando expiran
- ✅ **Estado Global**: Mantiene sesión activa en toda la app
- ✅ **Logging Detallado**: Emoji logging para debugging fácil

---

## 📡 Comandos Disponibles

### 1. `spotify_authenticate`

Inicia el flujo de autenticación OAuth2 con Spotify.

**Parámetros**: Ninguno

**Retorna**: `Result<String, String>`

**Ejemplo**:
```typescript
import { invoke } from '@tauri-apps/api/core';

async function authenticateSpotify() {
  try {
    const result = await invoke<string>('spotify_authenticate');
    console.log('✅ Autenticación exitosa:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 2. `spotify_get_profile`

Obtiene el perfil completo del usuario autenticado.

**Parámetros**: Ninguno

**Retorna**: `SpotifyUserProfile`

**Ejemplo**:
```typescript
interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  product: string | null;
  followers: number;
  images: string[];
}

async function getUserProfile() {
  try {
    const profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
    console.log('👤 Usuario:', profile.display_name);
    console.log('🌍 País:', profile.country);
    console.log('⭐ Tipo:', profile.product); // "premium" o "free"
    console.log('👥 Seguidores:', profile.followers);
    console.log('🖼️ Avatar:', profile.images[0]);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 3. `spotify_get_playlists`

Obtiene las playlists del usuario (propias y seguidas).

**Parámetros**:
- `limit?: number` - Número de playlists a obtener (default: 20)

**Retorna**: `SpotifyPlaylist[]`

**Ejemplo**:
```typescript
interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner: string;
  tracks_total: number;
  images: string[];
  public: boolean | null;
}

async function getUserPlaylists() {
  try {
    // Obtener las primeras 20 playlists
    const playlists = await invoke<SpotifyPlaylist[]>('spotify_get_playlists', {
      limit: 20
    });
    
    playlists.forEach(playlist => {
      console.log(`📋 ${playlist.name} (${playlist.tracks_total} canciones)`);
      console.log(`   👤 Creada por: ${playlist.owner}`);
      console.log(`   🔒 ${playlist.public ? 'Pública' : 'Privada'}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 4. `spotify_get_saved_tracks`

Obtiene las canciones guardadas (liked songs) con paginación manual.

**Parámetros**:
- `limit?: number` - Canciones por página (max 50, default: 50)
- `offset?: number` - Desde qué canción empezar (default: 0)

**Retorna**: `SpotifyTrack[]`

**Ejemplo**:
```typescript
interface SpotifyTrack {
  id: string | null;
  name: string;
  artists: string[];
  album: string;
  album_image: string | null;
  duration_ms: number;
  popularity: number | null;
  preview_url: string | null;
  external_url: string | null;
}

async function getSavedTracks() {
  try {
    // Primera página (50 canciones)
    const tracks = await invoke<SpotifyTrack[]>('spotify_get_saved_tracks', {
      limit: 50,
      offset: 0
    });
    
    tracks.forEach(track => {
      console.log(`🎵 ${track.name}`);
      console.log(`   🎤 ${track.artists.join(', ')}`);
      console.log(`   💿 ${track.album}`);
      console.log(`   ⭐ Popularidad: ${track.popularity}/100`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 5. `spotify_get_all_liked_songs` ⭐ NUEVO

Obtiene **TODAS** las canciones guardadas automáticamente (sin paginación manual).

**Parámetros**: Ninguno

**Retorna**: `SpotifyTrack[]`

**Ejemplo**:
```typescript
async function getAllLikedSongs() {
  try {
    console.log('⏳ Cargando todas las canciones...');
    
    const allTracks = await invoke<SpotifyTrack[]>('spotify_get_all_liked_songs');
    
    console.log(`✅ ¡${allTracks.length} canciones cargadas!`);
    
    // Estadísticas
    const totalDuration = allTracks.reduce((sum, t) => sum + t.duration_ms, 0);
    const hours = Math.floor(totalDuration / 3600000);
    const minutes = Math.floor((totalDuration % 3600000) / 60000);
    
    console.log(`⏱️ Duración total: ${hours}h ${minutes}m`);
    
    // Artista más popular
    const artistCount = new Map<string, number>();
    allTracks.forEach(track => {
      track.artists.forEach(artist => {
        artistCount.set(artist, (artistCount.get(artist) || 0) + 1);
      });
    });
    
    const topArtist = Array.from(artistCount.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    console.log(`🎤 Artista favorito: ${topArtist[0]} (${topArtist[1]} canciones)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 6. `spotify_get_top_artists` ⭐ NUEVO

Obtiene los artistas más escuchados del usuario.

**Parámetros**:
- `time_range?: string` - Periodo de tiempo:
  - `"short_term"` - Últimas 4 semanas
  - `"medium_term"` - Últimos 6 meses (default)
  - `"long_term"` - Varios años
- `limit?: number` - Número de artistas (default: 20)

**Retorna**: `SpotifyArtist[]`

**Ejemplo**:
```typescript
interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  images: string[];
  external_url: string | null;
}

async function getTopArtists() {
  try {
    // Top 10 artistas del último mes
    const artists = await invoke<SpotifyArtist[]>('spotify_get_top_artists', {
      time_range: 'short_term',
      limit: 10
    });
    
    console.log('🎤 TUS TOP ARTISTAS:');
    artists.forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name}`);
      console.log(`   🎸 Géneros: ${artist.genres.join(', ')}`);
      console.log(`   ⭐ Popularidad: ${artist.popularity}/100`);
      console.log(`   👥 Seguidores: ${artist.followers.toLocaleString()}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 7. `spotify_get_top_tracks` ⭐ NUEVO

Obtiene las canciones más escuchadas del usuario.

**Parámetros**:
- `time_range?: string` - Periodo de tiempo (igual que top_artists)
- `limit?: number` - Número de canciones (default: 20)

**Retorna**: `SpotifyTrack[]`

**Ejemplo**:
```typescript
async function getTopTracks() {
  try {
    // Top 20 canciones de todos los tiempos
    const tracks = await invoke<SpotifyTrack[]>('spotify_get_top_tracks', {
      time_range: 'long_term',
      limit: 20
    });
    
    console.log('🎵 TUS TOP CANCIONES:');
    tracks.forEach((track, index) => {
      console.log(`${index + 1}. ${track.name}`);
      console.log(`   🎤 ${track.artists.join(', ')}`);
      console.log(`   💿 ${track.album}`);
      console.log(`   ⭐ ${track.popularity}/100`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 8. `spotify_get_current_playback`

Obtiene el estado actual de reproducción de Spotify.

**Parámetros**: Ninguno

**Retorna**: `SpotifyCurrentPlayback | null`

**Ejemplo**:
```typescript
interface SpotifyCurrentPlayback {
  is_playing: boolean;
  track: SpotifyTrack | null;
  progress_ms: number | null;
  device_name: string | null;
  shuffle_state: boolean;
  repeat_state: string;
}

async function getCurrentPlayback() {
  try {
    const playback = await invoke<SpotifyCurrentPlayback | null>(
      'spotify_get_current_playback'
    );
    
    if (!playback) {
      console.log('😴 No hay reproducción activa');
      return;
    }
    
    if (playback.track) {
      console.log(`${playback.is_playing ? '▶️' : '⏸️'} ${playback.track.name}`);
      console.log(`   🎤 ${playback.track.artists.join(', ')}`);
      console.log(`   📱 Dispositivo: ${playback.device_name}`);
      console.log(`   🔀 Shuffle: ${playback.shuffle_state ? 'Sí' : 'No'}`);
      console.log(`   🔁 Repetir: ${playback.repeat_state}`);
      
      // Calcular progreso
      if (playback.progress_ms && playback.track.duration_ms) {
        const progress = (playback.progress_ms / playback.track.duration_ms) * 100;
        console.log(`   ⏱️ Progreso: ${progress.toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

### 9. `spotify_is_authenticated`

Verifica si hay una sesión activa de Spotify.

**Parámetros**: Ninguno

**Retorna**: `boolean`

**Ejemplo**:
```typescript
async function checkAuth() {
  const isAuth = await invoke<boolean>('spotify_is_authenticated');
  console.log(isAuth ? '✅ Autenticado' : '❌ No autenticado');
  return isAuth;
}
```

---

### 10. `spotify_logout`

Cierra la sesión de Spotify.

**Parámetros**: Ninguno

**Retorna**: `Result<void, String>`

**Ejemplo**:
```typescript
async function logout() {
  try {
    await invoke('spotify_logout');
    console.log('👋 Sesión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

## 🎨 Componente Svelte Completo

Ejemplo de componente completo que integra todas las funcionalidades:

```svelte
<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';
  
  // Tipos
  interface SpotifyUserProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    country: string | null;
    product: string | null;
    followers: number;
    images: string[];
  }
  
  interface SpotifyTrack {
    id: string | null;
    name: string;
    artists: string[];
    album: string;
    album_image: string | null;
    duration_ms: number;
    popularity: number | null;
    preview_url: string | null;
    external_url: string | null;
  }
  
  interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: number;
    images: string[];
    external_url: string | null;
  }
  
  // Estado
  let isAuthenticated = $state(false);
  let profile = $state<SpotifyUserProfile | null>(null);
  let likedSongs = $state<SpotifyTrack[]>([]);
  let topArtists = $state<SpotifyArtist[]>([]);
  let topTracks = $state<SpotifyTrack[]>([]);
  let isLoading = $state(false);
  
  // Verificar autenticación al montar
  onMount(async () => {
    isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
    if (isAuthenticated) {
      await loadProfile();
    }
  });
  
  // Autenticar
  async function authenticate() {
    isLoading = true;
    try {
      await invoke('spotify_authenticate');
      isAuthenticated = true;
      await loadProfile();
    } catch (error) {
      console.error('Error autenticando:', error);
      alert(`Error: ${error}`);
    } finally {
      isLoading = false;
    }
  }
  
  // Cargar perfil
  async function loadProfile() {
    try {
      profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  }
  
  // Cargar todas las canciones guardadas
  async function loadAllLikedSongs() {
    isLoading = true;
    try {
      likedSongs = await invoke<SpotifyTrack[]>('spotify_get_all_liked_songs');
      console.log(`✅ ${likedSongs.length} canciones cargadas`);
    } catch (error) {
      console.error('Error cargando canciones:', error);
      alert(`Error: ${error}`);
    } finally {
      isLoading = false;
    }
  }
  
  // Cargar top artistas
  async function loadTopArtists(timeRange: string = 'medium_term') {
    isLoading = true;
    try {
      topArtists = await invoke<SpotifyArtist[]>('spotify_get_top_artists', {
        time_range: timeRange,
        limit: 20
      });
    } catch (error) {
      console.error('Error cargando artistas:', error);
      alert(`Error: ${error}`);
    } finally {
      isLoading = false;
    }
  }
  
  // Cargar top canciones
  async function loadTopTracks(timeRange: string = 'medium_term') {
    isLoading = true;
    try {
      topTracks = await invoke<SpotifyTrack[]>('spotify_get_top_tracks', {
        time_range: timeRange,
        limit: 20
      });
    } catch (error) {
      console.error('Error cargando canciones top:', error);
      alert(`Error: ${error}`);
    } finally {
      isLoading = false;
    }
  }
  
  // Cerrar sesión
  async function logout() {
    try {
      await invoke('spotify_logout');
      isAuthenticated = false;
      profile = null;
      likedSongs = [];
      topArtists = [];
      topTracks = [];
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
  
  // Formatear duración
  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
</script>

<div class="spotify-container">
  {#if !isAuthenticated}
    <button 
      onclick={authenticate} 
      disabled={isLoading}
      class="auth-button"
    >
      {isLoading ? '⏳ Conectando...' : '🎵 Conectar con Spotify'}
    </button>
  {:else}
    <div class="profile">
      {#if profile}
        <img 
          src={profile.images[0]} 
          alt={profile.display_name || 'Usuario'}
          class="avatar"
        />
        <div>
          <h2>{profile.display_name}</h2>
          <p>
            {profile.product} • {profile.country} • 
            {profile.followers} seguidores
          </p>
        </div>
        <button onclick={logout}>Cerrar Sesión</button>
      {/if}
    </div>
    
    <div class="actions">
      <button onclick={() => loadAllLikedSongs()}>
        💾 Cargar Canciones Guardadas
      </button>
      <button onclick={() => loadTopArtists('short_term')}>
        🎤 Top Artistas (Mes)
      </button>
      <button onclick={() => loadTopTracks('medium_term')}>
        🎵 Top Canciones (6 meses)
      </button>
    </div>
    
    {#if isLoading}
      <div class="loading">⏳ Cargando...</div>
    {/if}
    
    {#if likedSongs.length > 0}
      <div class="section">
        <h3>💾 Canciones Guardadas ({likedSongs.length})</h3>
        <div class="tracks-grid">
          {#each likedSongs as track}
            <div class="track-card">
              {#if track.album_image}
                <img src={track.album_image} alt={track.album} />
              {/if}
              <div class="track-info">
                <h4>{track.name}</h4>
                <p>{track.artists.join(', ')}</p>
                <p class="album">{track.album}</p>
                <span class="duration">{formatDuration(track.duration_ms)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if topArtists.length > 0}
      <div class="section">
        <h3>🎤 Top Artistas ({topArtists.length})</h3>
        <div class="artists-grid">
          {#each topArtists as artist, index}
            <div class="artist-card">
              <span class="rank">#{index + 1}</span>
              {#if artist.images.length > 0}
                <img src={artist.images[0]} alt={artist.name} />
              {/if}
              <h4>{artist.name}</h4>
              <p>{artist.genres.slice(0, 2).join(', ')}</p>
              <p class="stats">
                ⭐ {artist.popularity}/100 • 
                👥 {artist.followers.toLocaleString()}
              </p>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .spotify-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .auth-button {
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background: #1DB954;
    color: white;
    border: none;
    border-radius: 2rem;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .auth-button:hover:not(:disabled) {
    background: #1ed760;
    transform: scale(1.05);
  }
  
  .profile {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 1rem;
    margin-bottom: 2rem;
  }
  
  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .actions button {
    padding: 0.75rem 1.5rem;
    background: #282828;
    color: white;
    border: 1px solid #404040;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .actions button:hover {
    background: #333;
    transform: translateY(-2px);
  }
  
  .tracks-grid, .artists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .track-card, .artist-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }
  
  .track-card:hover, .artist-card:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-4px);
  }
  
  .track-card img, .artist-card img {
    width: 100%;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
  }
  
  .section {
    margin-top: 2rem;
  }
  
  .loading {
    text-align: center;
    font-size: 1.5rem;
    padding: 2rem;
  }
</style>
```

---

## 🔥 Mejores Prácticas

### 1. Manejo de Errores
```typescript
try {
  const data = await invoke<SpotifyTrack[]>('spotify_get_all_liked_songs');
  // Procesar datos...
} catch (error) {
  if (error === 'No hay sesión activa') {
    // Redirigir a login
    await authenticate();
  } else {
    // Mostrar error al usuario
    console.error('Error:', error);
  }
}
```

### 2. Loading States
```typescript
let isLoading = $state(false);

async function loadData() {
  isLoading = true;
  try {
    const data = await invoke('spotify_get_profile');
    // ...
  } finally {
    isLoading = false;
  }
}
```

### 3. Verificar Autenticación
```typescript
onMount(async () => {
  const isAuth = await invoke<boolean>('spotify_is_authenticated');
  if (!isAuth) {
    // Redirigir a login o mostrar botón de conexión
  }
});
```

### 4. Cacheo de Datos
```typescript
// Guardar en localStorage para evitar llamadas repetidas
const CACHE_KEY = 'spotify_profile';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function getCachedProfile(): Promise<SpotifyUserProfile> {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  
  const profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data: profile,
    timestamp: Date.now()
  }));
  
  return profile;
}
```

---

## 🎉 Resumen

Esta integración te proporciona:

✅ **Autenticación OAuth2 completa** con Authorization Code Flow
✅ **10 comandos** para acceder a toda la API de Spotify
✅ **Token caching y refreshing automático**
✅ **Manejo robusto de errores**
✅ **Logging detallado** con emojis para debugging
✅ **Tipos TypeScript completos**
✅ **Ejemplos prácticos** listos para usar
✅ **Paginación automática** para grandes conjuntos de datos

¡Ahora puedes crear una aplicación completa de música con Spotify! 🚀
