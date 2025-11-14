//! Download command handlers

use tauri::AppHandle;
use crate::errors::ApiResponse;
use crate::services::DownloadService;

/// Downloads multiple Spotify tracks in segments using spotdl with controlled concurrency
#[tauri::command]
pub async fn download_spotify_tracks_segmented(
    urls: Vec<String>,
    segment_size: usize,
    delay: u64,
    output_template: String,
    format: String,
    output_dir: Option<String>,
    app_handle: AppHandle,
) -> ApiResponse<()> {
    DownloadService::download_tracks_segmented(
        urls,
        segment_size,
        delay,
        output_template,
        format,
        output_dir,
        &app_handle,
    )
        .await
        .map_err(|e| e.to_user_message())
}

/// Downloads a single Spotify track with comprehensive validation and error handling
#[tauri::command]
pub async fn download_single_spotify_track(
    url: String,
    output_template: String,
    format: String,
    output_dir: Option<String>,
    app_handle: AppHandle,
) -> ApiResponse<String> {
    DownloadService::download_single_track(
        url,
        output_template,
        format,
        output_dir,
        &app_handle,
    )
        .await
        .map_err(|e| e.to_user_message())
}

/// Checks if spotdl is installed and returns its version
#[tauri::command]
pub async fn check_spotdl_installed() -> ApiResponse<String> {
    DownloadService::check_installed()
        .await
        .map_err(|e| e.to_user_message())
}

