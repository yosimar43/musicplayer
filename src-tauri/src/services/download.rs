//! Download service for Spotify tracks using spotdl
//!
//! Handles downloading tracks with controlled concurrency, progress reporting,
//! and comprehensive error handling.

use futures::stream::{FuturesUnordered, StreamExt};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
#[cfg(windows)]
use tokio::time::{timeout, Duration};
use tracing::instrument;

use crate::errors::{AppError, DownloadError};
use crate::utils::{
    extract_song_id, validate_download_format, validate_output_path,
    validate_spotify_url,
};

/// Download configuration constants
const SPOTDL_TIMEOUT_SECS: u64 = 120;
const MAX_CONCURRENT_DOWNLOADS: usize = 4;
const BATCH_SIZE: usize = 12;

/// Download progress event payload
#[derive(Serialize, Clone)]
pub struct DownloadProgress {
    /// Song name or identifier
    pub song: String,
    /// Current index in the download queue
    pub index: usize,
    /// Total number of songs to download
    pub total: usize,
    /// Current download status message
    pub status: String,
    /// Spotify URL being downloaded
    pub url: String,
}

/// Download completion event
#[derive(Serialize, Clone)]
pub struct DownloadFinished {
    /// Final status message
    pub message: String,
    /// Number of successfully downloaded songs
    pub total_downloaded: usize,
    /// Number of failed downloads
    pub total_failed: usize,
}

/// Download error event (currently unused but available for future use)
#[allow(dead_code)]
#[derive(Serialize, Clone)]
pub struct DownloadErrorEvent {
    /// Error message describing what went wrong
    pub message: String,
}

/// Service for downloading Spotify tracks
pub struct DownloadService;

