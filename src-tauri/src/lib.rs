use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use walkdir::WalkDir;

mod rspotify_auth;

#[derive(Debug, Serialize, Deserialize)]
pub struct MusicFile {
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<u32>,
    year: Option<i32>,
    genre: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn scan_music_folder(folder_path: String) -> Result<Vec<MusicFile>, String> {
    let mut music_files = Vec::new();
    let audio_extensions = ["mp3", "m4a", "flac", "wav", "ogg", "aac", "wma"];

    for entry in WalkDir::new(&folder_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if audio_extensions.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str()) {
                if let Ok(metadata) = get_audio_metadata(path.to_str().unwrap_or("").to_string()) {
                    music_files.push(metadata);
                }
            }
        }
    }

    Ok(music_files)
}

#[tauri::command]
fn get_audio_metadata(file_path: String) -> Result<MusicFile, String> {
    match audiotags::Tag::new().read_from_path(&file_path) {
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
        Err(_) => {
            // If metadata reading fails, return basic file info
            let file_name = PathBuf::from(&file_path)
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

#[tauri::command]
fn get_default_music_folder() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(user_profile) = std::env::var_os("USERPROFILE") {
            let music_path = PathBuf::from(user_profile).join("Music");
            if music_path.exists() {
                return Ok(music_path.to_string_lossy().to_string());
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() {
                return Ok(music_path.to_string_lossy().to_string());
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let music_path = PathBuf::from(home).join("Music");
            if music_path.exists() {
                return Ok(music_path.to_string_lossy().to_string());
            }
        }
    }
    
    Err("Could not find default music folder".to_string())
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
            greet,
            scan_music_folder,
            get_audio_metadata,
            get_default_music_folder,
            // Comandos de Spotify (solo para obtener DATOS, no reproducción)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

