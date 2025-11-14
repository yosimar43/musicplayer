//! File system command handlers

use crate::domain::music::MusicFile;
use crate::errors::ApiResponse;
use crate::services::FileService;
use crate::utils::get_default_music_folder;

/// Scans a music folder for audio files and extracts their metadata
#[tauri::command]
pub fn scan_music_folder(folder_path: String) -> ApiResponse<Vec<MusicFile>> {
    FileService::scan_music_folder(&folder_path)
        .map_err(|e| e.to_user_message())
}

/// Extracts audio metadata from a file
#[tauri::command]
pub fn get_audio_metadata(file_path: String) -> ApiResponse<MusicFile> {
    FileService::get_audio_metadata(&file_path)
        .map_err(|e| e.to_user_message())
}

/// Gets the default music folder path for the current operating system
#[tauri::command]
pub fn get_default_music_folder_cmd() -> ApiResponse<String> {
    tracing::info!("📁 Getting default music folder");
    get_default_music_folder()
        .map_err(|e| e.to_user_message())
}

