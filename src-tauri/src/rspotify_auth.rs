use rspotify::{
    AuthCodeSpotify,
    Config,
    Credentials,
    OAuth,
    scopes,
    clients::OAuthClient,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{State, Emitter};
use tiny_http::{Server, Response};
use tokio::time::timeout;

// Type alias for consistent API responses
use crate::ApiResponse;

// Constantes de configuración
const OAUTH_CALLBACK_TIMEOUT_SECS: u64 = 120; // 2 minutos
const OAUTH_SERVER_ADDR: &str = "127.0.0.1:8888";
const SPOTIFY_BATCH_SIZE: u32 = 50;
const MAX_RETRY_ATTEMPTS: u32 = 3;

/// Global state for Spotify client with thread-safe access
/// Uses Arc<Mutex<_>> for safe concurrent access across async operations
pub struct RSpotifyState {
    /// Authenticated Spotify client wrapped in Arc<Mutex<>> for thread safety
    pub client: Arc<Mutex<Option<AuthCodeSpotify>>>,
    /// Cached user profile information
    pub user: Arc<Mutex<Option<SpotifyUserProfile>>>,
}

impl Default for RSpotifyState {
    fn default() -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            user: Arc::new(Mutex::new(None)),
        }
    }
}

impl RSpotifyState {
    /// Gets a clone of the Spotify client with safe mutex access
    /// Returns an error if no authenticated session exists or mutex is poisoned
    fn get_client(&self) -> ApiResponse<AuthCodeSpotify> {
        self.client.lock()
            .map_err(|e| format!("Error de concurrencia en cliente: {}", e))?
            .clone()
            .ok_or_else(|| "No hay sesión activa. Autentícate primero.".to_string())
    }

    /// Sets the Spotify client with safe mutex access
    /// Returns an error if mutex is poisoned
    fn set_client(&self, client: AuthCodeSpotify) -> ApiResponse<()> {
        *self.client.lock()
            .map_err(|e| format!("Error de concurrencia al guardar cliente: {}", e))? = Some(client);
        Ok(())
    }

