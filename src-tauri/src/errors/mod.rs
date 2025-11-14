//! Centralized error handling for the application
//! 
//! This module provides typed errors using `thiserror` for better error handling
//! and propagation throughout the application.

use thiserror::Error;

/// Main application error type
/// 
/// All errors in the application should be converted to this type for consistent
/// error handling and frontend communication.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("File system error: {0}")]
    File(#[from] FileError),
    
    #[error("Spotify API error: {0}")]
    Spotify(#[from] SpotifyError),
    
    #[error("Download error: {0}")]
    Download(#[from] DownloadError),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Concurrency error: {0}")]
    Concurrency(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

/// File system related errors
#[derive(Debug, Error)]
pub enum FileError {
    #[error("Path does not exist: {0}")]
    NotFound(String),
    
    #[error("Path traversal attempt detected: {0}")]
    PathTraversal(String),
    
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    
    #[error("Not a directory: {0}")]
    NotDirectory(String),
    
    #[error("Not a file: {0}")]
    NotFile(String),
    
    #[error("Unsupported file format: {0}")]
    UnsupportedFormat(String),
    
    #[error("Failed to read metadata: {0}")]
    MetadataRead(String),
    
    #[error("Failed to canonicalize path: {0}")]
    Canonicalize(String),
    
    #[error("Scan limit exceeded: max {0} files")]
    ScanLimitExceeded(usize),
    
    #[error("Scan depth exceeded: max {0} levels")]
    ScanDepthExceeded(usize),
}

/// Spotify API related errors
#[derive(Debug, Error)]
pub enum SpotifyError {
    #[error("Not authenticated. Please authenticate first.")]
    NotAuthenticated,
    
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    
    #[error("Failed to get user profile: {0}")]
    GetProfile(String),
    
    #[error("Failed to get playlists: {0}")]
    GetPlaylists(String),
    
    #[error("Failed to get saved tracks: {0}")]
    GetSavedTracks(String),
    
    #[error("Failed to get top artists: {0}")]
    GetTopArtists(String),
    
    #[error("Failed to get top tracks: {0}")]
    GetTopTracks(String),
    
    #[error("OAuth timeout after {0} seconds")]
    OAuthTimeout(u64),
    
    #[error("OAuth server error: {0}")]
    OAuthServer(String),
    
    #[error("Invalid authorization code")]
    InvalidAuthCode,
    
    #[error("Failed to exchange token: {0}")]
    TokenExchange(String),
    
    #[error("Credentials not found in environment")]
    CredentialsNotFound,
    
    #[error("Concurrency error accessing Spotify client: {0}")]
    ClientLock(String),
}

/// Download related errors
#[derive(Debug, Error)]
pub enum DownloadError {
    #[error("spotdl is not installed. Install with: pip install spotdl yt-dlp")]
    SpotdlNotInstalled,
    
    #[error("Invalid Spotify URL: {0}")]
    InvalidUrl(String),
    
    #[error("Invalid output format: {0}")]
    InvalidFormat(String),
    
    #[error("Download timeout after {0} seconds")]
    Timeout(u64),
    
    #[error("Download failed: {0}")]
    Failed(String),
    
    #[error("YouTube download error. Update yt-dlp: pip install --upgrade yt-dlp spotdl")]
    YouTubeError,
    
    #[error("Too many songs requested: max {0}")]
    TooManySongs(usize),
    
    #[error("Output directory does not exist: {0}")]
    OutputDirNotFound(String),
}

/// Type alias for API responses
/// 
/// This is the standard return type for all Tauri commands.
/// Errors are automatically converted to user-friendly strings for the frontend.
pub type ApiResponse<T> = Result<T, String>;

impl AppError {
    /// Converts the error to a user-friendly string for the frontend
    pub fn to_user_message(&self) -> String {
        match self {
            AppError::File(e) => e.to_string(),
            AppError::Spotify(e) => e.to_string(),
            AppError::Download(e) => e.to_string(),
            AppError::Validation(msg) => msg.clone(),
            AppError::Concurrency(msg) => format!("Error de concurrencia: {}", msg),
            AppError::Io(e) => format!("Error de entrada/salida: {}", e),
            AppError::Unknown(msg) => format!("Error desconocido: {}", msg),
        }
    }
}

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_user_message()
    }
}

