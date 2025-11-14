//! Spotify API service
//! 
//! Handles all Spotify API interactions including OAuth authentication,
//! fetching user data, playlists, and tracks.

use std::sync::{Arc, Mutex};
use std::time::Duration;
use rspotify::{
    AuthCodeSpotify,
    Config,
    Credentials,
    OAuth,
    scopes,
    model::TimeRange,
    clients::OAuthClient,
};
use tauri::{AppHandle, Emitter, Window};
use tiny_http::{Server, Response};
use tokio::time::timeout;

use crate::domain::spotify::{
    SpotifyUserProfile, SpotifyPlaylist, SpotifyTrack, SpotifyArtist,
    SPOTIFY_BATCH_SIZE, MAX_RETRY_ATTEMPTS, OAUTH_CALLBACK_TIMEOUT_SECS, OAUTH_SERVER_ADDR,
};
use crate::errors::{AppError, SpotifyError};

/// Thread-safe state for Spotify client
/// 
/// Uses Arc<Mutex<>> for safe concurrent access, but guards are released
/// as early as possible to prevent deadlocks.
pub struct SpotifyState {
    /// Authenticated Spotify client wrapped in Arc<Mutex<>> for thread safety
    client: Arc<Mutex<Option<AuthCodeSpotify>>>,
    /// Cached user profile information
    user: Arc<Mutex<Option<SpotifyUserProfile>>>,
}

impl Default for SpotifyState {
    fn default() -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            user: Arc::new(Mutex::new(None)),
        }
    }
}

impl SpotifyState {
    /// Gets a clone of the Spotify client with safe mutex access
    /// 
    /// Returns an error if no authenticated session exists or mutex is poisoned.
    /// Guard is released immediately after cloning to prevent deadlocks.
    pub fn get_client(&self) -> Result<AuthCodeSpotify, AppError> {
        let client_opt = self.client.lock()
            .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock client: {}", e)))?;
        
        // Clone and release guard immediately
        let client = client_opt.clone()
            .ok_or_else(|| SpotifyError::NotAuthenticated)?;
        
        Ok(client)
    }

    /// Sets the Spotify client with safe mutex access
    pub fn set_client(&self, client: AuthCodeSpotify) -> Result<(), AppError> {
        let mut guard = self.client.lock()
            .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock client: {}", e)))?;
        
        *guard = Some(client);
        // Guard is dropped here automatically
        
        Ok(())
    }

    /// Clears the client and user state safely
    pub fn clear(&self) -> Result<(), AppError> {
        {
            let mut client_guard = self.client.lock()
                .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock client: {}", e)))?;
            *client_guard = None;
        } // Release client guard early
        
        {
            let mut user_guard = self.user.lock()
                .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock user: {}", e)))?;
            *user_guard = None;
        } // Release user guard early
        
        Ok(())
    }

    /// Checks if there's an authenticated session
    pub fn is_authenticated(&self) -> bool {
        self.client.lock()
            .map(|guard| guard.is_some())
            .unwrap_or(false)
    }
}

/// Service for Spotify API operations
pub struct SpotifyService;

impl SpotifyService {
    /// Initializes and authenticates with Spotify using Authorization Code Flow
    pub async fn authenticate(state: &SpotifyState, app: &AppHandle) -> Result<String, AppError> {
        tracing::info!("🎵 Starting Spotify authentication");

        // Configure credentials from environment variables
        let creds = Credentials::from_env()
            .ok_or_else(|| SpotifyError::CredentialsNotFound)?;

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
            .map_err(|e| SpotifyError::AuthenticationFailed(format!("Failed to generate auth URL: {}", e)))?;

        tracing::debug!("🌐 Opening browser for Spotify authorization");

        // Open browser with timeout protection
        let opener = tauri_plugin_opener::OpenerExt::opener(app);
        opener.open_url(auth_url.clone(), None::<&str>)
            .map_err(|e| SpotifyError::AuthenticationFailed(format!("Failed to open browser: {}", e)))?;

        // Start HTTP server with timeout to prevent blocking
        let server = Server::http(OAUTH_SERVER_ADDR)
            .map_err(|e| SpotifyError::OAuthServer(format!("Failed to start OAuth server: {}", e)))?;

        tracing::info!("⏳ Waiting for OAuth callback (timeout: {}s)", OAUTH_CALLBACK_TIMEOUT_SECS);

        // Wait for callback with timeout
        let request = timeout(
            Duration::from_secs(OAUTH_CALLBACK_TIMEOUT_SECS),
            tokio::task::spawn_blocking(move || server.recv())
        )
            .await
            .map_err(|_| SpotifyError::OAuthTimeout(OAUTH_CALLBACK_TIMEOUT_SECS))?
            .map_err(|e| SpotifyError::OAuthServer(format!("Error in OAuth server thread: {}", e)))?
            .map_err(|e| SpotifyError::OAuthServer(format!("Failed to receive OAuth callback: {}", e)))?;

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
            .ok_or_else(|| SpotifyError::InvalidAuthCode)?;

        if code.is_empty() {
            return Err(SpotifyError::InvalidAuthCode.into());
        }

        tracing::debug!("🔑 Exchanging authorization code for token");

        // Exchange code for access token
        spotify.request_token(code)
            .await
            .map_err(|e| SpotifyError::TokenExchange(format!("Failed to obtain access token: {}", e)))?;

        tracing::info!("✅ Token obtained and cached");

        // Save client in state safely
        state.set_client(spotify)?;

        tracing::info!("🎵 Spotify authentication completed successfully");
        Ok("Autenticación exitosa".to_string())
    }

