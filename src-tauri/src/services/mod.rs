//! Business logic services
//! 
//! This module contains services that encapsulate business logic
//! and coordinate between domain models and external APIs.

pub mod file;
pub mod spotify;
pub mod download;

pub use file::FileService;
pub use spotify::SpotifyState;
pub use download::DownloadService;