impl DownloadService {
    /// Checks if spotdl is installed and returns its version
    #[instrument(skip_all)]
    pub async fn check_installed() -> Result<String, AppError> {
        const CHECK_TIMEOUT_SECS: u64 = 5;

        let mut cmd = Command::new("spotdl");
        cmd.arg("--version");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        let result = timeout(
            Duration::from_secs(CHECK_TIMEOUT_SECS),
            cmd.output(),
        )
        .await;

        match result {
            Ok(Ok(output)) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout);
                let version_str = version.trim().to_string();
                tracing::info!("✅ spotdl found: {}", version_str);
                Ok(version_str)
            }
            Ok(Ok(_)) => {
                tracing::error!("❌ spotdl does not respond correctly");
                Err(DownloadError::SpotdlNotInstalled.into())
            }
            Ok(Err(_)) => {
                tracing::error!("❌ spotdl is not installed");
                Err(DownloadError::SpotdlNotInstalled.into())
            }
            Err(_) => {
                tracing::error!("❌ Timeout checking spotdl");
                Err(DownloadError::Timeout(CHECK_TIMEOUT_SECS).into())
            }
        }
    }

    /// Downloads a batch of Spotify tracks with progress reporting
    async fn download_batch_with_progress(
        urls: Vec<String>,
        output_template: String,
        format: String,
        output_dir: Option<String>,
        start_index: usize,
        total: usize,
        app_handle: AppHandle,
    ) -> Result<(), AppError> {
        let mut cmd = Command::new("spotdl");
        cmd.arg("download");

        for url in &urls {
            cmd.arg(url);
        }

        // Output
        if let Some(ref dir) = output_dir {
            if !output_template.is_empty() {
                cmd.arg("--output").arg(format!("{}/{}", dir, output_template));
            } else {
                cmd.arg("--output").arg(dir);
            }
        }

        cmd.arg("--format").arg(&format);
        cmd.arg("--audio").arg("youtube-music").arg("youtube");
        cmd.arg("--threads").arg("4"); // 🔥 acelera sin bajar calidad
        cmd.arg("--print-errors");

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000);
        }

        let result = timeout(
            Duration::from_secs(SPOTDL_TIMEOUT_SECS),
            cmd.output()
        ).await;

        match result {
            Ok(Ok(output)) if output.status.success() => {
                // Emitir progreso por canción
                for (i, url) in urls.iter().enumerate() {
                    let song = extract_song_id(url);
                    let _ = app_handle.emit("download-progress", DownloadProgress {
                        song,
                        index: start_index + i,
                        total,
                        status: "✅ Descargada".into(),
                        url: url.clone(),
                    });
                }
                Ok(())
            }
            _ => {
                for (i, url) in urls.iter().enumerate() {
                    let song = extract_song_id(url);
                    let _ = app_handle.emit("download-progress", DownloadProgress {
                        song,
                        index: start_index + i,
                        total,
                        status: "❌ Error en descarga".into(),
                        url: url.clone(),
                    });
                }
                Err(DownloadError::Failed("Error descargando batch".to_string()).into())
            }
        }
    }

    /// Downloads multiple Spotify tracks in batches using spotdl with real concurrency
    #[instrument(skip_all, fields(url_count = urls.len()))]
    pub async fn download_tracks_segmented(
        urls: Vec<String>,
        _segment_size: usize, // ya no importa
        _delay: u64,          // eliminado
        output_template: String,
        format: String,
        output_dir: Option<String>,
        app_handle: &AppHandle,
    ) -> Result<(), AppError> {
        tracing::info!("📥 Starting batched download of {} tracks", urls.len());

        // Input validations
        if urls.is_empty() {
            tracing::warn!("📥 Empty URL list provided");
            return Err(DownloadError::Failed("Lista de URLs vacía".to_string()).into());
        }

        // Validate format
        validate_download_format(&format)?;

        // Validate all URLs
        for url in &urls {
            validate_spotify_url(url)?;
        }

        // Validate output directory if provided
        if let Some(ref dir) = output_dir {
            validate_output_path(dir)?;
        }

        // Check if spotdl is installed
        Self::check_installed().await?;

        let total = urls.len();
        let mut downloaded = 0;
        let mut failed = 0;

        tracing::info!("📥 Downloading {} songs in batches of {} (max concurrent: {})",
            total, BATCH_SIZE, MAX_CONCURRENT_DOWNLOADS);

        let batches: Vec<Vec<String>> = urls
            .chunks(BATCH_SIZE)
            .map(|c| c.to_vec())
            .collect();

        let mut tasks = FuturesUnordered::new();

        for (batch_idx, batch) in batches.into_iter().enumerate() {
            let app = app_handle.clone();
            let out = output_template.clone();
            let fmt = format.clone();
            let dir = output_dir.clone();

            let start_index = batch_idx * BATCH_SIZE + 1;

            let task = tokio::spawn(async move {
                Self::download_batch_with_progress(
                    batch,
                    out,
                    fmt,
                    dir,
                    start_index,
                    total,
                    app,
                ).await
            });

            tasks.push(task);

            if tasks.len() >= MAX_CONCURRENT_DOWNLOADS {
                if let Some(res) = tasks.next().await {
                    match res {
                        Ok(Ok(_)) => downloaded += BATCH_SIZE,
                        _ => failed += BATCH_SIZE,
                    }
                }
            }
        }

        while let Some(res) = tasks.next().await {
            match res {
                Ok(Ok(_)) => downloaded += BATCH_SIZE,
                _ => failed += BATCH_SIZE,
            }
        }

        let _ = app_handle.emit("download-finished", DownloadFinished {
            message: "✅ Descarga completada".into(),
            total_downloaded: downloaded.min(total),
            total_failed: failed.min(total),
        });

        tracing::info!("📥 Download completed: {} downloaded, {} failed", downloaded.min(total), failed.min(total));
        Ok(())
    }

    /// Downloads a single Spotify track with comprehensive validation and error handling
    #[instrument(skip_all, fields(url = %url, format = %format))]
    pub async fn download_single_track(
        url: String,
        output_template: String,
        format: String,
        output_dir: Option<String>,
        app_handle: &AppHandle,
    ) -> Result<String, AppError> {
        validate_spotify_url(&url)?;
        validate_download_format(&format)?;

        if let Some(ref dir) = output_dir {
            validate_output_path(dir)?;
        }

        let song_name = extract_song_id(&url);
        let full_output_path = Self::build_output_path(&output_template, output_dir.as_deref());

        let mut cmd = Self::build_spotdl_command(&url, &format, full_output_path.as_deref());
        let result = timeout(Duration::from_secs(SPOTDL_TIMEOUT_SECS), cmd.output()).await;

        Self::handle_download_result(result, &song_name, &url, app_handle).await
    }

    /// Builds the output path from template and directory
    fn build_output_path(output_template: &str, output_dir: Option<&str>) -> Option<String> {
        match (output_dir, output_template.is_empty()) {
            (Some(dir), false) => Some(format!("{}/{}", dir, output_template)),
            (Some(dir), true) => Some(dir.to_string()),
            (None, false) => Some(output_template.to_string()),
            (None, true) => None,
        }
    }

    /// Builds the spotdl command with all necessary arguments
    fn build_spotdl_command(url: &str, format: &str, output_path: Option<&str>) -> Command {
        let mut cmd = Command::new("spotdl");
        cmd.arg("download").arg(url);

        if let Some(path) = output_path {
            cmd.arg("--output").arg(path);
        }

        cmd.arg("--format").arg(format);
        cmd.arg("--audio").arg("youtube-music").arg("youtube");
        cmd.arg("--threads").arg("4"); // 🔥 acelera sin bajar calidad
        cmd.arg("--print-errors");

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000);
        }

        cmd
    }

    /// Processes the download command output and returns status message
    fn process_download_output(
        result: Result<Result<std::process::Output, std::io::Error>, tokio::time::error::Elapsed>,
        song_name: &str,
    ) -> Result<String, AppError> {
        tracing::debug!("🔍 Procesando resultado de descarga para: {}", song_name);
        
        match result {
            Ok(Ok(output)) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                
                tracing::debug!("📥 STDOUT para {}: {}", song_name, stdout);
                if !stderr.is_empty() {
                    tracing::debug!("📥 STDERR para {}: {}", song_name, stderr);
                }
                
                if stdout.contains("AudioProviderError") || stdout.contains("YT-DLP download error")
                {
                    tracing::warn!("📥 YouTube error for {}: Update yt-dlp", song_name);
                    return Err(DownloadError::YouTubeError.into());
                }
                tracing::info!("📥 Successfully downloaded: {}", song_name);
                Ok("✅ Descargada".to_string())
            }
            Ok(Ok(output)) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                
                tracing::warn!("📥 Comando falló para {} - Código: {}", song_name, output.status);
                tracing::debug!("📥 STDOUT error: {}", stdout);
                tracing::debug!("📥 STDERR error: {}", stderr);
                
                let error_msg = stderr
                    .lines()
                    .next()
                    .unwrap_or("Error desconocido")
                    .chars()
                    .take(100)
                    .collect::<String>();
                tracing::error!("📥 Download failed for {}: {}", song_name, error_msg);
                Ok(format!("❌ {}", error_msg))
            }
            Ok(Err(e)) => {
                tracing::error!("📥 Command execution error for {}: {}", song_name, e);
                Ok(format!("⚠️ Error: {}", e))
            }
            Err(_) => {
                tracing::error!(
                    "📥 Timeout downloading {}: >{}s",
                    song_name,
                    SPOTDL_TIMEOUT_SECS
                );
                Ok("⏱️ Timeout (>5min)".to_string())
            }
        }
    }

    /// Handles download result for single track download
    async fn handle_download_result(
        result: Result<Result<std::process::Output, std::io::Error>, tokio::time::error::Elapsed>,
        song_name: &str,
        url: &str,
        app_handle: &AppHandle,
    ) -> Result<String, AppError> {
        match Self::process_download_output(result, song_name) {
            Ok(status) => {
                let _ = app_handle.emit(
                    "download-progress",
                    DownloadProgress {
                        song: song_name.to_string(),
                        index: 1,
                        total: 1,
                        status: status.clone(),
                        url: url.to_string(),
                    },
                );

                if status.starts_with("✅") {
                    Ok(format!("✅ {} descargada correctamente", song_name))
                } else {
                    Err(DownloadError::Failed(status).into())
                }
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "download-progress",
                    DownloadProgress {
                        song: song_name.to_string(),
                        index: 1,
                        total: 1,
                        status: "⚠️ Error de YouTube".to_string(),
                        url: url.to_string(),
                    },
                );
                Err(e)
            }
        }
    }
}
