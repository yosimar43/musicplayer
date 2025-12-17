//! Last.fm domain types
#![allow(dead_code)]

use crate::domain::music::MusicFile;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedTrackInfo {
    pub name: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<u32>,
    pub playcount: Option<u64>,
    pub listeners: Option<u64>,
    pub tags: Vec<String>,
    pub wiki: Option<String>,
    pub url: String,
    pub image: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedArtistInfo {
    pub name: String,
    pub image: Option<String>,
    pub bio: String,
    pub bio_full: String,
    pub tags: Vec<String>,
    pub listeners: u64,
    pub playcount: u64,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedAlbumInfo {
    pub name: String,
    pub artist: String,
    pub image: Option<String>,
    pub summary: String,
    pub tags: Vec<String>,
    pub listeners: u64,
    pub playcount: u64,
    pub url: String,
    pub track_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrichedTrack {
    pub original: MusicFile,
    pub enriched: Option<ProcessedTrackInfo>,
    pub album_art_url: Option<String>,
}

// Internal Last.fm API types for deserialization
#[derive(Debug, Deserialize)]
pub struct LastFmImage {
    #[serde(rename = "#text")]
    pub text: String,
    pub size: String,
}

#[derive(Debug, Deserialize)]
pub struct LastFmTag {
    pub name: String,
    pub url: String,
}

pub mod raw {
    use super::*;

    #[derive(Debug, Deserialize)]
    pub struct TrackResponse {
        pub track: TrackInfo,
    }

    #[derive(Debug, Deserialize)]
    pub struct TrackInfo {
        pub name: String,
        pub duration: Option<String>,
        pub listeners: Option<String>,
        pub playcount: Option<String>,
        pub artist: ArtistShort,
        pub album: Option<AlbumShort>,
        pub toptags: Option<TopTags>,
        pub wiki: Option<Wiki>,
        pub url: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct ArtistResponse {
        pub artist: ArtistInfo,
    }

    #[derive(Debug, Deserialize)]
    pub struct ArtistInfo {
        pub name: String,
        pub image: Option<Vec<LastFmImage>>,
        pub bio: Option<Bio>,
        pub tags: Option<Tags>,
        pub stats: Option<Stats>,
        pub url: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct AlbumResponse {
        pub album: AlbumInfo,
    }

    #[derive(Debug, Deserialize)]
    pub struct AlbumInfo {
        pub name: String,
        pub artist: String,
        pub image: Option<Vec<LastFmImage>>,
        pub wiki: Option<Wiki>,
        pub tags: Option<Tags>,
        pub listeners: Option<String>,
        pub playcount: Option<String>,
        pub url: String,
        pub tracks: Option<TracksWrapper>,
    }

    #[derive(Debug, Deserialize)]
    pub struct ArtistShort {
        pub name: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct AlbumShort {
        pub title: String,
        pub image: Option<Vec<LastFmImage>>,
    }

    #[derive(Debug, Deserialize)]
    pub struct TopTags {
        pub tag: Vec<LastFmTag>,
    }

    #[derive(Debug, Deserialize)]
    pub struct Tags {
        pub tag: Vec<LastFmTag>,
    }

    #[derive(Debug, Deserialize)]
    pub struct Wiki {
        pub summary: String,
        pub content: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct Bio {
        pub summary: String,
        pub content: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct Stats {
        pub listeners: String,
        pub playcount: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct TracksWrapper {
        pub track: Vec<TrackShort>,
    }

    #[derive(Debug, Deserialize)]
    pub struct TrackShort {
        pub name: String,
    }
}
