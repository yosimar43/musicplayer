//! Spotify API service
//!
//! Handles all Spotify API interactions including OAuth authentication,
//! fetching user data, playlists, and tracks.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use rspotify::{
    clients::OAuthClient, model::TimeRange, scopes, AuthCodeSpotify, Config, Credentials, OAuth,
};
use tauri::{AppHandle, Emitter, Window};
use tiny_http::{Response, Server};
use tokio::time::timeout;
use tracing::instrument;

use crate::domain::spotify::{
    SpotifyArtist, SpotifyPlaylist, SpotifyTrack, SpotifyUserProfile, MAX_RETRY_ATTEMPTS,
    OAUTH_CALLBACK_TIMEOUT_SECS, OAUTH_SERVER_ADDR, SPOTIFY_BATCH_SIZE,
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
        let client_opt = self
            .client
            .lock()
            .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock client: {}", e)))?;

        // Clone and release guard immediately
        let client = client_opt
            .clone()
            .ok_or_else(|| SpotifyError::NotAuthenticated)?;

        Ok(client)
    }

    /// Sets the Spotify client with safe mutex access
    pub fn set_client(&self, client: AuthCodeSpotify) -> Result<(), AppError> {
        let mut guard = self
            .client
            .lock()
            .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock client: {}", e)))?;

        *guard = Some(client);
        // Guard is dropped here automatically

        Ok(())
    }

    /// Clears the client and user state safely
    pub fn clear(&self) -> Result<(), AppError> {
        {
            let mut client_guard = self
                .client
                .lock()
                .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock client: {}", e)))?;
            *client_guard = None;
        } // Release client guard early

        {
            let mut user_guard = self
                .user
                .lock()
                .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock user: {}", e)))?;
            *user_guard = None;
        } // Release user guard early

        Ok(())
    }

    /// Checks if there's an authenticated session
    pub fn is_authenticated(&self) -> bool {
        self.client
            .lock()
            .map(|guard| guard.is_some())
            .unwrap_or(false)
    }
}

/// Service for Spotify API operations
pub struct SpotifyService;

impl SpotifyService {
    /// Initializes and authenticates with Spotify using Authorization Code Flow
    #[instrument(skip_all)]
    pub async fn authenticate(state: &SpotifyState, app: &AppHandle) -> Result<String, AppError> {
        let creds = Credentials::from_env().ok_or_else(|| SpotifyError::CredentialsNotFound)?;

        let spotify = Self::create_spotify_client(creds)?;
        let auth_url = spotify.get_authorize_url(false).map_err(|e| {
            SpotifyError::AuthenticationFailed(format!("Failed to generate auth URL: {}", e))
        })?;

        Self::open_browser(app, &auth_url)?;
        let code = Self::wait_for_oauth_callback().await?;
        Self::exchange_token(&spotify, &code).await?;
        state.set_client(spotify)?;

        Ok("Autenticación exitosa".to_string())
    }

    /// Creates a configured Spotify client
    fn create_spotify_client(creds: Credentials) -> Result<AuthCodeSpotify, AppError> {
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

        Ok(AuthCodeSpotify::with_config(creds, oauth, config))
    }

    /// Opens browser with authorization URL
    fn open_browser(app: &AppHandle, auth_url: &str) -> Result<(), AppError> {
        let opener = tauri_plugin_opener::OpenerExt::opener(app);
        opener.open_url(auth_url, None::<&str>).map_err(|e| {
            SpotifyError::AuthenticationFailed(format!("Failed to open browser: {}", e))
        })?;
        Ok(())
    }

    /// Waits for OAuth callback with timeout
    async fn wait_for_oauth_callback() -> Result<String, AppError> {
        let server = Server::http(OAUTH_SERVER_ADDR).map_err(|e| {
            SpotifyError::OAuthServer(format!("Failed to start OAuth server: {}", e))
        })?;

        let request = timeout(
            Duration::from_secs(OAUTH_CALLBACK_TIMEOUT_SECS),
            tokio::task::spawn_blocking(move || server.recv()),
        )
        .await
        .map_err(|_| SpotifyError::OAuthTimeout(OAUTH_CALLBACK_TIMEOUT_SECS))?
        .map_err(|e| SpotifyError::OAuthServer(format!("Error in OAuth server thread: {}", e)))?
        .map_err(|e| {
            SpotifyError::OAuthServer(format!("Failed to receive OAuth callback: {}", e))
        })?;

        let url = request.url().to_string();
        Self::send_oauth_response(&request);
        Self::extract_auth_code(&url)
    }

