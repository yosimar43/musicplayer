//! Download service for Spotify tracks using spotdl
//! 
//! Handles downloading tracks with controlled concurrency, progress reporting,
//! and comprehensive error handling.

use futures::stream::{FuturesUnordered, StreamExt};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use tokio::time::{sleep, Duration, timeout};

use crate::errors::{AppError, DownloadError};
use crate::utils::{validate_spotify_url, validate_download_format, validate_batch_size, validate_output_path, extract_song_id};

/// Download configuration constants
const MIN_DELAY_SECS: u64 = 2;
const MAX_DELAY_SECS: u64 = 10;
const SPOTDL_TIMEOUT_SECS: u64 = 300; // 5 minutes per song
const MAX_SONGS_PER_BATCH: usize = 100;
const MAX_CONCURRENT_DOWNLOADS: usize = 3;

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

/// Download segment completion event
#[derive(Serialize, Clone)]
pub struct DownloadSegmentFinished {
    /// Segment number that completed
    pub segment: usize,
    /// Completion message
    pub message: String,
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
    pub async fn check_installed() -> Result<String, AppError> {
        tracing::debug!("📥 Checking if spotdl is installed");

        let result = tokio::time::timeout(
            Duration::from_secs(5),
            Command::new("spotdl").arg("--version").output()
        ).await;

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
                Err(DownloadError::Timeout(5).into())
            }
        }
    }

    /// Downloads multiple Spotify tracks in segments using spotdl with controlled concurrency
    pub async fn download_tracks_segmented(
        urls: Vec<String>,
        segment_size: usize,
        delay: u64,
        output_template: String,
        format: String,
        output_dir: Option<String>,
        app_handle: &AppHandle,
    ) -> Result<(), AppError> {
        tracing::info!("📥 Starting segmented download of {} tracks", urls.len());

        // Input validations
        if urls.is_empty() {
            return Err(DownloadError::Failed("Empty URL list".to_string()).into());
        }

        validate_batch_size(urls.len(), MAX_SONGS_PER_BATCH)?;

        let final_segment_size = segment_size.max(1).min(50);
        let final_delay = delay.clamp(MIN_DELAY_SECS, MAX_DELAY_SECS);

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
        let mut total_downloaded = 0;
        let mut total_failed = 0;

        tracing::info!("📥 Downloading {} songs (segments: {}, delay: {}s, max concurrent: {})",
            total, final_segment_size, final_delay, MAX_CONCURRENT_DOWNLOADS);

        for (segment_idx, chunk) in urls.chunks(final_segment_size).enumerate() {
            tracing::debug!("📥 Processing segment {} with {} tracks", segment_idx + 1, chunk.len());

            // Create a FuturesUnordered for concurrent downloads in this segment
            let mut download_tasks = FuturesUnordered::new();

            for (idx_in_chunk, url) in chunk.iter().enumerate() {
                let global_idx = segment_idx * final_segment_size + idx_in_chunk + 1;
                let url_clone = url.clone();
                let output_template_clone = output_template.clone();
                let format_clone = format.clone();
                let output_dir_clone = output_dir.clone();
                let app_handle_clone = app_handle.clone();

                // Create a download task
                let download_task = tokio::spawn(async move {
                    Self::download_single_track_with_progress(
                        url_clone,
                        output_template_clone,
                        format_clone,
                        output_dir_clone,
                        global_idx,
                        total,
                        app_handle_clone,
                    ).await
                });

                download_tasks.push(download_task);

                // Limit concurrent downloads
                if download_tasks.len() >= MAX_CONCURRENT_DOWNLOADS {
                    // Wait for at least one download to complete
                    if let Some(result) = download_tasks.next().await {
                        match result {
                            Ok(Ok(_)) => total_downloaded += 1,
                            Ok(Err(_)) => total_failed += 1,
                            Err(e) => {
                                tracing::error!("📥 Task join error: {}", e);
                                total_failed += 1;
                            }
                        }
                    }
                }
            }

            // Wait for remaining downloads in this segment
            while let Some(result) = download_tasks.next().await {
                match result {
                    Ok(Ok(_)) => total_downloaded += 1,
                    Ok(Err(_)) => total_failed += 1,
                    Err(e) => {
                        tracing::error!("📥 Task join error: {}", e);
                        total_failed += 1;
                    }
                }
            }

            // Emit segment completion
            let _ = app_handle.emit("download-segment-finished", DownloadSegmentFinished {
                segment: segment_idx + 1,
                message: format!("✅ Segmento {} completado", segment_idx + 1),
            });

            // Delay between segments (except for the last one)
            if segment_idx < urls.chunks(final_segment_size).count() - 1 {
                tracing::debug!("📥 Waiting {}s before next segment", final_delay);
                sleep(Duration::from_secs(final_delay)).await;
            }
        }

        // Emit final completion
        let _ = app_handle.emit("download-finished", DownloadFinished {
            message: "✅ Descarga completada".to_string(),
            total_downloaded,
            total_failed,
        });

        tracing::info!("📥 Download completed: {} downloaded, {} failed", total_downloaded, total_failed);
        Ok(())
    }

    /// Downloads a single Spotify track with comprehensive validation and error handling
    pub async fn download_single_track(
        url: String,
        output_template: String,
        format: String,
        output_dir: Option<String>,
        app_handle: &AppHandle,
    ) -> Result<String, AppError> {
        tracing::info!("📥 Starting single track download: {}", extract_song_id(&url));

        // Validate URL
        validate_spotify_url(&url)?;

        // Validate format
        validate_download_format(&format)?;

        // Validate output directory
        if let Some(ref dir) = output_dir {
            validate_output_path(dir)?;
        }

        let song_name = extract_song_id(&url);

        // Build command
        let mut cmd = Command::new("spotdl");
        cmd.arg("download").arg(&url);

        // Configure output path
        let full_output_path = if let Some(ref dir) = output_dir {
            if !output_template.is_empty() {
                format!("{}/{}", dir, output_template)
            } else {
                dir.clone()
            }
        } else {
            output_template.clone()
        };

        if !full_output_path.is_empty() {
            cmd.arg("--output").arg(&full_output_path);
        }

        cmd.arg("--format").arg(&format);
        cmd.arg("--audio").arg("youtube-music").arg("youtube");
        cmd.arg("--print-errors");

        // Execute with timeout
        let result = timeout(
            Duration::from_secs(SPOTDL_TIMEOUT_SECS),
            cmd.output()
        ).await;

        match result {
            Ok(Ok(output)) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);

                // Check for YouTube errors
                if stdout.contains("AudioProviderError") || stdout.contains("YT-DLP download error") {
                    let _ = app_handle.emit("download-progress", DownloadProgress {
                        song: song_name.clone(),
                        index: 1,
                        total: 1,
                        status: "⚠️ Error de YouTube".to_string(),
                        url: url.clone(),
                    });
                    return Err(DownloadError::YouTubeError.into());
                }

                let _ = app_handle.emit("download-progress", DownloadProgress {
                    song: song_name.clone(),
                    index: 1,
                    total: 1,
                    status: "✅ Descargada".to_string(),
                    url: url.clone(),
                });

                tracing::info!("📥 Single track download completed: {}", song_name);
                Ok(format!("✅ {} descargada correctamente", song_name))
            }
            Ok(Ok(output)) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let first_line = stderr.lines().next().unwrap_or("Error desconocido");
                let error_msg = format!("Error: {}", first_line.chars().take(100).collect::<String>());
                tracing::error!("📥 Single track download failed: {}", error_msg);
                Err(DownloadError::Failed(error_msg).into())
            }
            Ok(Err(e)) => {
                let error_msg = format!("Error ejecutando spotdl: {}", e);
                tracing::error!("📥 Command execution error: {}", error_msg);
                Err(DownloadError::Failed(error_msg).into())
            }
            Err(_) => {
                let error_msg = format!("Timeout descargando {} (>5min)", song_name);
                tracing::error!("📥 Timeout: {}", error_msg);
                Err(DownloadError::Timeout(SPOTDL_TIMEOUT_SECS).into())
            }
        }
    }

    /// Helper function to download a single track with progress reporting
    async fn download_single_track_with_progress(
        url: String,
        output_template: String,
        format: String,
        output_dir: Option<String>,
        index: usize,
        total: usize,
        app_handle: AppHandle,
    ) -> Result<(), AppError> {
        let song_name = extract_song_id(&url);

        // Build command with validation
        let mut cmd = Command::new("spotdl");
        cmd.arg("download").arg(&url);

        // Configure output path
        let full_output_path = if let Some(ref dir) = output_dir {
            if !output_template.is_empty() {
                format!("{}/{}", dir, output_template)
            } else {
                dir.clone()
            }
        } else {
            output_template.clone()
        };

        if !full_output_path.is_empty() {
            cmd.arg("--output").arg(&full_output_path);
        }

        cmd.arg("--format").arg(&format);
        cmd.arg("--audio").arg("youtube-music").arg("youtube");
        cmd.arg("--print-errors");

        // Execute with timeout
        let result = timeout(
            Duration::from_secs(SPOTDL_TIMEOUT_SECS),
            cmd.output()
        ).await;

        let status_msg = match result {
            Ok(Ok(output)) if output.status.success() => {
                // Check for YouTube errors in stdout
                let stdout = String::from_utf8_lossy(&output.stdout);
                if stdout.contains("AudioProviderError") || stdout.contains("YT-DLP download error") {
                    tracing::warn!("📥 YouTube error for {}: No se pudo descargar desde YouTube. Actualiza yt-dlp: pip install --upgrade yt-dlp spotdl", song_name);
                    let _ = app_handle.emit("download-progress", DownloadProgress {
                        song: song_name.clone(),
                        index,
                        total,
                        status: "⚠️ Error de YouTube".to_string(),
                        url: url.clone(),
                    });
                    return Err(DownloadError::YouTubeError.into());
                }
                tracing::info!("📥 Successfully downloaded: {}", song_name);
                "✅ Descargada".to_string()
            }
            Ok(Ok(output)) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let first_line = stderr.lines().next().unwrap_or("Error desconocido");
                let error_msg = first_line.chars().take(100).collect::<String>();
                tracing::error!("📥 Download failed for {}: {}", song_name, error_msg);
                format!("❌ {}", error_msg)
            }
            Ok(Err(e)) => {
                tracing::error!("📥 Command execution error for {}: {}", song_name, e);
                format!("⚠️ Error: {}", e)
            }
            Err(_) => {
                tracing::error!("📥 Timeout downloading {}: >{}s", song_name, SPOTDL_TIMEOUT_SECS);
                "⏱️ Timeout (>5min)".to_string()
            }
        };

        // Emit progress (ignore errors)
        let _ = app_handle.emit("download-progress", DownloadProgress {
            song: song_name,
            index,
            total,
            status: status_msg,
            url,
        });

        Ok(())
    }
}

