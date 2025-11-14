//! Path manipulation and validation utilities

use std::path::{Path, PathBuf};
use crate::errors::{AppError, FileError};

/// Validates that a file path is safe and exists
/// 
/// Prevents path traversal attacks and ensures the path is accessible.
/// Returns a canonicalized path if valid.
pub fn validate_path(path: &str) -> Result<PathBuf, AppError> {
    let path_buf = PathBuf::from(path);

    // Check if path exists
    if !path_buf.exists() {
        return Err(FileError::NotFound(path.to_string()).into());
    }

    // Prevent path traversal attacks
    if path.contains("..") {
        return Err(FileError::PathTraversal(path.to_string()).into());
    }

    // Canonicalize path to prevent symlink attacks
    path_buf.canonicalize()
        .map_err(|e| FileError::Canonicalize(format!("{}: {}", path, e)).into())
}

/// Validates that a path is a directory
pub fn validate_directory(path: &str) -> Result<PathBuf, AppError> {
    let validated = validate_path(path)?;
    
    if !validated.is_dir() {
        return Err(FileError::NotDirectory(path.to_string()).into());
    }
    
    Ok(validated)
}

/// Validates that a path is a file
pub fn validate_file(path: &str) -> Result<PathBuf, AppError> {
    let validated = validate_path(path)?;
    
    if !validated.is_file() {
        return Err(FileError::NotFile(path.to_string()).into());
    }
    
    Ok(validated)
}

/// Validates and sanitizes an output path to prevent path traversal attacks
pub fn validate_output_path(path: &str) -> Result<PathBuf, AppError> {
    if path.contains("..") {
        return Err(FileError::PathTraversal(path.to_string()).into());
    }

    let path_buf = PathBuf::from(path);

    // Verify that the parent directory exists
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            return Err(FileError::NotFound(format!("Output directory: {}", parent.display())).into());
        }
    }

    Ok(path_buf)
}

/// Gets the default music folder path for the current operating system
pub fn get_default_music_folder() -> Result<String, AppError> {
    #[cfg(target_os = "windows")]
    {
        if let Some(user_profile) = std::env::var_os("USERPROFILE") {
            let music_path = PathBuf::from(user_profile).join("Music");
            if music_path.exists() && music_path.is_dir() {
                return music_path.to_str()
                    .ok_or_else(|| FileError::InvalidPath("Cannot convert path to string".to_string()))
                    .map(|s| s.to_string())
                    .map_err(AppError::from);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() && music_path.is_dir() {
                return music_path.to_str()
                    .ok_or_else(|| FileError::InvalidPath("Cannot convert path to string".to_string()))
                    .map(|s| s.to_string())
                    .map_err(AppError::from);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            // Try XDG_MUSIC_DIR first
            if let Some(xdg_music) = std::env::var_os("XDG_MUSIC_DIR") {
                let music_path = PathBuf::from(xdg_music);
                if music_path.exists() && music_path.is_dir() {
                    return music_path.to_str()
                        .ok_or_else(|| FileError::InvalidPath("Cannot convert path to string".to_string()))
                        .map(|s| s.to_string())
                        .map_err(AppError::from);
                }
            }

            // Fallback to ~/Music
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() && music_path.is_dir() {
                return music_path.to_str()
                    .ok_or_else(|| FileError::InvalidPath("Cannot convert path to string".to_string()))
                    .map(|s| s.to_string())
                    .map_err(AppError::from);
            }
        }
    }

    Err(FileError::NotFound("Default music folder not found".to_string()).into())
}

/// Checks if a file has a valid audio extension
pub fn is_audio_file(path: &Path) -> bool {
    use crate::domain::music::AUDIO_EXTENSIONS;
    
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

