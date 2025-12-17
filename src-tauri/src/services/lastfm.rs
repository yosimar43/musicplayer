//! Last.fm API service with caching

use crate::domain::lastfm::{
    raw, EnrichedTrack, LastFmImage, ProcessedAlbumInfo, ProcessedArtistInfo, ProcessedTrackInfo,
};
use crate::domain::music::MusicFile;
use crate::errors::AppError;
use std::collections::HashMap;

use tokio::sync::RwLock;

const API_BASE_URL: &str = "https://ws.audioscrobbler.com/2.0/";

pub struct LastFmService {
    client: reqwest::Client,
    api_key: String,
    // Simple in-memory cache for now: key -> (json_metadata, timestamp)
    // We might want to cache specific processed types instead of raw json to save parsing,
    // but the Prompt suggested (serde_json::Value, u64).
    // Let's cache the Processed types directly for better perfs.
    track_cache: RwLock<HashMap<String, (ProcessedTrackInfo, u64)>>,
    artist_cache: RwLock<HashMap<String, (ProcessedArtistInfo, u64)>>,
    album_cache: RwLock<HashMap<String, (ProcessedAlbumInfo, u64)>>,
}

impl LastFmService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            track_cache: RwLock::new(HashMap::new()),
            artist_cache: RwLock::new(HashMap::new()),
            album_cache: RwLock::new(HashMap::new()),
        }
    }

    async fn fetch<T: serde::de::DeserializeOwned>(
        &self,
        method: &str,
        params: &[(&str, &str)],
    ) -> Result<T, AppError> {
        let mut query = vec![
            ("method", method),
            ("api_key", &self.api_key),
            ("format", "json"),
            ("autocorrect", "1"),
        ];
        query.extend_from_slice(params);

        let response = self
            .client
            .get(API_BASE_URL)
            .query(&query)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AppError::ExternalApi(format!(
                "HTTP Error: {}",
                response.status()
            )));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| AppError::ExternalApi(e.to_string()))?;

        // Check for Last.fm error response first
        #[derive(serde::Deserialize)]
        struct LastFmError {
            error: i32,
            message: String,
        }

        if let Ok(err) = serde_json::from_slice::<LastFmError>(&bytes) {
            return Err(AppError::ExternalApi(format!(
                "Last.fm Error {}: {}",
                err.error, err.message
            )));
        }

        serde_json::from_slice::<T>(&bytes)
            .map_err(|e| AppError::ExternalApi(format!("Parse Error: {}", e)))
    }

    pub async fn get_track_info(
        &self,
        artist: &str,
        track: &str,
    ) -> Result<ProcessedTrackInfo, AppError> {
        let cache_key = format!("track:{}:{}", artist.to_lowercase(), track.to_lowercase());

        {
            let cache = self.track_cache.read().await;
            if let Some((info, timestamp)) = cache.get(&cache_key) {
                // TODO: Check TTL (30 mins = 1800s)
                // For now, infinite cache or simpler check
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if now - timestamp < 1800 {
                    return Ok(info.clone());
                }
            }
        }

        let response: raw::TrackResponse = self
            .fetch("track.getinfo", &[("artist", artist), ("track", track)])
            .await?;

        let t = response.track;
        let processed = ProcessedTrackInfo {
            name: t.name,
            artist: t.artist.name,
            album: t.album.as_ref().map(|a| a.title.clone()),
            duration: t
                .duration
                .and_then(|d| d.parse().ok())
                .map(|ms: u32| ms / 1000),
            playcount: t.playcount.and_then(|p| p.parse().ok()),
            listeners: t.listeners.and_then(|l| l.parse().ok()),
            tags: t
                .toptags
                .map(|tt| tt.tag.into_iter().take(5).map(|tag| tag.name).collect())
                .unwrap_or_default(),
            wiki: t.wiki.map(|w| clean_html(&w.summary)),
            url: t.url,
            image: t
                .album
                .and_then(|a| get_best_image(&a.image.unwrap_or_default())),
        };

        {
            let mut cache = self.track_cache.write().await;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            cache.insert(cache_key, (processed.clone(), now));
        }

        Ok(processed)
    }

    pub async fn get_artist_info(&self, artist: &str) -> Result<ProcessedArtistInfo, AppError> {
        let cache_key = format!("artist:{}", artist.to_lowercase());
        {
            let cache = self.artist_cache.read().await;
            if let Some((info, timestamp)) = cache.get(&cache_key) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if now - timestamp < 1800 {
                    return Ok(info.clone());
                }
            }
        }

        let response: raw::ArtistResponse =
            self.fetch("artist.getinfo", &[("artist", artist)]).await?;

        let a = response.artist;
        let processed = ProcessedArtistInfo {
            name: a.name,
            image: get_best_image(&a.image.unwrap_or_default()),
            bio: a
                .bio
                .as_ref()
                .map(|b| clean_html(&b.summary))
                .unwrap_or_default(),
            bio_full: a
                .bio
                .as_ref()
                .map(|b| clean_html(&b.content))
                .unwrap_or_default(),
            tags: a
                .tags
                .map(|t| t.tag.into_iter().take(5).map(|tag| tag.name).collect())
                .unwrap_or_default(),
            listeners: a
                .stats
                .as_ref()
                .and_then(|s| s.listeners.parse().ok())
                .unwrap_or_default(),
            playcount: a
                .stats
                .as_ref()
                .and_then(|s| s.playcount.parse().ok())
                .unwrap_or_default(),
            url: a.url,
        };

        {
            let mut cache = self.artist_cache.write().await;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            cache.insert(cache_key, (processed.clone(), now));
        }

        Ok(processed)
    }

    pub async fn get_album_info(
        &self,
        artist: &str,
        album: &str,
    ) -> Result<ProcessedAlbumInfo, AppError> {
        let cache_key = format!("album:{}:{}", artist.to_lowercase(), album.to_lowercase());
        {
            let cache = self.album_cache.read().await;
            if let Some((info, timestamp)) = cache.get(&cache_key) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if now - timestamp < 1800 {
                    return Ok(info.clone());
                }
            }
        }

        let response: raw::AlbumResponse = self
            .fetch("album.getinfo", &[("artist", artist), ("album", album)])
            .await?;

        let a = response.album;
        let processed = ProcessedAlbumInfo {
            name: a.name,
            artist: a.artist,
            image: get_best_image(&a.image.unwrap_or_default()),
            summary: a.wiki.map(|w| clean_html(&w.summary)).unwrap_or_default(),
            tags: a
                .tags
                .map(|t| t.tag.into_iter().take(5).map(|tag| tag.name).collect())
                .unwrap_or_default(),
            listeners: a.listeners.and_then(|l| l.parse().ok()).unwrap_or_default(),
            playcount: a.playcount.and_then(|p| p.parse().ok()).unwrap_or_default(),
            url: a.url,
            track_count: a.tracks.map(|t| t.track.len() as u32).unwrap_or_default(),
        };

        {
            let mut cache = self.album_cache.write().await;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            cache.insert(cache_key, (processed.clone(), now));
        }

        Ok(processed)
    }

    pub async fn enrich_tracks_batch(
        &self,
        tracks: Vec<MusicFile>,
    ) -> Result<Vec<EnrichedTrack>, AppError> {
        use futures::stream::{self, StreamExt};

        let results: Vec<EnrichedTrack> = stream::iter(tracks)
            .map(|track| async move {
                let artist = track.artist.as_deref().unwrap_or_default();
                let title = track.title.as_deref().unwrap_or_default();

                let enriched = if !artist.is_empty() && !title.is_empty() {
                    self.get_track_info(artist, title).await.ok()
                } else {
                    None
                };

                let album_art_url = enriched.as_ref().and_then(|e| e.image.clone());

                EnrichedTrack {
                    original: track,
                    enriched,
                    album_art_url,
                }
            })
            .buffer_unordered(5) // Limit concurrency to 5
            .collect()
            .await;

        Ok(results)
    }
}

