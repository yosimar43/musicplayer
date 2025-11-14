//! File system service for scanning and reading music files

use walkdir::WalkDir;
use crate::domain::music::{MusicFile, MAX_SCAN_DEPTH, MAX_FILES_PER_SCAN};
use crate::errors::{AppError, FileError};
use crate::utils::{validate_directory, validate_file, is_audio_file};

/// Service for file system operations
pub struct FileService;

impl FileService {
    /// Scans a music folder for audio files and extracts their metadata
    /// 
    /// Limited to MAX_FILES_PER_SCAN files and MAX_SCAN_DEPTH directory levels for security.
    pub fn scan_music_folder(folder_path: &str) -> Result<Vec<MusicFile>, AppError> {
        tracing::info!("📁 Starting music folder scan: {}", folder_path);

        let validated_path = validate_directory(folder_path)?;

        let mut music_files = Vec::new();
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
                    match Self::get_audio_metadata(path_str) {
                        Ok(metadata) => {
                            music_files.push(metadata);
                            file_count += 1;
                        }
                        Err(e) => {
                            tracing::debug!("📁 Error reading metadata for {}: {}", path_str, e);
                        }
                    }
                }
            }
        }

        tracing::info!("📁 Scan completed: found {} audio files", music_files.len());
        Ok(music_files)
    }

    /// Extracts audio metadata from a file using the audiotags crate
    pub fn get_audio_metadata(file_path: &str) -> Result<MusicFile, AppError> {
        tracing::debug!("📁 Extracting metadata from: {}", file_path);

        let validated_path = validate_file(file_path)?;

        // Verify it's a valid audio file extension
        let ext = validated_path
            .extension()
            .and_then(|e| e.to_str())
            .ok_or_else(|| FileError::UnsupportedFormat("File has no extension".to_string()))?;

        if !is_audio_file(&validated_path) {
            return Err(FileError::UnsupportedFormat(ext.to_string()).into());
        }

        match audiotags::Tag::new().read_from_path(&validated_path) {
            Ok(tag) => {
                let metadata = MusicFile {
                    path: file_path.to_string(),
                    title: tag.title().map(|s| s.to_string()),
                    artist: tag.artist().map(|s| s.to_string()),
                    album: tag.album_title().map(|s| s.to_string()),
                    duration: tag.duration().map(|d| d as u32),
                    year: tag.year(),
                    genre: tag.genre().map(|s| s.to_string()),
                };
                tracing::debug!("📁 Successfully extracted metadata for: {}", file_path);
                Ok(metadata)
            }
            Err(e) => {
                tracing::debug!("📁 Failed to read metadata for {}: {}", file_path, e);

                // Return basic info if metadata extraction fails
                let file_name = validated_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Unknown")
                    .to_string();

                Ok(MusicFile::new(file_path.to_string(), Some(file_name)))
            }
        }
    }
}

