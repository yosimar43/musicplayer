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

        Ok(MusicFile {
            path: file_path.to_string(),
            title: tag.title().map(ToString::to_string),
            artist: tag.artist().map(ToString::to_string),
            album: tag.album_title().map(ToString::to_string),
            duration: tag.duration().map(|d| d as u32),
            year: tag.year(),
            genre: tag.genre().map(ToString::to_string),
        })
    }

    /// Creates fallback metadata when tag extraction fails
    fn create_fallback_metadata(path: &Path, file_path: &str) -> Result<MusicFile, AppError> {
        let file_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();

        Ok(MusicFile::new(file_path.to_string(), Some(file_name)))
    }
}