    /// Sends HTML response to browser
    fn send_oauth_response(request: &tiny_http::Request) {
        const RESPONSE_HTML: &str = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Autenticación Exitosa</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#1DB954 0%,#191414 100%)}.container{background:#fff;padding:40px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,.3);text-align:center;max-width:400px}h1{color:#1DB954;margin-bottom:10px}p{color:#666;margin-top:0}.checkmark{width:80px;height:80px;border-radius:50%;background:#1DB954;display:inline-block;margin-bottom:20px}.checkmark:after{content:'✓';color:#fff;font-size:50px;line-height:80px}</style></head><body><div class=\"container\"><div class=\"checkmark\"></div><h1>¡Autenticación Exitosa!</h1><p>Ya puedes cerrar esta ventana.</p></div><script>setTimeout(()=>window.close(),2000)</script></body></html>";

        if let Ok(header) =
            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
        {
            let _ = request.respond(Response::from_string(RESPONSE_HTML).with_header(header));
        }
    }

    /// Extracts authorization code from callback URL
    fn extract_auth_code(url: &str) -> Result<String, AppError> {
        let code = url
            .split("code=")
            .nth(1)
            .and_then(|s| s.split('&').next())
            .ok_or_else(|| SpotifyError::InvalidAuthCode)?;

        if code.is_empty() {
            return Err(SpotifyError::InvalidAuthCode.into());
        }

        Ok(code.to_string())
    }

    /// Exchanges authorization code for access token
    async fn exchange_token(spotify: &AuthCodeSpotify, code: &str) -> Result<(), AppError> {
        spotify.request_token(code).await.map_err(|e| {
            SpotifyError::TokenExchange(format!("Failed to obtain access token: {}", e))
        })?;
        Ok(())
    }

    /// Gets the authenticated user's profile information
    #[instrument(skip_all)]
    pub async fn get_profile(state: &SpotifyState) -> Result<SpotifyUserProfile, AppError> {
        let spotify = state.get_client()?;
        let user = spotify
            .current_user()
            .await
            .map_err(|e| SpotifyError::GetProfile(format!("Failed to get user profile: {}", e)))?;

        let profile = Self::convert_user_to_profile(&user);
        Self::cache_user_profile(state, &profile)?;

        Ok(profile)
    }

    /// Converts rspotify user to our domain model
    fn convert_user_to_profile(user: &rspotify::model::PrivateUser) -> SpotifyUserProfile {
        SpotifyUserProfile {
            id: user.id.to_string(),
            display_name: user.display_name.clone(),
            email: user.email.clone(),
            country: user.country.map(|c| format!("{:?}", c)),
            product: user.product.map(|p| format!("{:?}", p)),
            followers: user.followers.map(|f| f.total).unwrap_or(0),
            images: user
                .images
                .as_ref()
                .and_then(|imgs| imgs.first())
                .map(|img| vec![img.url.clone()])
                .unwrap_or_default(),
        }
    }

    /// Caches user profile in state
    fn cache_user_profile(
        state: &SpotifyState,
        profile: &SpotifyUserProfile,
    ) -> Result<(), AppError> {
        let mut user_guard = state
            .user
            .lock()
            .map_err(|e| SpotifyError::ClientLock(format!("Failed to lock user: {}", e)))?;
        *user_guard = Some(profile.clone());
        Ok(())
    }

    /// Gets the user's playlists with optional limit
    #[instrument(skip_all, fields(limit))]
    pub async fn get_playlists(
        state: &SpotifyState,
        limit: Option<u32>,
    ) -> Result<Vec<SpotifyPlaylist>, AppError> {
        let spotify = state.get_client()?;
        let final_limit = limit.unwrap_or(20).min(50); // API maximum limit

        let playlists = spotify
            .current_user_playlists_manual(Some(final_limit), None)
            .await
            .map_err(|e| SpotifyError::GetPlaylists(format!("Failed to get playlists: {}", e)))?;

        let result: Vec<SpotifyPlaylist> =
            playlists.items.iter().map(Self::convert_playlist).collect();

        Ok(result)
    }