    /// Gets the authenticated user's profile information
    pub async fn get_profile(state: &SpotifyState) -> Result<SpotifyUserProfile, AppError> {
        tracing::debug!("🎵 Getting user profile");

        let spotify = state.get_client()?;

        let user = spotify.current_user()
            .await
            .map_err(|e| SpotifyError::GetProfile(format!("Failed to get user profile: {}", e)))?;

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

        // Save in state safely (release guard early)
        {
            let mut user_guard = state.user.lock()
                .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock user: {}", e)))?;
            *user_guard = Some(profile.clone());
        }

        tracing::info!("✅ User profile retrieved successfully");
        Ok(profile)
    }

    /// Gets the user's playlists with optional limit
    pub async fn get_playlists(state: &SpotifyState, limit: Option<u32>) -> Result<Vec<SpotifyPlaylist>, AppError> {
        tracing::debug!("🎵 Getting user playlists (limit: {:?})", limit);

        let spotify = state.get_client()?;
        let final_limit = limit.unwrap_or(20).min(50); // API maximum limit

        let playlists = spotify.current_user_playlists_manual(Some(final_limit), None)
            .await
            .map_err(|e| SpotifyError::GetPlaylists(format!("Failed to get playlists: {}", e)))?;

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
    pub async fn get_saved_tracks(
        state: &SpotifyState,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<Vec<SpotifyTrack>, AppError> {
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
            .map_err(|e| SpotifyError::GetSavedTracks(format!("Failed to get saved tracks: {}", e)))?;

        let tracks: Vec<SpotifyTrack> = saved.items.iter().map(|item| {
            Self::convert_spotify_track(&item.track)
        }).collect();

        tracing::info!("✅ Retrieved {} saved tracks", tracks.len());
        Ok(tracks)
    }

    /// Gets the user's top artists based on listening history
    pub async fn get_top_artists(
        state: &SpotifyState,
        limit: Option<u32>,
        time_range: Option<String>,
    ) -> Result<Vec<SpotifyArtist>, AppError> {
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
            .map_err(|e| SpotifyError::GetTopArtists(format!("Failed to get top artists: {}", e)))?;

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
    pub async fn get_top_tracks(
        state: &SpotifyState,
        limit: Option<u32>,
        time_range: Option<String>,
    ) -> Result<Vec<SpotifyTrack>, AppError> {
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
            .map_err(|e| SpotifyError::GetTopTracks(format!("Failed to get top tracks: {}", e)))?;

        let result: Vec<SpotifyTrack> = tracks.items.iter().map(|track| {
            Self::convert_spotify_track(track)
        }).collect();

        tracing::info!("✅ Retrieved {} top tracks", result.len());
        Ok(result)
    }

    /// Streams all liked songs progressively using Tauri events
    /// Recommended for large libraries (>1000 songs)
    pub async fn stream_all_liked_songs(
        state: &SpotifyState,
        window: &Window,
    ) -> Result<(), AppError> {
        use rspotify::model::Market;
        
        let spotify = state.get_client()?;
        let mut offset = 0;
        let mut total_sent = 0;
        let mut retries = 0;
        
        // Get total for progress calculation
        let first_batch = spotify.current_user_saved_tracks_manual(
            None::<Market>,
            Some(1),
            Some(0)
        )
            .await
            .map_err(|e| SpotifyError::GetSavedTracks(format!("Error getting initial info: {}", e)))?;
        
        let total_tracks = first_batch.total as u32;
        
        // Emit start event
        window.emit("spotify-tracks-start", serde_json::json!({
            "total": total_tracks
        }))
            .map_err(|e| AppError::Unknown(format!("Error emitting event: {}", e)))?;
        
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
                        return Err(SpotifyError::GetSavedTracks(format!("Error after {} attempts: {}", MAX_RETRY_ATTEMPTS, e)).into());
                    }
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    continue;
                }
            };

            let batch_size = saved.items.len();
            
            // Convert tracks using helper
            let tracks: Vec<SpotifyTrack> = saved.items.iter()
                .map(|item| Self::convert_spotify_track(&item.track))
                .collect();
            
            total_sent += batch_size as u32;
            let progress = if total_tracks > 0 {
                (total_sent as f32 / total_tracks as f32 * 100.0) as u32
            } else {
                100
            };
            
            // Emit batch to frontend
            window.emit("spotify-tracks-batch", serde_json::json!({
                "tracks": tracks,
                "progress": progress,
                "loaded": total_sent,
                "total": total_tracks
            }))
                .map_err(|e| AppError::Unknown(format!("Error emitting batch: {}", e)))?;
            
            // If we received less than the limit, no more pages
            if batch_size < SPOTIFY_BATCH_SIZE as usize {
                break;
            }
            
            offset += SPOTIFY_BATCH_SIZE;
            retries = 0; // Reset on successful batch
        }

        // Emit completion event
        window.emit("spotify-tracks-complete", serde_json::json!({
            "total": total_sent
        }))
            .map_err(|e| AppError::Unknown(format!("Error emitting event: {}", e)))?;

        Ok(())
    }

    /// Helper to convert a Spotify track to our domain model
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
}

