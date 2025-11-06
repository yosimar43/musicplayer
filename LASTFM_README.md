# 🎵 Integración de Last.fm API

Documentación completa de la integración de Last.fm en el Music Player.

## 📋 Contenido

- [Configuración](#configuración)
- [API Client](#api-client)
- [Store Global](#store-global)
- [Componentes](#componentes)
- [Uso](#uso)
- [Ejemplos](#ejemplos)

## ⚙️ Configuración

### 1. Variables de Entorno

Crea o edita el archivo `.env` en la raíz del proyecto:

```env
VITE_LASTFM_API_KEY=0d5ce25a78cf208120295f4b0733e548
VITE_LASTFM_SHARED_SECRET=37fb89b8ae79ce613cfde2ba2ec75b90
```

### 2. Acceso a Variables de Entorno

En Vite/SvelteKit, las variables con prefijo `VITE_` están disponibles en el cliente:

```typescript
const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
```

## 🔌 API Client

### Ubicación
`src/lib/api/lastfm.ts`

### Funciones Disponibles

#### `getArtistInfo(artistName: string)`
Obtiene información completa de un artista.

```typescript
import { getArtistInfo } from '@/lib/api/lastfm';

const artist = await getArtistInfo('The Beatles');
// Retorna: ProcessedArtistInfo | null
```

**Datos devueltos:**
- `name`: Nombre del artista
- `image`: URL de la imagen (mejor calidad disponible)
- `bio`: Biografía resumida (sin HTML)
- `bioFull`: Biografía completa (sin HTML)
- `tags`: Array de géneros/tags (máx 5)
- `listeners`: Número de oyentes
- `playcount`: Número de reproducciones
- `url`: Enlace a Last.fm

#### `getAlbumInfo(artistName: string, albumName: string)`
Obtiene información completa de un álbum.

```typescript
import { getAlbumInfo } from '@/lib/api/lastfm';

const album = await getAlbumInfo('Pink Floyd', 'The Dark Side of the Moon');
// Retorna: ProcessedAlbumInfo | null
```

**Datos devueltos:**
- `name`: Nombre del álbum
- `artist`: Nombre del artista
- `image`: URL de la portada
- `summary`: Resumen del álbum
- `tags`: Géneros musicales
- `listeners`: Oyentes totales
- `playcount`: Reproducciones totales
- `url`: Enlace a Last.fm
- `trackCount`: Número de canciones

#### `getTrackInfo(artistName: string, trackName: string)`
Obtiene información de una canción específica.

```typescript
import { getTrackInfo } from '@/lib/api/lastfm';

const track = await getTrackInfo('Queen', 'Bohemian Rhapsody');
// Retorna: ProcessedTrackInfo | null
```

#### `searchArtist(query: string, limit?: number)`
Busca artistas por nombre.

```typescript
import { searchArtist } from '@/lib/api/lastfm';

const results = await searchArtist('beatles', 10);
// Retorna: Array de resultados
```

#### `searchAlbum(query: string, limit?: number)`
Busca álbumes por nombre.

## 💾 Store Global con Cache

### Ubicación
`src/lib/stores/musicData.svelte.ts`

### Características

- ✅ **Cache automático**: Evita peticiones duplicadas
- ✅ **Estados de carga**: Indica cuando está cargando datos
- ✅ **Manejo de errores**: Captura y muestra errores
- ✅ **Svelte 5 Runes**: Usa `$state` para reactividad

### Uso del Store

```typescript
import { musicData } from '@/lib/stores/musicData.svelte';

// Obtener artista (con cache)
const artist = await musicData.getArtist('The Beatles');

// Obtener álbum (con cache)
const album = await musicData.getAlbum('Pink Floyd', 'The Wall');

// Obtener canción (con cache)
const track = await musicData.getTrack('Queen', 'Bohemian Rhapsody');

// Verificar estado de carga
if (musicData.loading.artist) {
  console.log('Cargando...');
}

// Verificar errores
if (musicData.errors.artist) {
  console.error(musicData.errors.artist);
}

// Limpiar cache
musicData.clearCache(); // Todo
musicData.clearCache('artist'); // Solo artistas

// Estadísticas del cache
const stats = musicData.getCacheStats();
console.log(`Cache: ${stats.total} elementos`);
```

## 🧩 Componentes

### ArtistInfo.svelte

Muestra información completa de un artista.

```svelte
<script>
  import ArtistInfo from '@/components/ArtistInfo.svelte';
</script>

<ArtistInfo artistName="The Beatles" />
```

**Props:**
- `artistName: string` - Nombre del artista

**Características:**
- Imagen del artista
- Biografía expandible
- Tags/géneros
- Estadísticas (oyentes, reproducciones)
- Enlace a Last.fm

### AlbumInfo.svelte

Muestra información de un álbum.

```svelte
<script>
  import AlbumInfo from '@/components/AlbumInfo.svelte';
</script>

<!-- Vista completa -->
<AlbumInfo artistName="Pink Floyd" albumName="The Wall" />

<!-- Vista compacta -->
<AlbumInfo artistName="Pink Floyd" albumName="The Wall" compact={true} />
```

**Props:**
- `artistName: string` - Nombre del artista
- `albumName: string` - Nombre del álbum
- `compact?: boolean` - Modo compacto (default: false)

## 📖 Ejemplos de Uso

### Ejemplo 1: En un componente de canción

```svelte
<script lang="ts">
  import { musicData } from '@/lib/stores/musicData.svelte';
  import type { Track } from '@/lib/state/library.svelte';

  let { track }: { track: Track } = $props();
  
  let trackInfo = $state(null);

  // Cargar info cuando cambie la canción
  $effect(() => {
    if (track.artist && track.title) {
      musicData.getTrack(track.artist, track.title).then(data => {
        trackInfo = data;
      });
    }
  });
</script>

{#if trackInfo}
  <div class="track-card">
    {#if trackInfo.image}
      <img src={trackInfo.image} alt={trackInfo.name} />
    {/if}
    <h3>{trackInfo.name}</h3>
    <p>{trackInfo.artist}</p>
    <div class="tags">
      {#each trackInfo.tags as tag}
        <span>{tag}</span>
      {/each}
    </div>
  </div>
{/if}
```

### Ejemplo 2: Mostrar imagen del álbum en el reproductor

```svelte
<script lang="ts">
  import { player } from '@/lib/state';
  import { musicData } from '@/lib/stores/musicData.svelte';

  let albumArt = $state<string | null>(null);

  // Actualizar imagen cuando cambie la canción
  $effect(() => {
    const current = player.current;
    if (current?.artist && current?.album) {
      musicData.getAlbum(current.artist, current.album).then(data => {
        albumArt = data?.image || null;
      });
    }
  });
</script>

<div class="album-art">
  {#if albumArt}
    <img src={albumArt} alt="Album cover" />
  {:else}
    <div class="placeholder">♪</div>
  {/if}
</div>
```

### Ejemplo 3: Página de información del artista

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import ArtistInfo from '@/components/ArtistInfo.svelte';
  
  let artistName = $derived($page.params.artist);
</script>

<ArtistInfo {artistName} />
```

## 🎯 Características Avanzadas

### Fallbacks para Imágenes

La API automáticamente:
- Selecciona la mejor calidad disponible (mega → extralarge → large → medium → small)
- Retorna `null` si no hay imagen
- Puedes usar una imagen por defecto en tu UI

```svelte
{#if albumInfo?.image}
  <img src={albumInfo.image} alt={albumInfo.name} />
{:else}
  <div class="default-cover">
    <span>💿</span>
  </div>
{/if}
```

### Limpieza de HTML

Las biografías y resúmenes vienen limpios de HTML:
- Se eliminan todas las etiquetas
- Se mantiene el texto de los enlaces
- Se normalizan los espacios

### Autocorrección

Last.fm corrige automáticamente nombres mal escritos gracias al parámetro `autocorrect: '1'`.

## 🔍 Manejo de Errores

```typescript
import { musicData } from '@/lib/stores/musicData.svelte';

const artist = await musicData.getArtist('Artista Inexistente');

if (artist === null) {
  // No se encontró el artista
  console.log('Artista no encontrado');
  
  // Verificar el error específico
  if (musicData.errors.artist) {
    console.error(musicData.errors.artist);
  }
}
```

## 📊 Estadísticas y Cache

```typescript
// Ver estadísticas del cache
const stats = musicData.getCacheStats();
console.log(`
  Artistas: ${stats.artists}
  Álbumes: ${stats.albums}
  Canciones: ${stats.tracks}
  Total: ${stats.total}
`);

// Limpiar cache específico
musicData.clearCache('artist');

// Limpiar todo el cache
musicData.clearCache();
```

## 🚀 Rutas Disponibles

- `/` - Home (lista de canciones)
- `/music-info` - **Nueva página de información musical**
- `/library` - Biblioteca
- `/playlists` - Listas de reproducción

## 🎨 Personalización

Todos los componentes usan Tailwind CSS y son totalmente personalizables. Puedes modificar los estilos en:

- `src/components/ArtistInfo.svelte`
- `src/components/AlbumInfo.svelte`

## 📝 Notas Importantes

1. **API Key**: Asegúrate de que `.env` esté en `.gitignore`
2. **Rate Limiting**: Last.fm tiene límites de peticiones (no especificados públicamente)
3. **Cache**: El store mantiene los datos en memoria durante la sesión
4. **SSR**: Las peticiones solo funcionan en el cliente (browser)

## 🐛 Troubleshooting

**Error: "Last.fm API Key no encontrada"**
- Verifica que `.env` existe y tiene `VITE_LASTFM_API_KEY`
- Reinicia el servidor de desarrollo después de crear `.env`

**No se muestran imágenes**
- Verifica la consola del navegador
- Algunas canciones/álbumes no tienen imágenes en Last.fm
- Los componentes muestran un fallback automáticamente

**Datos no actualizados**
- El cache persiste durante la sesión
- Usa `musicData.clearCache()` para forzar recarga

## 📚 Recursos

- [Last.fm API Docs](https://www.last.fm/api)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [SvelteKit](https://kit.svelte.dev/)

---

**¡Disfruta enriqueciendo tu app de música con datos de Last.fm! 🎵**
