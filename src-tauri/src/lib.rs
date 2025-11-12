use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use walkdir::WalkDir;

mod rspotify_auth;
mod download_commands;

// Constantes
const AUDIO_EXTENSIONS: &[&str] = &["mp3", "m4a", "flac", "wav", "ogg", "aac", "wma"];
const MAX_SCAN_DEPTH: usize = 10;
const MAX_FILES_PER_SCAN: usize = 10000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MusicFile {
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<u32>,
    year: Option<i32>,
    genre: Option<String>,
}

/// Valida que una ruta sea segura y exista
fn validate_path(path: &str) -> Result<PathBuf, String> {
    let path_buf = PathBuf::from(path);
    
    // Verificar que la ruta existe
    if !path_buf.exists() {
        return Err(format!("La ruta no existe: {}", path));
    }
    
    // Verificar que no contiene componentes peligrosos
    if path.contains("..") {
        return Err("Ruta inválida: contiene '..'".to_string());
    }
    
    // Canonicalizar la ruta para prevenir path traversal
    path_buf.canonicalize()
        .map_err(|e| format!("Error al validar ruta: {}", e))
}

/// Escanea una carpeta en busca de archivos de audio
/// Limitado a MAX_FILES_PER_SCAN archivos y MAX_SCAN_DEPTH niveles de profundidad
#[tauri::command]
fn scan_music_folder(folder_path: String) -> Result<Vec<MusicFile>, String> {
    // Validar la ruta de entrada
    let validated_path = validate_path(&folder_path)?;
    
    if !validated_path.is_dir() {
        return Err("La ruta proporcionada no es un directorio".to_string());
    }
    
    let mut music_files = Vec::new();
    let mut file_count = 0;

    for entry in WalkDir::new(&validated_path)
        .follow_links(false) // Cambio de seguridad: no seguir symlinks
        .max_depth(MAX_SCAN_DEPTH)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        // Limitar número de archivos procesados
        if file_count >= MAX_FILES_PER_SCAN {
            #[cfg(debug_assertions)]
            eprintln!("⚠️ Límite de {} archivos alcanzado", MAX_FILES_PER_SCAN);
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
                            #[cfg(debug_assertions)]
                            eprintln!("⚠️ Error leyendo metadata de {}: {}", path_str, e);
                        }
                    }
                }
            }
        }
    }

    Ok(music_files)
}

/// Extrae metadata de un archivo de audio
#[tauri::command]
fn get_audio_metadata(file_path: String) -> Result<MusicFile, String> {
    // Validar que el archivo existe y es seguro
    let validated_path = validate_path(&file_path)?;
    
    if !validated_path.is_file() {
        return Err("La ruta no es un archivo".to_string());
    }
    
    // Verificar que es un archivo de audio válido
    let ext = validated_path.extension()
        .and_then(|e| e.to_str())
        .ok_or("Archivo sin extensión")?;
    
    if !AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
        return Err(format!("Formato de archivo no soportado: {}", ext));
    }
    
    match audiotags::Tag::new().read_from_path(&validated_path) {
        Ok(tag) => {
            Ok(MusicFile {
                path: file_path.clone(),
                title: tag.title().map(|s| s.to_string()),
                artist: tag.artist().map(|s| s.to_string()),
                album: tag.album_title().map(|s| s.to_string()),
                duration: tag.duration().map(|d| d as u32),
                year: tag.year(),
                genre: tag.genre().map(|s| s.to_string()),
            })
        }
        Err(e) => {
            #[cfg(debug_assertions)]
            eprintln!("⚠️ Error leyendo tags de {}: {}", file_path, e);
            
            // Si falla la lectura de metadata, retornar info básica
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

/// Obtiene la carpeta de música predeterminada del sistema
#[tauri::command]
fn get_default_music_folder() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(user_profile) = std::env::var_os("USERPROFILE") {
            let music_path = PathBuf::from(user_profile).join("Music");
            if music_path.exists() && music_path.is_dir() {
                return music_path.to_str()
                    .ok_or_else(|| "Ruta inválida".to_string())
                    .map(|s| s.to_string());
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() && music_path.is_dir() {
                return music_path.to_str()
                    .ok_or_else(|| "Ruta inválida".to_string())
                    .map(|s| s.to_string());
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            // Intentar primero XDG_MUSIC_DIR
            if let Some(xdg_music) = std::env::var_os("XDG_MUSIC_DIR") {
                let music_path = PathBuf::from(xdg_music);
                if music_path.exists() && music_path.is_dir() {
                    return music_path.to_str()
                        .ok_or_else(|| "Ruta inválida".to_string())
                        .map(|s| s.to_string());
                }
            }
            
            // Fallback a ~/Music
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() && music_path.is_dir() {
                return music_path.to_str()
                    .ok_or_else(|| "Ruta inválida".to_string())
                    .map(|s| s.to_string());
            }
        }
    }
    
    Err("No se pudo encontrar la carpeta de música predeterminada".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

