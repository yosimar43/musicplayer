//! File system service for scanning and reading music files

use std::path::Path;
use tauri::{AppHandle, Emitter};
use tracing::instrument;
use walkdir::WalkDir;

use crate::domain::music::{MusicFile, MAX_FILES_PER_SCAN, MAX_SCAN_DEPTH};
use crate::errors::{AppError, FileError};
use crate::utils::{is_audio_file, validate_directory, validate_file};

/// Service for file system operations
pub struct FileService;

impl FileService {
    /// Scans a music folder for audio files and extracts their metadata
    ///
    /// Limited to MAX_FILES_PER_SCAN files and MAX_SCAN_DEPTH directory levels for security.
    #[instrument(skip_all, fields(folder_path = %folder_path))]
    pub fn scan_music_folder(
        folder_path: &str,
        app_handle: Option<&AppHandle>,
    ) -> Result<Vec<MusicFile>, AppError> {
        let validated_path = validate_directory(folder_path)?;

        // Emit scan start event
        if let Some(app) = app_handle {
            let _ = app.emit(
                "library-scan-start",
                serde_json::json!({ "path": folder_path }),
            );
        }

        let mut music_files = Vec::with_capacity(MAX_FILES_PER_SCAN.min(1000));
        let mut file_count = 0;

        for entry in WalkDir::new(&validated_path)
            .follow_links(false) // Security: don't follow symlinks
            .max_depth(MAX_SCAN_DEPTH)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            // Limit number of files processed
            if file_count >= MAX_FILES_PER_SCAN {
                tracing::warn!("📁 Reached maximum file limit: {}", MAX_FILES_PER_SCAN);
                return Err(FileError::ScanLimitExceeded(MAX_FILES_PER_SCAN).into());
            }

            let path = entry.path();
            if is_audio_file(path) {
                if let Some(path_str) = path.to_str() {
                    if let Ok(metadata) = Self::get_audio_metadata(path_str) {
                        music_files.push(metadata);
                        file_count += 1;

                        // Emit progress every 50 files
                        if file_count % 50 == 0 {
                            if let Some(app) = app_handle {
                                let _ = app.emit(
                                    "library-scan-progress",
                                    serde_json::json!({
                                        "current": file_count,
                                        "path": path_str
                                    }),
                                );
                            }
                        }
                    }
                }
            }
        }

        // Emit completion event
        if let Some(app) = app_handle {
            let _ = app.emit(
                "library-scan-complete",
                serde_json::json!({ "total": music_files.len() }),
            );
        }

        tracing::info!("📁 Scan completed: found {} audio files", music_files.len());
        Ok(music_files)
    }

    /// Extracts audio metadata from a file using the audiotags crate
    #[instrument(skip_all, fields(file_path = %file_path))]
    pub fn get_audio_metadata(file_path: &str) -> Result<MusicFile, AppError> {
        let validated_path = validate_file(file_path)?;

        // Verify it's a valid audio file extension
        if !is_audio_file(&validated_path) {
            let ext = validated_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("unknown");
            return Err(FileError::UnsupportedFormat(ext.to_string()).into());
        }

        Self::extract_metadata_from_tag(&validated_path, file_path)
            .or_else(|_| Self::create_fallback_metadata(&validated_path, file_path))
    }

    /// Extracts metadata from audio tag
    fn extract_metadata_from_tag(path: &Path, file_path: &str) -> Result<MusicFile, AppError> {
        let tag = audiotags::Tag::new().read_from_path(path).map_err(|e| {
            tracing::debug!("📁 Failed to read tag for {}: {}", file_path, e);
            FileError::MetadataRead(e.to_string())
        })?;

        // Extract album art if available
        let album_art = Self::extract_album_art(&tag);

        // Get title from tag, fallback to filename if empty or None
        let title = tag
            .title()
            .filter(|t| !t.trim().is_empty())
            .map(ToString::to_string)
            .or_else(|| {
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .map(|s| Self::clean_filename_for_title(s))
            });

        // Get artist from tag, try to parse from filename if not available
        let artist = tag
            .artist()
            .filter(|a| !a.trim().is_empty())
            .map(ToString::to_string)
            .or_else(|| Self::extract_artist_from_filename(path));

        Ok(MusicFile {
            path: file_path.to_string(),
            title,
            artist,
            album: tag.album_title().map(ToString::to_string),
            duration: tag.duration().map(|d| d as u32),
            year: tag.year(),
            genre: tag.genre().map(ToString::to_string),
            album_art,
        })
    }

    /// Cleans a filename to use as title (removes common patterns)
    fn clean_filename_for_title(filename: &str) -> String {
        let cleaned = filename
            // Remove track numbers at start like "01 - ", "01. ", "1 - "
            .trim_start_matches(|c: char| c.is_ascii_digit())
            .trim_start_matches(['-', '.', '_', ' '])
            .trim();
        
        if cleaned.is_empty() {
            filename.to_string()
        } else {
            cleaned.to_string()
        }
    }

    /// Tries to extract artist from filename patterns like "Artist - Title"
    fn extract_artist_from_filename(path: &Path) -> Option<String> {
        let filename = path.file_stem()?.to_str()?;
        
        // Try common patterns: "Artist - Title", "Artist – Title"
        for separator in [" - ", " – ", " _ "] {
            if let Some(idx) = filename.find(separator) {
                let artist = filename[..idx].trim();
                // Skip if it looks like a track number
                if !artist.chars().all(|c| c.is_ascii_digit()) && !artist.is_empty() {
                    return Some(artist.to_string());
                }
            }
        }
        
        None
    }

    /// Extracts album art from audio tag and converts to base64 data URL
    fn extract_album_art(tag: &Box<dyn audiotags::AudioTag + Send + Sync>) -> Option<String> {
        // Try to get album cover
        if let Some(picture) = tag.album_cover() {
            // Convert image data to base64 data URL
            let mime_type = match picture.mime_type {
                audiotags::MimeType::Jpeg => "image/jpeg",
                audiotags::MimeType::Png => "image/png",
                audiotags::MimeType::Bmp => "image/bmp",
                audiotags::MimeType::Gif => "image/gif",
                _ => "image/jpeg", // fallback
            };

            use base64::Engine;
            let base64_data = base64::engine::general_purpose::STANDARD.encode(&picture.data);
            Some(format!("data:{};base64,{}", mime_type, base64_data))
        } else {
            None
        }
    }

    /// Creates fallback metadata when tag extraction fails
    fn create_fallback_metadata(path: &Path, file_path: &str) -> Result<MusicFile, AppError> {
        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| Self::clean_filename_for_title(s));

        let artist = Self::extract_artist_from_filename(path);

        Ok(MusicFile {
            path: file_path.to_string(),
            title,
            artist,
            album: None,
            duration: None,
            year: None,
            genre: None,
            album_art: None,
        })
    }
}