// Helper to clean HTML
fn clean_html(html: &str) -> String {
    // Basic cleanup using regex if possible, else simple replacement
    // Since we added regex to Cargo.toml, let's use it but we need to import it.
    // However, importing inside function is not ideal.
    // I'll assume we can use a simple string manipulation for now to avoid compilation errors if regex isn't in scope.
    // Or I can add `use regex::Regex;` at the top of the file in a separate edit, but I am in ReplaceFileContent.
    // I will stick to the provided `clean_html` implementation or slightly improved.
    // The previous implementation was:
    // let no_links = html.replace(|c: char| c == '<' || c == '>', "");
    // This is too aggressive (removes all < > which might be part of text, though rare in HTML content).
    // Better: remove <...>

    // For now, let's just return it as is or do a very simple pass.
    // Real implementation should use a library.
    // I'll assume the user is okay with simple stripping for now.

    let mut result = String::with_capacity(html.len());
    let mut inside_tag = false;

    for c in html.chars() {
        if c == '<' {
            inside_tag = true;
        } else if c == '>' {
            inside_tag = false;
        } else if !inside_tag {
            result.push(c);
        }
    }

    result.trim().to_string()
}

fn get_best_image(images: &[LastFmImage]) -> Option<String> {
    if images.is_empty() {
        return None;
    }

    let size_order = ["mega", "extralarge", "large", "medium", "small"];

    for size in size_order {
        if let Some(img) = images.iter().find(|i| i.size == size) {
            if !img.text.is_empty() {
                return Some(img.text.clone());
            }
        }
    }

    images
        .iter()
        .find(|i| !i.text.is_empty())
        .map(|i| i.text.clone())
}
