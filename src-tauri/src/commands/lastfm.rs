//! Last.fm API command handlers

use crate::domain::lastfm::{
    EnrichedTrack, ProcessedAlbumInfo, ProcessedArtistInfo, ProcessedTrackInfo,
};
use crate::domain::music::MusicFile;
use crate::errors::ApiResponse;
use crate::services::lastfm::LastFmService;

use tauri::State;

// Note: In a real app we'd likely put LastFmService in a State container.
// Assuming we'll register it in main.rs and pass it here.
// For now, I'll assume we have a way to access it, likely via `State<LastFmService>`.

#[tauri::command]
pub async fn lastfm_get_track_info(
    service: State<'_, LastFmService>,
    artist: String,
    track: String,
) -> ApiResponse<ProcessedTrackInfo> {
    service
        .get_track_info(&artist, &track)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lastfm_get_artist_info(
    service: State<'_, LastFmService>,
    artist: String,
) -> ApiResponse<ProcessedArtistInfo> {
    service
        .get_artist_info(&artist)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lastfm_get_album_info(
    service: State<'_, LastFmService>,
    artist: String,
    album: String,
) -> ApiResponse<ProcessedAlbumInfo> {
    service
        .get_album_info(&artist, &album)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn enrich_tracks_batch(
    service: State<'_, LastFmService>,
    tracks: Vec<MusicFile>,
) -> ApiResponse<Vec<EnrichedTrack>> {
    service
        .enrich_tracks_batch(tracks)
        .await
        .map_err(|e| e.to_string())
}