    /// Converts rspotify playlist to our domain model
    fn convert_playlist(p: &rspotify::model::SimplifiedPlaylist) -> SpotifyPlaylist {
        SpotifyPlaylist {
            id: p.id.to_string(),
            name: p.name.clone(),
            description: None,
            owner: p
                .owner
                .display_name
                .clone()
                .unwrap_or_else(|| p.owner.id.to_string()),
            tracks_total: p.tracks.total,
            images: p
                .images
                .first()
                .map(|img| vec![img.url.clone()])
                .unwrap_or_default(),
            public: p.public,
        }
    }

    /// Gets the user's saved tracks with pagination support
    #[instrument(skip_all, fields(limit, offset))]
    pub async fn get_saved_tracks(
        state: &SpotifyState,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<Vec<SpotifyTrack>, AppError> {
        let spotify = state.get_client()?;
        let final_limit = limit.unwrap_or(SPOTIFY_BATCH_SIZE).min(SPOTIFY_BATCH_SIZE);
        let final_offset = offset.unwrap_or(0);

        let saved = spotify
            .current_user_saved_tracks_manual(
                None::<rspotify::model::Market>,
                Some(final_limit),
                Some(final_offset),
            )
            .await
            .map_err(|e| {
                SpotifyError::GetSavedTracks(format!("Failed to get saved tracks: {}", e))
            })?;

        let tracks: Vec<SpotifyTrack> = saved
            .items
            .iter()
            .map(|item| Self::convert_spotify_track(&item.track))
            .collect();

        Ok(tracks)
    }

    /// Gets the user's top artists based on listening history
    #[instrument(skip_all, fields(limit, time_range))]
    pub async fn get_top_artists(
        state: &SpotifyState,
        limit: Option<u32>,
        time_range: Option<String>,
    ) -> Result<Vec<SpotifyArtist>, AppError> {
        let spotify = state.get_client()?;
        let final_limit = limit.unwrap_or(20).min(50);
        let range = Self::parse_time_range(time_range.as_deref());

        let artists = spotify
            .current_user_top_artists_manual(Some(range), Some(final_limit), None)
            .await
            .map_err(|e| {
                SpotifyError::GetTopArtists(format!("Failed to get top artists: {}", e))
            })?;

        let result: Vec<SpotifyArtist> = artists.items.iter().map(Self::convert_artist).collect();

        Ok(result)
    }

    /// Parses time range string to TimeRange enum
    fn parse_time_range(time_range: Option<&str>) -> TimeRange {
        match time_range {
            Some("short_term") => TimeRange::ShortTerm,
            Some("long_term") => TimeRange::LongTerm,
            _ => TimeRange::MediumTerm,
        }
    }

    /// Converts rspotify artist to our domain model
    fn convert_artist(artist: &rspotify::model::FullArtist) -> SpotifyArtist {
        SpotifyArtist {
            id: artist.id.to_string(),
            name: artist.name.clone(),
            genres: artist.genres.clone(),
            popularity: artist.popularity,
            followers: artist.followers.total,
            images: artist.images.iter().map(|img| img.url.clone()).collect(),
            external_url: artist.external_urls.get("spotify").cloned(),
        }
    }

    /// Gets the user's top tracks with optional time range and limit
    #[instrument(skip_all, fields(limit, time_range))]
    pub async fn get_top_tracks(
        state: &SpotifyState,
        limit: Option<u32>,
        time_range: Option<String>,
    ) -> Result<Vec<SpotifyTrack>, AppError> {
        let spotify = state.get_client()?;
        let final_limit = limit.unwrap_or(20).min(50);
        let range = Self::parse_time_range(time_range.as_deref());

        let tracks = spotify
            .current_user_top_tracks_manual(Some(range), Some(final_limit), None)
            .await
            .map_err(|e| SpotifyError::GetTopTracks(format!("Failed to get top tracks: {}", e)))?;

        let result: Vec<SpotifyTrack> = tracks
            .items
            .iter()
            .map(Self::convert_spotify_track)
            .collect();

        Ok(result)
    }

    /// Streams all liked songs progressively using Tauri events
    /// Recommended for large libraries (>1000 songs)
    #[instrument(skip_all)]
    pub async fn stream_all_liked_songs(
        state: &SpotifyState,
        window: &Window,
    ) -> Result<(), AppError> {
        use rspotify::model::Market;

        let spotify = state.get_client()?;
        let total_tracks = Self::get_total_tracks(&spotify).await?;

        Self::emit_start_event(window, total_tracks)?;

        let mut offset = 0;
        let mut total_sent = 0;
        let mut retries = 0;

        loop {
            match Self::fetch_tracks_batch(&spotify, offset).await {
                Ok(saved) => {
                    let batch_size = saved.items.len();
                    let tracks: Vec<SpotifyTrack> = saved
                        .items
                        .iter()
                        .map(|item| Self::convert_spotify_track(&item.track))
                        .collect();

                    total_sent += batch_size as u32;
                    let progress = Self::calculate_progress(total_sent, total_tracks);

                    Self::emit_batch_event(window, &tracks, progress, total_sent, total_tracks)?;

                    if batch_size < SPOTIFY_BATCH_SIZE as usize {
                        break;
                    }

                    offset += SPOTIFY_BATCH_SIZE;
                    retries = 0;
                }
                Err(e) => {
                    retries += 1;
                    if retries >= MAX_RETRY_ATTEMPTS {
                        Self::emit_error_event(window, MAX_RETRY_ATTEMPTS)?;
                        return Err(SpotifyError::GetSavedTracks(format!(
                            "Error after {} attempts: {}",
                            MAX_RETRY_ATTEMPTS, e
                        ))
                        .into());
                    }
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }

        Self::emit_complete_event(window, total_sent)?;
        Ok(())
    }

    /// Gets total number of saved tracks
    async fn get_total_tracks(spotify: &AuthCodeSpotify) -> Result<u32, AppError> {
        use rspotify::model::Market;

        let first_batch = spotify
            .current_user_saved_tracks_manual(None::<Market>, Some(1), Some(0))
            .await
            .map_err(|e| {
                SpotifyError::GetSavedTracks(format!("Error getting initial info: {}", e))
            })?;

        Ok(first_batch.total as u32)
    }

    /// Fetches a batch of tracks
    async fn fetch_tracks_batch(
        spotify: &AuthCodeSpotify,
        offset: u32,
    ) -> Result<rspotify::model::Page<rspotify::model::SavedTrack>, AppError> {
        use rspotify::model::Market;

        spotify
            .current_user_saved_tracks_manual(
                None::<Market>,
                Some(SPOTIFY_BATCH_SIZE),
                Some(offset),
            )
            .await
            .map_err(|e| {
                SpotifyError::GetSavedTracks(format!("Failed to get tracks: {}", e)).into()
            })
    }

    /// Calculates progress percentage
    fn calculate_progress(total_sent: u32, total_tracks: u32) -> u32 {
        if total_tracks > 0 {
            (total_sent as f32 / total_tracks as f32 * 100.0) as u32
        } else {
            100
        }
    }

    /// Emits start event
    fn emit_start_event(window: &Window, total: u32) -> Result<(), AppError> {
        window
            .emit(
                "spotify-tracks-start",
                serde_json::json!({ "total": total }),
            )
            .map_err(|e| AppError::Unknown(format!("Error emitting start event: {}", e)))
    }

    /// Emits batch event
    fn emit_batch_event(
        window: &Window,
        tracks: &[SpotifyTrack],
        progress: u32,
        loaded: u32,
        total: u32,
    ) -> Result<(), AppError> {
        window
            .emit(
                "spotify-tracks-batch",
                serde_json::json!({
                    "tracks": tracks,
                    "progress": progress,
                    "loaded": loaded,
                    "total": total
                }),
            )
            .map_err(|e| AppError::Unknown(format!("Error emitting batch event: {}", e)))
    }

    /// Emits error event
    fn emit_error_event(window: &Window, retries: u32) -> Result<(), AppError> {
        let _ = window.emit(
            "spotify-tracks-error",
            serde_json::json!({
                "message": format!("Error después de {} intentos", retries)
            }),
        );
        Ok(())
    }

    /// Emits completion event
    fn emit_complete_event(window: &Window, total: u32) -> Result<(), AppError> {
        window
            .emit(
                "spotify-tracks-complete",
                serde_json::json!({ "total": total }),
            )
            .map_err(|e| AppError::Unknown(format!("Error emitting complete event: {}", e)))
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
