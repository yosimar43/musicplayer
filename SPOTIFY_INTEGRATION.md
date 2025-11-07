![](./images/clipboard-2025-11-07T03-40-48-634Z.png)# 🎵 Integración de Spotify con RSpotify

Esta aplicación utiliza **RSpotify** (librería oficial de Rust) para conectarse con la API de Spotify y acceder a tu cuenta.

## ✅ Configuración Completada

### Variables de Entorno

El archivo `.env` ya está configurado con:

```env
# Spotify API Credentials (RSpotify - Rust Backend)
RSPOTIFY_CLIENT_ID=865f6a1615f049c4ac47a6883f08c12e
RSPOTIFY_CLIENT_SECRET=b42f3eb6dd464d92ad6df9e79541c739
RSPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

### Comandos Tauri Disponibles

1. **`spotify_authenticate()`** - Inicia OAuth2 flow
2. **`spotify_get_profile()`** - Obtiene perfil del usuario
3. **`spotify_get_playlists(limit?)`** - Lista tus playlists
4. **`spotify_get_saved_tracks(limit?)`** - Canciones guardadas
5. **`spotify_get_current_playback()`** - Qué está reproduciendo
6. **`spotify_logout()`** - Cierra sesión
7. **`spotify_is_authenticated()`** - Verifica estado

## 🚀 Cómo Usar

### 1. Navegar a la Página de Spotify

Abre la aplicación y ve a: **`/spotify`**

### 2. Conectar tu Cuenta

1. Click en **"Conectar con Spotify"**
2. Se abrirá tu navegador con la página de autorización de Spotify
3. Acepta los permisos
4. Serás redirigido a `http://localhost:8888/callback`
5. RSpotify capturará automáticamente el código de autorización
6. ¡Listo! Tu sesión quedará guardada

### 3. Explorar tus Datos

Una vez conectado, puedes usar las pestañas:

#### 📋 Perfil
- Avatar
- Nombre de usuario
- Email
- País
- Tipo de cuenta (Free/Premium)
- Número de seguidores

#### 🎵 Playlists
- Grid visual de todas tus playlists
- Imágenes de portada
- Nombre y dueño
- Número de canciones

#### 💾 Canciones Guardadas
- Lista de tus canciones favoritas
- Artistas, álbum, duración
- Popularidad de cada track

#### ▶️ Reproducción Actual
- Qué está sonando ahora mismo
- Estado (reproduciendo/pausado)
- Dispositivo activo
- Modo aleatorio y repetir
- Progreso de la canción

## 🔐 Scopes/Permisos Solicitados

La aplicación solicita los siguientes permisos:

- `user-read-private` - Leer perfil privado
- `user-read-email` - Acceso al email
- `user-library-read` - Leer biblioteca de música
- `playlist-read-private` - Leer playlists privadas
- `playlist-read-collaborative` - Leer playlists colaborativas
- `user-read-playback-state` - Estado de reproducción
- `user-modify-playback-state` - Controlar reproducción
- `user-read-currently-playing` - Canción actual
- `user-top-read` - Top artistas/canciones
- `user-read-recently-played` - Historial reciente

## 💡 Características Técnicas

### Token Caching
RSpotify guarda automáticamente tu token de acceso en caché. No necesitas autenticarte cada vez que inicias la app.

### Token Refreshing
Cuando tu token expira, RSpotify lo renueva automáticamente usando el refresh token.

### Estado Global
El cliente autenticado se guarda en `RSpotifyState` (Rust) para ser reutilizado en todos los comandos.

### Logging Detallado
Todos los comandos imprimen logs con emojis para fácil debugging:
- 🎵 Inicio de operación
- ✅ Operación exitosa
- ❌ Error
- 📋 Listas
- 💾 Guardado
- ▶️ Reproducción

## 🐛 Troubleshooting

### "No se encontraron credenciales"
Verifica que el archivo `.env` esté en la raíz del proyecto y contenga las variables `RSPOTIFY_CLIENT_ID` y `RSPOTIFY_CLIENT_SECRET`.

### "No hay sesión activa"
Haz click en "Conectar con Spotify" para autenticarte primero.

### Error de redirect URI
Asegúrate de que en el Dashboard de Spotify Developer tengas configurado:
```
http://localhost:8888/callback
```

## 📚 Documentación

- [RSpotify GitHub](https://github.com/ramsayleung/rspotify)
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api)
- [Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)

## 🎨 UI Features

- **Glassmorphism Theme** verde Spotify
- **Responsive Grid** para playlists
- **Real-time Updates** con Svelte 5 runes
- **Loading States** con spinners
- **Error Handling** con mensajes claros
- **Animated Icons** para reproducción actual

---

¡Disfruta explorando tu música de Spotify! 🎶
