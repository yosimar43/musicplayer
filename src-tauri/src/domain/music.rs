//! Music file domain models

use serde::{Deserialize, Serialize};

/// Represents a local music file with extracted metadata
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MusicFile {
    /// Absolute path to the audio file
    pub path: String,
    /// Song title extracted from metadata
    pub title: Option<String>,
    /// Artist name from metadata
    pub artist: Option<String>,
    /// Album name from metadata
    pub album: Option<String>,
    /// Duration in seconds
    pub duration: Option<u32>,
    /// Release year
    pub year: Option<i32>,
    /// Music genre
    pub genre: Option<String>,
    /// Base64 encoded album art image
    pub album_art: Option<String>,
}

impl MusicFile {
    /// Creates a new MusicFile with minimal information
    pub fn new(path: String, title: Option<String>) -> Self {
        Self {
            path,
            title,
            artist: None,
            album: None,
            duration: None,
            year: None,
            genre: None,
            album_art: None,
        }
    }
}

/// Supported audio file extensions
pub const AUDIO_EXTENSIONS: &[&str] = &["mp3", "m4a", "flac", "wav", "ogg", "aac", "wma"];

/// Maximum depth for directory scanning (security limit)
pub const MAX_SCAN_DEPTH: usize = 10;

/// Maximum number of files to process in a single scan (security limit)
pub const MAX_FILES_PER_SCAN: usize = 10000;
