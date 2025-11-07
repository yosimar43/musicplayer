use rspotify::{
    AuthCodeSpotify,
    Config,
    Credentials,
    OAuth,
    scopes,
    clients::OAuthClient,
    model::PlayableItem,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tiny_http::{Server, Response};

// Estado global para mantener el cliente de Spotify
pub struct RSpotifyState {
    pub client: Mutex<Option<AuthCodeSpotify>>,
    pub user: Mutex<Option<SpotifyUserProfile>>,
}

impl Default for RSpotifyState {
    fn default() -> Self {
        Self {
            client: Mutex::new(None),
            user: Mutex::new(None),
        }
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
    pub duration_ms: u32,
    pub popularity: Option<u32>,
    pub preview_url: Option<String>,
    pub external_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyCurrentPlayback {
    pub is_playing: bool,
    pub track: Option<SpotifyTrack>,
    pub progress_ms: Option<u32>,
    pub device_name: Option<String>,
    pub shuffle_state: bool,
    pub repeat_state: String,
}

/// Inicializa y autentica con Spotify usando Authorization Code Flow
#[tauri::command]
pub async fn spotify_authenticate(
    state: State<'_, RSpotifyState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    println!("🎵 [RSpotify] Iniciando autenticación...");

    // Configurar credenciales desde variables de entorno
    let creds = Credentials::from_env()
        .ok_or_else(|| {
            println!("❌ [RSpotify] No se encontraron credenciales en .env");
            "No se encontraron las credenciales de Spotify. Verifica tu archivo .env".to_string()
        })?;

    println!("✅ [RSpotify] Credenciales cargadas");
    println!("   - Client ID: {}...", &creds.id[..10.min(creds.id.len())]);

    // Configurar OAuth
    let oauth = OAuth {
        redirect_uri: "http://localhost:8888/callback".to_string(),
        scopes: scopes!(
            "user-read-private",
            "user-read-email", 
            "user-library-read",
            "playlist-read-private",
            "playlist-read-collaborative",
            "user-read-playback-state",
            "user-modify-playback-state",
            "user-read-currently-playing",
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

    println!("🔗 [RSpotify] Generando URL de autorización...");
    
    // Obtener URL de autorización
    let auth_url = spotify.get_authorize_url(false)
        .map_err(|e| {
            println!("❌ [RSpotify] Error generando URL: {}", e);
            format!("Error al generar URL de autorización: {}", e)
        })?;

    println!("✅ [RSpotify] URL generada: {}", auth_url);
    println!("🌐 [RSpotify] Abriendo navegador...");

    // Abrir navegador
    let opener = tauri_plugin_opener::OpenerExt::opener(&app);
    opener.open_url(auth_url.clone(), None::<&str>)
        .map_err(|e| format!("Error abriendo navegador: {}", e))?;

    println!("⏳ [RSpotify] Esperando código de autorización en http://localhost:8888...");

    // Iniciar servidor HTTP para capturar el callback
    let server = Server::http("127.0.0.1:8888")
        .map_err(|e| format!("Error iniciando servidor: {}", e))?;

    // Esperar la petición del callback
    let request = server.recv()
        .map_err(|e| format!("Error recibiendo callback: {}", e))?;

    let url = request.url().to_string();
    println!("📡 [RSpotify] Callback recibido: {}", url);

    // Responder al navegador
    let response_html = r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Autenticación Exitosa</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 400px;
                }
                h1 { color: #1DB954; margin-bottom: 10px; }
                p { color: #666; margin-top: 0; }
                .checkmark {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: #1DB954;
                    display: inline-block;
                    margin-bottom: 20px;
                }
                .checkmark:after {
                    content: '✓';
                    color: white;
                    font-size: 50px;
                    line-height: 80px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="checkmark"></div>
                <h1>¡Autenticación Exitosa!</h1>
                <p>Ya puedes cerrar esta ventana y volver a la aplicación.</p>
            </div>
            <script>
                setTimeout(() => window.close(), 2000);
            </script>
        </body>
        </html>
    "#;

    let _ = request.respond(Response::from_string(response_html).with_header(
        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()
    ));

    // Extraer el código de la URL
    println!("🔑 [RSpotify] Extrayendo código de autorización...");
    
    // Parsear la URL para extraer el código
    let code = url
        .split("code=")
        .nth(1)
        .and_then(|s| s.split('&').next())
        .ok_or("No se encontró el código en la URL")?;

    println!("✅ [RSpotify] Código extraído: {}...", &code[..20.min(code.len())]);

    // Intercambiar el código por un token de acceso
    spotify.request_token(code)
        .await
        .map_err(|e| {
            println!("❌ [RSpotify] Error obteniendo token: {}", e);
            format!("Error obteniendo token: {}", e)
        })?;

    println!("✅ [RSpotify] Autenticación exitosa!");
    println!("✅ [RSpotify] Token obtenido y guardado en cache");

    // Guardar cliente en el estado
    *state.client.lock().unwrap() = Some(spotify);

    Ok("Autenticación exitosa".to_string())
}

/// Obtiene el perfil del usuario autenticado
#[tauri::command]
pub async fn spotify_get_profile(state: State<'_, RSpotifyState>) -> Result<SpotifyUserProfile, String> {
    println!("👤 [RSpotify] Obteniendo perfil de usuario...");

    let spotify = {
        let client = state.client.lock().unwrap();
        client.as_ref()
            .ok_or_else(|| {
                println!("❌ [RSpotify] Cliente no inicializado");
                "No hay sesión activa. Autentícate primero.".to_string()
            })?
            .clone()
    };

    let user = spotify.current_user()
        .await
        .map_err(|e| {
            println!("❌ [RSpotify] Error obteniendo perfil: {}", e);
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

    println!("✅ [RSpotify] Perfil obtenido: {:?}", profile.display_name);

    // Guardar en estado
    *state.user.lock().unwrap() = Some(profile.clone());

    Ok(profile)
}

/// Obtiene las playlists del usuario
#[tauri::command]
pub async fn spotify_get_playlists(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
) -> Result<Vec<SpotifyPlaylist>, String> {
    println!("📋 [RSpotify] Obteniendo playlists...");

    let spotify = {
        let client = state.client.lock().unwrap();
        client.as_ref()
            .ok_or("No hay sesión activa")?
            .clone()
    };

    let playlists = spotify.current_user_playlists_manual(Some(limit.unwrap_or(20)), None)
        .await
        .map_err(|e| format!("Error obteniendo playlists: {}", e))?;

    let result: Vec<SpotifyPlaylist> = playlists.items.iter().map(|p| {
        SpotifyPlaylist {
            id: p.id.to_string(),
            name: p.name.clone(),
            description: None, // SimplifiedPlaylist no tiene description
            owner: p.owner.display_name.clone().unwrap_or_else(|| p.owner.id.to_string()),
            tracks_total: p.tracks.total,
            images: p.images
                .first()
                .map(|img| vec![img.url.clone()])
                .unwrap_or_default(),
            public: p.public,
        }
    }).collect();

    println!("✅ [RSpotify] {} playlists obtenidas", result.len());

    Ok(result)
}

/// Obtiene el estado actual de reproducción
#[tauri::command]
pub async fn spotify_get_current_playback(
    state: State<'_, RSpotifyState>,
) -> Result<Option<SpotifyCurrentPlayback>, String> {
    println!("▶️ [RSpotify] Obteniendo reproducción actual...");

    let spotify = {
        let client = state.client.lock().unwrap();
        client.as_ref()
            .ok_or("No hay sesión activa")?
            .clone()
    };

    let playback = spotify.current_playback(None, None::<Vec<_>>)
        .await
        .map_err(|e| format!("Error obteniendo playback: {}", e))?;

    if let Some(pb) = playback {
        let track = if let Some(PlayableItem::Track(track)) = pb.item {
            Some(SpotifyTrack {
                id: track.id.map(|id| id.to_string()),
                name: track.name,
                artists: track.artists.iter().map(|a| a.name.clone()).collect(),
                album: track.album.name,
                duration_ms: track.duration.num_milliseconds() as u32,
                popularity: Some(track.popularity),
                preview_url: track.preview_url,
                external_url: track.external_urls.get("spotify").cloned(),
            })
        } else {
            None
        };

        let result = SpotifyCurrentPlayback {
            is_playing: pb.is_playing,
            track,
            progress_ms: pb.progress.map(|d| d.num_milliseconds() as u32),
            device_name: Some(pb.device.name),
            shuffle_state: pb.shuffle_state,
            repeat_state: format!("{:?}", pb.repeat_state),
        };

        println!("✅ [RSpotify] Reproducción actual obtenida");
        Ok(Some(result))
    } else {
        println!("ℹ️ [RSpotify] No hay reproducción activa");
        Ok(None)
    }
}

/// Obtiene las canciones guardadas del usuario
#[tauri::command]
pub async fn spotify_get_saved_tracks(
    state: State<'_, RSpotifyState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<SpotifyTrack>, String> {
    println!("💾 [RSpotify] Obteniendo canciones guardadas (limit: {}, offset: {})...", 
        limit.unwrap_or(50), offset.unwrap_or(0));

    let spotify = {
        let client = state.client.lock().unwrap();
        client.as_ref()
            .ok_or("No hay sesión activa")?
            .clone()
    };

    let saved = spotify.current_user_saved_tracks_manual(None, Some(offset.unwrap_or(0)), Some(limit.unwrap_or(50)))
        .await
        .map_err(|e| format!("Error obteniendo canciones: {}", e))?;

    let result: Vec<SpotifyTrack> = saved.items.iter().map(|item| {
        let track = &item.track;
        SpotifyTrack {
            id: track.id.as_ref().map(|id| id.to_string()),
            name: track.name.clone(),
            artists: track.artists.iter().map(|a| a.name.clone()).collect(),
            album: track.album.name.clone(),
            duration_ms: track.duration.num_milliseconds() as u32,
            popularity: Some(track.popularity),
            preview_url: track.preview_url.clone(),
            external_url: track.external_urls.get("spotify").cloned(),
        }
    }).collect();

    println!("✅ [RSpotify] {} canciones guardadas obtenidas", result.len());

    Ok(result)
}

/// Cierra la sesión de Spotify
#[tauri::command]
pub fn spotify_logout(state: State<'_, RSpotifyState>) -> Result<(), String> {
    println!("🚪 [RSpotify] Cerrando sesión...");
    
    *state.client.lock().unwrap() = None;
    *state.user.lock().unwrap() = None;
    
    println!("✅ [RSpotify] Sesión cerrada");
    Ok(())
}

/// Verifica si hay una sesión activa
#[tauri::command]
pub fn spotify_is_authenticated(state: State<'_, RSpotifyState>) -> bool {
    state.client.lock().unwrap().is_some()
}
