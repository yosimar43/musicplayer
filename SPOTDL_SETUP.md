# 🎧 Instalación de spotdl

Para usar la funcionalidad de descarga de canciones de Spotify, necesitas instalar **spotdl**.

## 📦 Instalación

### Windows

```powershell
# Instalar Python si no lo tienes
winget install Python.Python.3.11

# Instalar spotdl
pip install spotdl
```

### macOS / Linux

```bash
# Instalar Python si no lo tienes
# macOS:
brew install python

# Linux (Debian/Ubuntu):
sudo apt install python3 python3-pip

# Instalar spotdl
pip3 install spotdl
```

## ✅ Verificar Instalación

```bash
spotdl --version
```

Deberías ver algo como: `spotdl v4.x.x`

## 🎵 Uso en la Aplicación

Una vez instalado, podrás:

1. **Descargar todas las canciones** desde la vista de playlists usando el botón "Descargar Todas"
2. **Descargar canciones individuales** haciendo hover sobre una canción y clickeando el ícono de descarga
3. **Ver el progreso** en tiempo real con el panel de descarga expandible

### Ubicación de las Descargas

Por defecto, las canciones se descargan en:

```
Windows: C:\Users\{usuario}\Music\{artista}\{album}\{titulo}.mp3
macOS:   ~/Music/{artista}/{album}/{titulo}.mp3
Linux:   ~/Music/{artista}/{album}/{titulo}.mp3
```

## ⚙️ Configuración

Puedes modificar los parámetros de descarga en el código:

```typescript
// src/routes/playlists/+page.svelte
await invoke('download_spotify_tracks_segmented', {
  urls,
  segmentSize: 10,       // Canciones por segmento
  delay: 2,              // Segundos entre descargas
  outputTemplate: '{artist}/{album}/{title}', // Template de salida
  format: 'mp3',         // Formato (mp3, flac, ogg, m4a, opus)
  outputDir: null        // Carpeta personalizada (null = Music)
});
```

## 🔧 Solución de Problemas

### spotdl no encontrado

```bash
# Windows - Agregar Python al PATH
# Busca "Variables de entorno" → PATH → Agregar:
# C:\Users\{usuario}\AppData\Local\Programs\Python\Python311\Scripts

# macOS/Linux - Verificar instalación
which spotdl
pip3 show spotdl
```

### Error de FFmpeg

spotdl requiere FFmpeg para funcionar:

```bash
# Windows
winget install FFmpeg

# macOS
brew install ffmpeg

# Linux (Debian/Ubuntu)
sudo apt install ffmpeg
```

### Permisos insuficientes

```bash
# Linux/macOS - Instalar con --user
pip3 install --user spotdl
```

## 📚 Recursos

- [Documentación oficial de spotdl](https://spotdl.readthedocs.io/)
- [Repositorio de GitHub](https://github.com/spotDL/spotify-downloader)
- [Formatos soportados](https://spotdl.readthedocs.io/en/latest/usage/#output-formats)

## ⚖️ Nota Legal

spotdl descarga audio de YouTube y otras fuentes basándose en los metadatos de Spotify. Asegúrate de cumplir con las leyes de derechos de autor de tu país y usar las canciones descargadas solo para uso personal.
