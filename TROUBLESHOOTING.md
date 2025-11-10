# 🔧 Solución de Problemas - Music Player

## Problemas Comunes con Descargas de Spotify

### ❌ Error: "AudioProviderError: YT-DLP download error"

Este error ocurre cuando spotdl no puede descargar la canción desde YouTube Music. 

#### Causas Comunes:
1. **yt-dlp desactualizado** - YouTube cambia frecuentemente su API
2. **YouTube bloqueando descargas** - Requiere autenticación con cookies
3. **Video no disponible** - La canción no está en YouTube Music
4. **Límite de tasa** - Demasiadas descargas en poco tiempo

#### Soluciones:

##### 1. Actualizar yt-dlp y spotdl (Recomendado)
```powershell
pip install --upgrade yt-dlp spotdl
```

##### 2. Usar cookies de YouTube (Si el problema persiste)
1. Instala la extensión [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/cclelndahbckbenkjhflpdbgdldlbecc)
2. Ve a [YouTube.com](https://youtube.com) y asegúrate de estar logueado
3. Haz clic en la extensión y exporta las cookies a un archivo `cookies.txt`
4. Guarda el archivo en una ubicación conocida (ej: `C:\Users\TuUsuario\cookies.txt`)
5. Configura spotdl para usar las cookies:

```powershell
# Crear archivo de configuración de spotdl
spotdl --generate-config

# Editar el archivo ~/.spotdl/config.json y agregar:
# "cookie_file": "C:\\Users\\TuUsuario\\cookies.txt"
```

##### 3. Intentar con otro proveedor de audio
spotdl intenta primero con YouTube Music, luego YouTube. Si ambos fallan:
- La canción podría no estar disponible en YouTube
- Intenta buscar la canción manualmente en YouTube y descárgala con otra herramienta

##### 4. Reducir la velocidad de descarga
Si descargas muchas canciones a la vez, YouTube puede bloquearte temporalmente:
- Aumenta el `delay` en la descarga masiva (de 2 a 5 segundos)
- Reduce el `segmentSize` (de 10 a 5 canciones por segmento)

### ⚠️ Error: "spotdl no está instalado"

#### Solución:
```powershell
pip install spotdl
```

Si no tienes pip instalado:
1. Instala Python desde [python.org](https://www.python.org/downloads/)
2. Asegúrate de marcar "Add Python to PATH" durante la instalación
3. Reinicia la terminal y ejecuta `pip install spotdl`

### 🐌 Las descargas son muy lentas

#### Causas:
- Velocidad de internet
- YouTube limitando la velocidad de descarga
- Calidad de audio alta (320kbps)

#### Soluciones:
1. **Reducir calidad de audio** (edita en el código):
   ```typescript
   format: 'mp3',
   // Agregar en el futuro: bitrate: '192k'
   ```

2. **Descargar en horarios con menos tráfico**

3. **Aumentar el delay entre descargas**:
   ```typescript
   delay: 5, // De 2 a 5 segundos
   ```

### 📂 No encuentro las canciones descargadas

Las canciones se guardan en:
```
C:\Users\TuUsuario\Music\{Artista}\{Álbum}\{Título}.mp3
```

Por ejemplo:
```
C:\Users\michael sinisterra\Music\Gilberto Santa Rosa\Expresión\¿Estás Ahí?.mp3
```

### 🔇 La canción se descargó pero no tiene audio

#### Solución:
1. Verifica que ffmpeg esté instalado:
   ```powershell
   ffmpeg -version
   ```

2. Si no está instalado:
   - **Windows**: Descarga desde [ffmpeg.org](https://ffmpeg.org/download.html)
   - O usa spotdl para instalarlo:
     ```powershell
     spotdl --download-ffmpeg
     ```

### 🚫 Error: "No se pudo obtener la carpeta de música del sistema"

#### Solución:
Asegúrate de que la carpeta `Music` existe en tu perfil de usuario:
```powershell
# Crear la carpeta si no existe
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Music"
```

## Comandos Útiles

### Verificar instalación
```powershell
spotdl --version      # Debe mostrar: 4.4.3 o superior
yt-dlp --version      # Debe mostrar: 2024.x.x o superior
ffmpeg -version       # Debe estar instalado
```

### Limpiar caché de spotdl
Si las descargas fallan constantemente:
```powershell
spotdl --no-cache
```

O elimina el caché manualmente:
```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.spotdl\cache"
```

### Probar descarga manualmente
Para depurar, intenta descargar directamente desde la terminal:
```powershell
spotdl download "https://open.spotify.com/track/TRACK_ID" --output "C:\Users\TuUsuario\Music\{artist}\{title}" --format mp3 --audio youtube-music youtube --print-errors
```

## Logs y Depuración

### Ver logs en tiempo real
1. Abre la consola del desarrollador en la app: `Ctrl + Shift + I`
2. Ve a la pestaña "Console"
3. Haz clic en "Descargar" y observa los logs con emojis 🔍

### Logs del backend (Rust)
Los logs de Rust aparecen en la terminal donde ejecutaste `pnpm tauri dev`

### Reportar un problema
Si el problema persiste, incluye:
1. Versión de spotdl: `spotdl --version`
2. Versión de yt-dlp: `yt-dlp --version`
3. URL de Spotify que falla
4. Logs de la consola (frontend y backend)
5. Sistema operativo

## Recursos Adicionales

- [Documentación de spotdl](https://spotdl.rtfd.io/)
- [Issues de spotdl en GitHub](https://github.com/spotDL/spotify-downloader/issues)
- [Documentación de yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [SPOTDL_SETUP.md](./SPOTDL_SETUP.md) - Guía de instalación inicial
