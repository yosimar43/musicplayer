use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use walkdir::WalkDir;

mod rspotify_auth;
mod download_commands;

// Type aliases for consistent API responses
/// Standard API response type for all Tauri commands
pub type ApiResponse<T> = Result<T, String>;

// Constantes
const AUDIO_EXTENSIONS: &[&str] = &["mp3", "m4a", "flac", "wav", "ogg", "aac", "wma"];
const MAX_SCAN_DEPTH: usize = 10;
const MAX_FILES_PER_SCAN: usize = 10000;

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
}

/// Validates that a file path is safe and exists
/// Prevents path traversal attacks and ensures the path is accessible
fn validate_path(path: &str) -> ApiResponse<PathBuf> {
    let path_buf = PathBuf::from(path);

    // Check if path exists
    if !path_buf.exists() {
        tracing::warn!("📁 Path does not exist: {}", path);
        return Err(format!("La ruta no existe: {}", path));
    }

    // Prevent path traversal attacks
    if path.contains("..") {
        tracing::warn!("📁 Path traversal attempt detected: {}", path);
        return Err("Ruta inválida: contiene '..'".to_string());
    }

    // Canonicalize path to prevent symlink attacks
    match path_buf.canonicalize() {
        Ok(canonical) => Ok(canonical),
        Err(e) => {
            tracing::error!("📁 Failed to canonicalize path {}: {}", path, e);
            Err(format!("Error al validar ruta: {}", e))
        }
    }
}

/// Scans a music folder for audio files and extracts their metadata
/// Limited to MAX_FILES_PER_SCAN files and MAX_SCAN_DEPTH directory levels for security
/// Returns a vector of MusicFile structs with extracted metadata
#[tauri::command]
fn scan_music_folder(folder_path: String) -> ApiResponse<Vec<MusicFile>> {
    tracing::info!("📁 Starting music folder scan: {}", folder_path);

    // Validate the input path
    let validated_path = validate_path(&folder_path)?;

    if !validated_path.is_dir() {
        tracing::warn!("📁 Path is not a directory: {}", folder_path);
        return Err("La ruta proporcionada no es un directorio".to_string());
    }

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
            break;
        }

        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
                if let Some(path_str) = path.to_str() {
                    match get_audio_metadata(path_str.to_string()) {
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
    }

    tracing::info!("📁 Scan completed: found {} audio files", music_files.len());
    Ok(music_files)
}

/// Extracts audio metadata from a file using the audiotags crate
/// Returns a MusicFile struct with all available metadata fields
#[tauri::command]
fn get_audio_metadata(file_path: String) -> ApiResponse<MusicFile> {
    tracing::debug!("📁 Extracting metadata from: {}", file_path);

    // Validate that the file exists and is safe
    let validated_path = validate_path(&file_path)?;

    if !validated_path.is_file() {
        tracing::warn!("📁 Path is not a file: {}", file_path);
        return Err("La ruta no es un archivo".to_string());
    }

    // Verify it's a valid audio file extension
    let ext = validated_path.extension()
        .and_then(|e| e.to_str())
        .ok_or_else(|| {
            tracing::warn!("📁 File has no extension: {}", file_path);
            "Archivo sin extensión".to_string()
        })?;

    if !AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
        tracing::warn!("📁 Unsupported file format: {}", ext);
        return Err(format!("Formato de archivo no soportado: {}", ext));
    }

    match audiotags::Tag::new().read_from_path(&validated_path) {
        Ok(tag) => {
            let metadata = MusicFile {
                path: file_path.clone(),
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

            Ok(MusicFile {
                path: file_path,
                title: Some(file_name),
                artist: None,
                album: None,
                duration: None,
                year: None,
                genre: None,
            })
        }
    }
}

/// Gets the default music folder path for the current operating system
/// Returns the standard music directory (~/Music on Unix, %USERPROFILE%/Music on Windows)
#[tauri::command]
fn get_default_music_folder() -> ApiResponse<String> {
    tracing::info!("📁 Getting default music folder");

    #[cfg(target_os = "windows")]
    {
        if let Some(user_profile) = std::env::var_os("USERPROFILE") {
            let music_path = PathBuf::from(user_profile).join("Music");
            if music_path.exists() && music_path.is_dir() {
                let path_str = music_path.to_str()
                    .ok_or_else(|| "Ruta inválida".to_string())?;
                tracing::info!("📁 Found Windows music folder: {}", path_str);
                return Ok(path_str.to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() && music_path.is_dir() {
                let path_str = music_path.to_str()
                    .ok_or_else(|| "Ruta inválida".to_string())?;
                tracing::info!("📁 Found macOS music folder: {}", path_str);
                return Ok(path_str.to_string());
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
                    let path_str = music_path.to_str()
                        .ok_or_else(|| "Ruta inválida".to_string())?;
                    tracing::info!("📁 Found XDG music folder: {}", path_str);
                    return Ok(path_str.to_string());
                }
            }

            // Fallback to ~/Music
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() && music_path.is_dir() {
                let path_str = music_path.to_str()
                    .ok_or_else(|| "Ruta inválida".to_string())?;
                tracing::info!("📁 Found Linux music folder: {}", path_str);
                return Ok(path_str.to_string());
            }
        }
    }

    tracing::warn!("📁 No default music folder found");
    Err("No se pudo encontrar la carpeta de música predeterminada".to_string())
}

/// Initializes and runs the Tauri application with all plugins and command handlers
/// Sets up the Spotify state management and registers all Tauri commands
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing::info!("🚀 Starting Music Player application");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .manage(rspotify_auth::RSpotifyState::default())
        .invoke_handler(tauri::generate_handler![
            // Comandos de sistema de archivos
            scan_music_folder,
            get_audio_metadata,
            get_default_music_folder,
            // Comandos de Spotify (solo lectura de datos, sin reproducción)
            rspotify_auth::spotify_authenticate,
            rspotify_auth::spotify_get_profile,
            rspotify_auth::spotify_get_playlists,
            // ❌ Removido: spotify_get_current_playback (control de reproducción)
            rspotify_auth::spotify_get_saved_tracks,
            rspotify_auth::spotify_get_all_liked_songs,
            rspotify_auth::spotify_stream_all_liked_songs,
            rspotify_auth::spotify_get_top_artists,
            rspotify_auth::spotify_get_top_tracks,
            rspotify_auth::spotify_logout,
            rspotify_auth::spotify_is_authenticated,
            // Comandos de descarga con spotdl
            download_commands::download_spotify_tracks_segmented,
            download_commands::download_single_spotify_track,
            download_commands::check_spotdl_installed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