    /// Clears the client and user state safely
    /// Used during logout or error recovery
    fn clear(&self) -> ApiResponse<()> {
        *self.client.lock()
            .map_err(|e| format!("Error de concurrencia al limpiar cliente: {}", e))? = None;
        *self.user.lock()
            .map_err(|e| format!("Error de concurrencia al limpiar usuario: {}", e))? = None;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyUserProfile {
    /// Spotify user ID
    pub id: String,
    /// Display name of the user
    pub display_name: Option<String>,
    /// User's email address
    pub email: Option<String>,
    /// User's country code
    pub country: Option<String>,
    /// Spotify subscription type
    pub product: Option<String>,
    /// Number of followers
    pub followers: u32,
    /// Profile image URLs
    pub images: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyPlaylist {
    /// Unique playlist ID
    pub id: String,
    /// Playlist name
    pub name: String,
    /// Playlist description
    pub description: Option<String>,
    /// Owner's display name
    pub owner: String,
    /// Total number of tracks
    pub tracks_total: u32,
    /// Cover image URLs
    pub images: Vec<String>,
    /// Whether the playlist is public
    pub public: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyTrack {
    /// Spotify track ID
    pub id: Option<String>,
    /// Track name
    pub name: String,
    /// List of artist names
    pub artists: Vec<String>,
    /// Album name
    pub album: String,
    /// Album cover image URL
    pub album_image: Option<String>,
    /// Track duration in milliseconds
    pub duration_ms: u32,
    /// Track popularity score (0-100)
    pub popularity: Option<u32>,
    /// Preview URL for 30-second sample
    pub preview_url: Option<String>,
    /// External Spotify URL
    pub external_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyArtist {
    /// Artist ID
    pub id: String,
    /// Artist name
    pub name: String,
    /// List of genres
    pub genres: Vec<String>,
    /// Artist popularity (0-100)
    pub popularity: u32,
    /// Number of followers
    pub followers: u32,
    /// Profile image URLs
    pub images: Vec<String>,
    /// External Spotify URL
    pub external_url: Option<String>,
}

// ❌ STRUCT ELIMINADO: SpotifyCurrentPlayback
// Ya no consultamos el estado de reproducción de Spotify en dispositivos

/// Initializes and authenticates with Spotify using Authorization Code Flow
/// Starts a local HTTP server to handle the OAuth callback and opens the browser
/// Times out after OAUTH_CALLBACK_TIMEOUT_SECS seconds if no callback is received
#[tauri::command]
pub async fn spotify_authenticate(
    state: State<'_, RSpotifyState>,
    app: tauri::AppHandle,
) -> ApiResponse<String> {
    tracing::info!("🎵 Starting Spotify authentication");

    // Configure credentials from environment variables
    let creds = Credentials::from_env()
        .ok_or_else(|| {
            tracing::error!("❌ Spotify credentials not found in environment");
            "No se encontraron las credenciales de Spotify. Verifica tu archivo .env".to_string()
        })?;

    tracing::debug!("✅ Spotify credentials loaded");

    // Configure OAuth with read-only scopes (no playback control)
    let oauth = OAuth {
        redirect_uri: format!("http://{}/callback", OAUTH_SERVER_ADDR),
        scopes: scopes!(
            "user-read-private",
            "user-read-email",
            "user-library-read",
            "playlist-read-private",
            "playlist-read-collaborative",
            "user-top-read",
            "user-read-recently-played"
        ),
        ..Default::default()
    };

    let config = Config {
        token_cached: true,
        token_refreshing: true,
        ..Default::default()
    };

    let spotify = AuthCodeSpotify::with_config(creds, oauth, config);

    // Get authorization URL
    let auth_url = spotify.get_authorize_url(false)
        .map_err(|e| {
            tracing::error!("❌ Failed to generate auth URL: {}", e);
            format!("Error al generar URL de autorización: {}", e)
        })?;

    tracing::debug!("🌐 Opening browser for Spotify authorization");

    // Open browser with timeout protection
    let opener = tauri_plugin_opener::OpenerExt::opener(&app);
    opener.open_url(auth_url.clone(), None::<&str>)
        .map_err(|e| {
            tracing::error!("❌ Failed to open browser: {}", e);
            format!("Error abriendo navegador: {}", e)
        })?;

    // Start HTTP server with timeout to prevent blocking
    let server = Server::http(OAUTH_SERVER_ADDR)
        .map_err(|e| {
            tracing::error!("❌ Failed to start OAuth server: {}", e);
            format!("Error iniciando servidor OAuth (¿Puerto ocupado?): {}", e)
        })?;

    tracing::info!("⏳ Waiting for OAuth callback (timeout: {}s)", OAUTH_CALLBACK_TIMEOUT_SECS);

    // Wait for callback with timeout
    let request = timeout(
        Duration::from_secs(OAUTH_CALLBACK_TIMEOUT_SECS),
        tokio::task::spawn_blocking(move || server.recv())
    )
        .await
        .map_err(|_| {
            tracing::error!("❌ OAuth timeout after {} seconds", OAUTH_CALLBACK_TIMEOUT_SECS);
            "Timeout esperando autorización. Intenta nuevamente.".to_string()
        })?
        .map_err(|e| {
            tracing::error!("❌ Error in OAuth server thread: {}", e);
            format!("Error en thread del servidor: {}", e)
        })?
        .map_err(|e| {
            tracing::error!("❌ Failed to receive OAuth callback: {}", e);
            format!("Error recibiendo callback: {}", e)
        })?;

    let url = request.url().to_string();

    tracing::debug!("📡 OAuth callback received");

    // HTML response for user feedback (minified)
    let response_html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Autenticación Exitosa</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#1DB954 0%,#191414 100%)}.container{background:#fff;padding:40px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,.3);text-align:center;max-width:400px}h1{color:#1DB954;margin-bottom:10px}p{color:#666;margin-top:0}.checkmark{width:80px;height:80px;border-radius:50%;background:#1DB954;display:inline-block;margin-bottom:20px}.checkmark:after{content:'✓';color:#fff;font-size:50px;line-height:80px}</style></head><body><div class=\"container\"><div class=\"checkmark\"></div><h1>¡Autenticación Exitosa!</h1><p>Ya puedes cerrar esta ventana.</p></div><script>setTimeout(()=>window.close(),2000)</script></body></html>";

    // Respond to browser (ignore errors as browser may close immediately)
    if let Ok(header) = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]) {
        let _ = request.respond(Response::from_string(response_html).with_header(header));
    }

    // Extract authorization code from URL
    let code = url
        .split("code=")
        .nth(1)
        .and_then(|s| s.split('&').next())
        .ok_or_else(|| {
            tracing::error!("❌ Authorization code not found in callback URL");
            "No se encontró el código de autorización en la URL".to_string()
        })?;

    if code.is_empty() {
        tracing::error!("❌ Empty authorization code");
        return Err("Código de autorización vacío".to_string());
    }

    tracing::debug!("🔑 Exchanging authorization code for token");

    // Exchange code for access token
    spotify.request_token(code)
        .await
        .map_err(|e| {
            tracing::error!("❌ Failed to obtain access token: {}", e);
            format!("Error obteniendo token de acceso: {}", e)
        })?;

    tracing::info!("✅ Token obtained and cached");

    // Save client in state safely
    state.set_client(spotify)?;

    tracing::info!("🎵 Spotify authentication completed successfully");
    Ok("Autenticación exitosa".to_string())
}

/// Gets the authenticated user's profile information
#[tauri::command]
pub async fn spotify_get_profile(state: State<'_, RSpotifyState>) -> ApiResponse<SpotifyUserProfile> {
    tracing::debug!("🎵 Getting user profile");

    let spotify = state.get_client()?;

    let user = spotify.current_user()
        .await
        .map_err(|e| {
            tracing::error!("❌ Failed to get user profile: {}", e);
            format!("Error al obtener perfil: {}", e)
        })?;

    let profile = SpotifyUserProfile {
        id: user.id.to_string(),
        display_name: user.display_name.clone(),
        email: user.email.clone(),
        country: user.country.map(|c| format!("{:?}", c)),
        product: user.product.map(|p| format!("{:?}", p)),
        followers: user.followers.map(|f| f.total).unwrap_or(0),
        images: user.images
            .as_ref()
            .and_then(|imgs| imgs.first())
            .map(|img| vec![img.url.clone()])
            .unwrap_or_default(),
    };

    // Save in state safely
    *state.user.lock()
        .map_err(|e| {
            tracing::error!("❌ Failed to save user profile to state: {}", e);
            format!("Error de concurrencia: {}", e)
        })? = Some(profile.clone());

    tracing::info!("✅ User profile retrieved successfully");
    Ok(profile)
}

/// Gets the user's playlists with optional limit
#[tauri::command]
pub async fn spotify_get_playlists(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
) -> ApiResponse<Vec<SpotifyPlaylist>> {
    tracing::debug!("🎵 Getting user playlists (limit: {:?})", limit);

    let spotify = state.get_client()?;
    let final_limit = limit.unwrap_or(20).min(50); // API maximum limit

    let playlists = spotify.current_user_playlists_manual(Some(final_limit), None)
        .await
        .map_err(|e| {
            tracing::error!("❌ Failed to get playlists: {}", e);
            format!("Error obteniendo playlists: {}", e)
        })?;

    let result: Vec<SpotifyPlaylist> = playlists.items.iter().map(|p| {
        SpotifyPlaylist {
            id: p.id.to_string(),
            name: p.name.clone(),
            description: None,
            owner: p.owner.display_name.clone().unwrap_or_else(|| p.owner.id.to_string()),
            tracks_total: p.tracks.total,
            images: p.images
                .first()
                .map(|img| vec![img.url.clone()])
                .unwrap_or_default(),
            public: p.public,
        }
    }).collect();

    tracing::info!("✅ Retrieved {} playlists", result.len());
    Ok(result)
}

/// Gets the user's saved tracks with pagination support
#[tauri::command]
pub async fn spotify_get_saved_tracks(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> ApiResponse<Vec<SpotifyTrack>> {
    tracing::debug!("🎵 Getting saved tracks (limit: {:?}, offset: {:?})", limit, offset);

    let spotify = state.get_client()?;
    let final_limit = limit.unwrap_or(SPOTIFY_BATCH_SIZE).min(SPOTIFY_BATCH_SIZE);
    let final_offset = offset.unwrap_or(0);

    let saved = spotify.current_user_saved_tracks_manual(
        None::<rspotify::model::Market>,
        Some(final_limit),
        Some(final_offset)
    )
    .await
    .map_err(|e| {
        tracing::error!("❌ Failed to get saved tracks: {}", e);
        format!("Error obteniendo canciones guardadas: {}", e)
    })?;

    let tracks: Vec<SpotifyTrack> = saved.items.iter().map(|item| {
        let track = &item.track;
        SpotifyTrack {
            id: track.id.as_ref().map(|id| id.to_string()),
            name: track.name.clone(),
            artists: track.artists.iter().map(|a| a.name.clone()).collect(),
            album: track.album.name.clone(),
            album_image: track.album.images.first().map(|img| img.url.clone()),
            duration_ms: track.duration.num_milliseconds() as u32,
            popularity: Some(track.popularity),
            preview_url: track.preview_url.clone(),
            external_url: track.external_urls.get("spotify").cloned(),
        }
    }).collect();

    tracing::info!("✅ Retrieved {} saved tracks", tracks.len());
    Ok(tracks)
}

/// Gets the user's top artists based on listening history
#[tauri::command]
pub async fn spotify_get_top_artists(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
    time_range: Option<String>,
) -> ApiResponse<Vec<SpotifyArtist>> {
    use rspotify::model::TimeRange;

    tracing::debug!("🎵 Getting top artists (limit: {:?}, time_range: {:?})", limit, time_range);

    let spotify = state.get_client()?;
    let final_limit = limit.unwrap_or(20).min(50);
    let range = match time_range.as_deref() {
        Some("short_term") => TimeRange::ShortTerm,
        Some("long_term") => TimeRange::LongTerm,
        _ => TimeRange::MediumTerm,
    };

    let artists = spotify.current_user_top_artists_manual(
        Some(range),
        Some(final_limit),
        None
    )
    .await
    .map_err(|e| {
        tracing::error!("❌ Failed to get top artists: {}", e);
        format!("Error obteniendo artistas top: {}", e)
    })?;

    let result: Vec<SpotifyArtist> = artists.items.iter().map(|artist| {
        SpotifyArtist {
            id: artist.id.to_string(),
            name: artist.name.clone(),
            genres: artist.genres.clone(),
            popularity: artist.popularity,
            followers: artist.followers.total,
            images: artist.images.iter().map(|img| img.url.clone()).collect(),
            external_url: artist.external_urls.get("spotify").cloned(),
        }
    }).collect();

    tracing::info!("✅ Retrieved {} top artists", result.len());
    Ok(result)
}

/// Gets the user's top tracks with optional time range and limit
#[tauri::command]
pub async fn spotify_get_top_tracks(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
    time_range: Option<String>,
) -> ApiResponse<Vec<SpotifyTrack>> {
    use rspotify::model::TimeRange;

    tracing::debug!("🎵 Getting top tracks (limit: {:?}, time_range: {:?})", limit, time_range);

    let spotify = state.get_client()?;
    let final_limit = limit.unwrap_or(20).min(50);
    let range = match time_range.as_deref() {
        Some("short_term") => TimeRange::ShortTerm,
        Some("long_term") => TimeRange::LongTerm,
        _ => TimeRange::MediumTerm,
    };

    let tracks = spotify.current_user_top_tracks_manual(
        Some(range),
        Some(final_limit),
        None
    )
    .await
    .map_err(|e| {
        tracing::error!("❌ Failed to get top tracks: {}", e);
        format!("Error obteniendo tracks top: {}", e)
    })?;

    let result: Vec<SpotifyTrack> = tracks.items.iter().map(|track| {
        SpotifyTrack {
            id: track.id.as_ref().map(|id| id.to_string()),
            name: track.name.clone(),
            artists: track.artists.iter().map(|a| a.name.clone()).collect(),
            album: track.album.name.clone(),
            album_image: track.album.images.first().map(|img| img.url.clone()),
            duration_ms: track.duration.num_milliseconds() as u32,
            popularity: Some(track.popularity),
            preview_url: track.preview_url.clone(),
            external_url: track.external_urls.get("spotify").cloned(),
        }
    }).collect();

    tracing::info!("✅ Retrieved {} top tracks", result.len());
    Ok(result)
}


/// Obtiene todas las canciones guardadas del usuario (con paginación automática)
/// DEPRECATED: Usa spotify_stream_all_liked_songs para mejor rendimiento con bibliotecas grandes
#[tauri::command]
pub async fn spotify_get_all_liked_songs(
    state: State<'_, RSpotifyState>,
) -> Result<Vec<SpotifyTrack>, String> {
    use rspotify::model::Market;
    
    let spotify = state.get_client()?;
    let mut all_tracks: Vec<SpotifyTrack> = Vec::with_capacity(1000); // Pre-allocar para performance
    let mut offset = 0;
    let mut retries = 0;
    
    loop {
        let saved = match spotify.current_user_saved_tracks_manual(
            None::<Market>,
            Some(SPOTIFY_BATCH_SIZE),
            Some(offset)
        ).await {
            Ok(result) => result,
            Err(e) => {
                retries += 1;
                if retries >= MAX_RETRY_ATTEMPTS {
                    return Err(format!("Error después de {} intentos: {}", MAX_RETRY_ATTEMPTS, e));
                }
                #[cfg(debug_assertions)]
                eprintln!("⚠️ Error en offset {}, reintentando ({}/{})", offset, retries, MAX_RETRY_ATTEMPTS);
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }
        };

        let batch_size = saved.items.len();
        
        // Convertir y agregar tracks
        let tracks: Vec<SpotifyTrack> = saved.items.iter().map(|item| {
            convert_spotify_track(&item.track)
        }).collect();
        
        all_tracks.extend(tracks);
        
        // Si recibimos menos del límite, no hay más páginas
        if batch_size < SPOTIFY_BATCH_SIZE as usize {
            break;
        }
        
        offset += SPOTIFY_BATCH_SIZE;
        retries = 0; // Reset retries en batch exitoso
    }

    Ok(all_tracks)
}

/// Helper para convertir un track de Spotify a nuestro formato
fn convert_spotify_track(track: &rspotify::model::FullTrack) -> SpotifyTrack {
    SpotifyTrack {
        id: track.id.as_ref().map(|id| id.to_string()),
        name: track.name.clone(),
        artists: track.artists.iter().map(|a| a.name.clone()).collect(),
        album: track.album.name.clone(),
        album_image: track.album.images.first().map(|img| img.url.clone()),
        duration_ms: track.duration.num_milliseconds() as u32,
        popularity: Some(track.popularity),
        preview_url: track.preview_url.clone(),
        external_url: track.external_urls.get("spotify").cloned(),
    }
}

/// Transmite las canciones guardadas progresivamente usando eventos de Tauri
/// Recomendado para bibliotecas grandes (>1000 canciones)
#[tauri::command]
pub async fn spotify_stream_all_liked_songs(
    state: State<'_, RSpotifyState>,
    window: tauri::Window,
) -> Result<(), String> {
    use rspotify::model::Market;
    
    let spotify = state.get_client()?;
    let mut offset = 0;
    let mut total_sent = 0;
    let mut retries = 0;
    
    // Obtener total para calcular progreso
    let first_batch = spotify.current_user_saved_tracks_manual(
        None::<Market>,
        Some(1),
        Some(0)
    )
        .await
        .map_err(|e| format!("Error obteniendo información inicial: {}", e))?;
    
    let total_tracks = first_batch.total as u32;
    
    // Emitir evento de inicio
    window.emit("spotify-tracks-start", serde_json::json!({
        "total": total_tracks
    }))
    .map_err(|e| format!("Error emitiendo evento: {}", e))?;
    
    loop {
        let saved = match spotify.current_user_saved_tracks_manual(
            None::<Market>,
            Some(SPOTIFY_BATCH_SIZE),
            Some(offset)
        ).await {
            Ok(result) => result,
            Err(e) => {
                retries += 1;
                if retries >= MAX_RETRY_ATTEMPTS {
                    let _ = window.emit("spotify-tracks-error", serde_json::json!({
                        "message": format!("Error después de {} intentos", MAX_RETRY_ATTEMPTS)
                    }));
                    return Err(format!("Error después de {} intentos: {}", MAX_RETRY_ATTEMPTS, e));
                }
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }
        };

        let batch_size = saved.items.len();
        
        // Convertir tracks usando helper
        let tracks: Vec<SpotifyTrack> = saved.items.iter()
            .map(|item| convert_spotify_track(&item.track))
            .collect();
        
        total_sent += batch_size as u32;
        let progress = if total_tracks > 0 {
            (total_sent as f32 / total_tracks as f32 * 100.0) as u32
        } else {
            100
        };
        
        // Emitir batch al frontend
        window.emit("spotify-tracks-batch", serde_json::json!({
            "tracks": tracks,
            "progress": progress,
            "loaded": total_sent,
            "total": total_tracks
        }))
        .map_err(|e| format!("Error emitiendo batch: {}", e))?;
        
        // Si recibimos menos del límite, no hay más páginas
        if batch_size < SPOTIFY_BATCH_SIZE as usize {
            break;
        }
        
        offset += SPOTIFY_BATCH_SIZE;
        retries = 0; // Reset en batch exitoso
    }

    // Emitir evento de finalización
    window.emit("spotify-tracks-complete", serde_json::json!({
        "total": total_sent
    }))
    .map_err(|e| format!("Error emitiendo evento: {}", e))?;

    Ok(())
}

/// Cierra la sesión de Spotify y limpia recursos
#[tauri::command]
pub fn spotify_logout(state: State<'_, RSpotifyState>) -> Result<(), String> {
    state.clear()
}

/// Verifica si hay una sesión activa de Spotify
#[tauri::command]
pub fn spotify_is_authenticated(state: State<'_, RSpotifyState>) -> bool {
    state.client.lock()
        .map(|guard| guard.is_some())
        .unwrap_or(false)
}
