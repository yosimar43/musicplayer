use rspotify::{
    AuthCodeSpotify,
    Config,
    Credentials,
    OAuth,
    scopes,
    clients::OAuthClient,
    prelude::Id,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{State, Emitter};
use tiny_http::{Server, Response};
use tokio::time::timeout;

// Constantes de configuración
const OAUTH_CALLBACK_TIMEOUT_SECS: u64 = 120; // 2 minutos
const OAUTH_SERVER_ADDR: &str = "127.0.0.1:8888";
const SPOTIFY_BATCH_SIZE: u32 = 50;
const MAX_RETRY_ATTEMPTS: u32 = 3;

/// Estado global para el cliente de Spotify con Arc para compartir entre threads
pub struct RSpotifyState {
    pub client: Arc<Mutex<Option<AuthCodeSpotify>>>,
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
    /// Obtiene una copia clonada del cliente con manejo seguro de Mutex
    fn get_client(&self) -> Result<AuthCodeSpotify, String> {
        self.client.lock()
            .map_err(|e| format!("Error de concurrencia: {}", e))?
            .clone()
            .ok_or_else(|| "No hay sesión activa. Autentícate primero.".to_string())
    }
    
    /// Establece el cliente de forma segura
    fn set_client(&self, client: AuthCodeSpotify) -> Result<(), String> {
        *self.client.lock()
            .map_err(|e| format!("Error de concurrencia: {}", e))? = Some(client);
        Ok(())
    }
    
    /// Limpia el estado y libera recursos
    fn clear(&self) -> Result<(), String> {
        *self.client.lock()
            .map_err(|e| format!("Error de concurrencia: {}", e))? = None;
        *self.user.lock()
            .map_err(|e| format!("Error de concurrencia: {}", e))? = None;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyUserProfile {
    pub id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub country: Option<String>,
    pub product: Option<String>,
    pub followers: u32,
    pub images: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyPlaylist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub owner: String,
    pub tracks_total: u32,
    pub images: Vec<String>,
    pub public: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyTrack {
    pub id: Option<String>,
    pub name: String,
    pub artists: Vec<String>,
    pub album: String,
    pub album_image: Option<String>,
    pub duration_ms: u32,
    pub popularity: Option<u32>,
    pub preview_url: Option<String>,
    pub external_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyArtist {
    pub id: String,
    pub name: String,
    pub genres: Vec<String>,
    pub popularity: u32,
    pub followers: u32,
    pub images: Vec<String>,
    pub external_url: Option<String>,
}

// ❌ STRUCT ELIMINADO: SpotifyCurrentPlayback
// Ya no consultamos el estado de reproducción de Spotify en dispositivos

/// Inicializa y autentica con Spotify usando Authorization Code Flow
#[tauri::command]
pub async fn spotify_authenticate(
    state: State<'_, RSpotifyState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    #[cfg(debug_assertions)]
    println!("🎵 [RSpotify] Iniciando autenticación...");

    // Configurar credenciales desde variables de entorno
    let creds = Credentials::from_env()
        .ok_or_else(|| {
            #[cfg(debug_assertions)]
            eprintln!("❌ [RSpotify] No se encontraron credenciales");
            "No se encontraron las credenciales de Spotify. Verifica tu archivo .env".to_string()
        })?;

    #[cfg(debug_assertions)]
    println!("✅ [RSpotify] Credenciales cargadas");

    // Configurar OAuth - Solo permisos de lectura de datos (sin control de reproducción)
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
    
    // Obtener URL de autorización
    let auth_url = spotify.get_authorize_url(false)
        .map_err(|e| format!("Error al generar URL de autorización: {}", e))?;

    #[cfg(debug_assertions)]
    println!("🌐 [RSpotify] Abriendo navegador...");

    // Abrir navegador
    let opener = tauri_plugin_opener::OpenerExt::opener(&app);
    opener.open_url(auth_url.clone(), None::<&str>)
        .map_err(|e| format!("Error abriendo navegador: {}", e))?;

    // Iniciar servidor HTTP con timeout para prevenir bloqueo
    let server = Server::http(OAUTH_SERVER_ADDR)
        .map_err(|e| format!("Error iniciando servidor OAuth (¿Puerto ocupado?): {}", e))?;

    #[cfg(debug_assertions)]
    println!("⏳ [RSpotify] Esperando callback (timeout: {}s)...", OAUTH_CALLBACK_TIMEOUT_SECS);

    // Esperar callback con timeout
    let request = timeout(
        Duration::from_secs(OAUTH_CALLBACK_TIMEOUT_SECS),
        tokio::task::spawn_blocking(move || server.recv())
    )
        .await
        .map_err(|_| "Timeout esperando autorización. Intenta nuevamente.".to_string())?
        .map_err(|e| format!("Error en thread del servidor: {}", e))?
        .map_err(|e| format!("Error recibiendo callback: {}", e))?;

    let url = request.url().to_string();
    
    #[cfg(debug_assertions)]
    println!("📡 [RSpotify] Callback recibido");

    // HTML de respuesta minificado
    let response_html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Autenticación Exitosa</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#1DB954 0%,#191414 100%)}.container{background:#fff;padding:40px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,.3);text-align:center;max-width:400px}h1{color:#1DB954;margin-bottom:10px}p{color:#666;margin-top:0}.checkmark{width:80px;height:80px;border-radius:50%;background:#1DB954;display:inline-block;margin-bottom:20px}.checkmark:after{content:'✓';color:#fff;font-size:50px;line-height:80px}</style></head><body><div class=\"container\"><div class=\"checkmark\"></div><h1>¡Autenticación Exitosa!</h1><p>Ya puedes cerrar esta ventana.</p></div><script>setTimeout(()=>window.close(),2000)</script></body></html>";

    // Responder al navegador (sin unwrap)
    if let Ok(header) = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]) {
        let _ = request.respond(Response::from_string(response_html).with_header(header));
    }

    // Extraer código de la URL con mejor manejo de errores
    let code = url
        .split("code=")
        .nth(1)
        .and_then(|s| s.split('&').next())
        .ok_or("No se encontró el código de autorización en la URL")?;

    if code.is_empty() {
        return Err("Código de autorización vacío".to_string());
    }

    #[cfg(debug_assertions)]
    println!("🔑 [RSpotify] Intercambiando código por token...");

    // Intercambiar el código por un token de acceso
    spotify.request_token(code)
        .await
        .map_err(|e| format!("Error obteniendo token de acceso: {}", e))?;

    #[cfg(debug_assertions)]
    println!("✅ [RSpotify] Token obtenido y cacheado");

    // Guardar cliente en el estado de forma segura
    state.set_client(spotify)?;

    Ok("Autenticación exitosa".to_string())
}

/// Obtiene el perfil del usuario autenticado
#[tauri::command]
pub async fn spotify_get_profile(state: State<'_, RSpotifyState>) -> Result<SpotifyUserProfile, String> {
    let spotify = state.get_client()?;

    let user = spotify.current_user()
        .await
        .map_err(|e| format!("Error al obtener perfil: {}", e))?;

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

    // Guardar en estado de forma segura
    *state.user.lock()
        .map_err(|e| format!("Error de concurrencia: {}", e))? = Some(profile.clone());

    Ok(profile)
}

/// Obtiene las playlists del usuario
#[tauri::command]
pub async fn spotify_get_playlists(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
) -> Result<Vec<SpotifyPlaylist>, String> {
    let spotify = state.get_client()?;
    let final_limit = limit.unwrap_or(20).min(50); // Limitar a máximo de API

    let playlists = spotify.current_user_playlists_manual(Some(final_limit), None)
        .await
        .map_err(|e| format!("Error obteniendo playlists: {}", e))?;

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

    Ok(result)
}

/// Obtiene las canciones guardadas del usuario (con paginación manual básica)
#[tauri::command]
pub async fn spotify_get_saved_tracks(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<SpotifyTrack>, String> {
    use rspotify::model::Market;
    
    let spotify = state.get_client()?;
    let final_limit = limit.unwrap_or(SPOTIFY_BATCH_SIZE).min(SPOTIFY_BATCH_SIZE);
    let final_offset = offset.unwrap_or(0);

    let saved = spotify.current_user_saved_tracks_manual(
        None::<Market>,
        Some(final_limit),
        Some(final_offset)
    )
        .await
        .map_err(|e| format!("Error obteniendo canciones: {}", e))?;

    let result: Vec<SpotifyTrack> = saved.items.iter().map(|item| {
        let track = &item.track;
        SpotifyTrack {
            id: track.id.as_ref().map(|id| id.to_string()),
            name: track.name.clone(),
            artists: track.artists.iter().map(|a| a.name.clone()).collect(),
            album: track.album.name.clone(),
            album_image: track.album.images
                .first()
                .map(|img| img.url.clone()),
            duration_ms: track.duration.num_milliseconds() as u32,
            popularity: Some(track.popularity),
            preview_url: track.preview_url.clone(),
            external_url: track.external_urls.get("spotify").cloned(),
        }
    }).collect();

    Ok(result)
}

/// Obtiene los artistas top del usuario
#[tauri::command]
pub async fn spotify_get_top_artists(
    state: State<'_, RSpotifyState>,
    time_range: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<SpotifyArtist>, String> {
    use rspotify::model::TimeRange;
    
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
        None,
    )
        .await
        .map_err(|e| format!("Error obteniendo top artistas: {}", e))?;

    let result: Vec<SpotifyArtist> = artists.items.iter().map(|artist| {
        SpotifyArtist {
            id: artist.id.id().to_string(),
            name: artist.name.clone(),
            genres: artist.genres.clone(),
            popularity: artist.popularity,
            followers: artist.followers.total,
            images: artist.images
                .iter()
                .map(|img| img.url.clone())
                .collect(),
            external_url: artist.external_urls.get("spotify").cloned(),
        }
    }).collect();

    Ok(result)
}

/// Obtiene las canciones top del usuario
#[tauri::command]
pub async fn spotify_get_top_tracks(
    state: State<'_, RSpotifyState>,
    time_range: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<SpotifyTrack>, String> {
    use rspotify::model::TimeRange;
    
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
        None,
    )
        .await
        .map_err(|e| format!("Error obteniendo top canciones: {}", e))?;

    let result: Vec<SpotifyTrack> = tracks.items.iter().map(|track| {
        SpotifyTrack {
            id: track.id.as_ref().map(|id| id.to_string()),
            name: track.name.clone(),
            artists: track.artists.iter().map(|a| a.name.clone()).collect(),
            album: track.album.name.clone(),
            album_image: track.album.images
                .first()
                .map(|img| img.url.clone()),
            duration_ms: track.duration.num_milliseconds() as u32,
            popularity: Some(track.popularity),
            preview_url: track.preview_url.clone(),
            external_url: track.external_urls.get("spotify").cloned(),
        }
    }).collect();

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
