//! Music Player Library
//! 
//! Main library module that sets up the Tauri application with all plugins,
//! command handlers, and state management.

mod commands;
mod domain;
mod errors;
mod services;
mod utils;

// Re-export commonly used types
pub use errors::ApiResponse;
pub use services::SpotifyState;

use commands::{
    // File commands
    scan_music_folder,
    get_audio_metadata,
    get_default_music_folder_cmd,
    // Spotify commands
    spotify_authenticate,
    spotify_get_profile,
    spotify_get_playlists,
    spotify_get_saved_tracks,
    spotify_get_top_artists,
    spotify_get_top_tracks,
    spotify_stream_all_liked_songs,
    spotify_logout,
    spotify_is_authenticated,
    // Download commands
    download_spotify_tracks_segmented,
    download_single_spotify_track,
    check_spotdl_installed,
};

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
        .manage(SpotifyState::default())
        .invoke_handler(tauri::generate_handler![
            // File system commands
            scan_music_folder,
            get_audio_metadata,
            get_default_music_folder_cmd,
            // Spotify commands (read-only data, no playback)
            spotify_authenticate,
            spotify_get_profile,
            spotify_get_playlists,
            spotify_get_saved_tracks,
            spotify_get_top_artists,
            spotify_get_top_tracks,
            spotify_stream_all_liked_songs,
            spotify_logout,
            spotify_is_authenticated,
            // Download commands with spotdl
            download_spotify_tracks_segmented,
            download_single_spotify_track,
            check_spotdl_installed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
