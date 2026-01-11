//! Validation utilities for user input and external data

use crate::domain::music::AUDIO_EXTENSIONS;
use crate::errors::{AppError, DownloadError, FileError};

/// Validates that a URL is a proper Spotify track URL
pub fn validate_spotify_url(url: &str) -> Result<(), AppError> {
    if !url.starts_with("https://open.spotify.com/track/") {
        return Err(DownloadError::InvalidUrl(url.to_string()).into());
    }
    Ok(())
}

/// Validates an audio file extension
///
/// Currently unused but available for future validation needs
#[allow(dead_code)]
pub fn validate_audio_extension(ext: &str) -> Result<(), AppError> {
    if !AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
        return Err(FileError::UnsupportedFormat(ext.to_string()).into());
    }
    Ok(())
}

/// Validates download format
pub fn validate_download_format(format: &str) -> Result<(), AppError> {
    let valid_formats = ["mp3", "flac", "ogg", "m4a", "opus"];
    if !valid_formats.contains(&format) {
        return Err(DownloadError::InvalidFormat(format!(
            "Use one of: {}",
            valid_formats.join(", ")
        ))
        .into());
    }
    Ok(())
}



/// Extracts the song ID from a Spotify URL
pub fn extract_song_id(url: &str) -> String {
    url.split('/')
        .last()
        .and_then(|s| s.split('?').next())
        .unwrap_or("unknown")
        .to_string()
}
