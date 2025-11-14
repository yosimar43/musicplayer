//! Spotify domain models

use serde::{Deserialize, Serialize};

/// Spotify user profile information
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

/// Spotify playlist information
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

/// Spotify track information
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

/// Spotify artist information
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

/// Spotify API configuration constants
pub const SPOTIFY_BATCH_SIZE: u32 = 50;
pub const MAX_RETRY_ATTEMPTS: u32 = 3;
pub const OAUTH_CALLBACK_TIMEOUT_SECS: u64 = 120; // 2 minutes
pub const OAUTH_SERVER_ADDR: &str = "127.0.0.1:8888";

