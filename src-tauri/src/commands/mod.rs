//! Tauri command handlers
//! 
//! This module contains all Tauri command handlers that act as thin controllers.
//! They delegate business logic to services and convert errors to user-friendly strings.

pub mod file;
pub mod spotify;
pub mod download;

pub use file::*;
pub use spotify::*;
pub use download::*;

