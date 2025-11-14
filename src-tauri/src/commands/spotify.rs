//! Spotify command handlers

use tauri::{State, AppHandle, Window};
use crate::domain::spotify::{SpotifyUserProfile, SpotifyPlaylist, SpotifyTrack, SpotifyArtist};
use crate::errors::ApiResponse;
use crate::services::spotify::{SpotifyService, SpotifyState};

/// Initializes and authenticates with Spotify using Authorization Code Flow
#[tauri::command]
pub async fn spotify_authenticate(
    state: State<'_, SpotifyState>,
    app: AppHandle,
) -> ApiResponse<String> {
    SpotifyService::authenticate(&state, &app)
        .await
        .map_err(|e| e.to_user_message())
}

/// Gets the authenticated user's profile information
#[tauri::command]
pub async fn spotify_get_profile(
    state: State<'_, SpotifyState>,
) -> ApiResponse<SpotifyUserProfile> {
    SpotifyService::get_profile(&state)
        .await
        .map_err(|e| e.to_user_message())
}

/// Gets the user's playlists with optional limit
#[tauri::command]
pub async fn spotify_get_playlists(
    state: State<'_, SpotifyState>,
    limit: Option<u32>,
) -> ApiResponse<Vec<SpotifyPlaylist>> {
    SpotifyService::get_playlists(&state, limit)
        .await
        .map_err(|e| e.to_user_message())
}

/// Gets the user's saved tracks with pagination support
#[tauri::command]
pub async fn spotify_get_saved_tracks(
    state: State<'_, SpotifyState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> ApiResponse<Vec<SpotifyTrack>> {
    SpotifyService::get_saved_tracks(&state, limit, offset)
        .await
        .map_err(|e| e.to_user_message())
}

/// Gets the user's top artists based on listening history
#[tauri::command]
pub async fn spotify_get_top_artists(
    state: State<'_, SpotifyState>,
    limit: Option<u32>,
    time_range: Option<String>,
) -> ApiResponse<Vec<SpotifyArtist>> {
    SpotifyService::get_top_artists(&state, limit, time_range)
        .await
        .map_err(|e| e.to_user_message())
}

/// Gets the user's top tracks with optional time range and limit
#[tauri::command]
pub async fn spotify_get_top_tracks(
    state: State<'_, SpotifyState>,
    limit: Option<u32>,
    time_range: Option<String>,
) -> ApiResponse<Vec<SpotifyTrack>> {
    SpotifyService::get_top_tracks(&state, limit, time_range)
        .await
        .map_err(|e| e.to_user_message())
}

/// Transmits saved songs progressively using Tauri events
/// Recommended for large libraries (>1000 songs)
#[tauri::command]
pub async fn spotify_stream_all_liked_songs(
    state: State<'_, SpotifyState>,
    window: Window,
) -> ApiResponse<()> {
    SpotifyService::stream_all_liked_songs(&state, &window)
        .await
        .map_err(|e| e.to_user_message())
}

/// Closes the Spotify session and cleans up resources
#[tauri::command]
pub fn spotify_logout(state: State<'_, SpotifyState>) -> ApiResponse<()> {
    state.clear()
        .map_err(|e| e.to_user_message())
}

/// Verifies if there's an active Spotify session
#[tauri::command]
pub fn spotify_is_authenticated(state: State<'_, SpotifyState>) -> bool {
    state.is_authenticated()
}

