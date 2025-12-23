//! Download service for Spotify tracks using spotdl
//!
//! Handles downloading tracks with controlled concurrency, progress reporting,
//! and comprehensive error handling.

use futures::stream::{FuturesUnordered, StreamExt};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use tokio::time::{sleep, timeout, Duration};
use tracing::instrument;

use crate::errors::{AppError, DownloadError};
use crate::utils::{
    extract_song_id, validate_batch_size, validate_download_format, validate_output_path,
    validate_spotify_url,
};

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

    /// Downloads multiple Spotify tracks in segments using spotdl with controlled concurrency
    #[instrument(skip_all, fields(url_count = urls.len(), segment_size, delay))]
    pub async fn download_tracks_segmented(
        urls: Vec<String>,
        segment_size: usize,
        delay: u64,
        output_template: String,
        format: String,
        output_dir: Option<String>,
        app_handle: &AppHandle,
    ) -> Result<(), AppError> {
        tracing::info!("🚀 Iniciando descarga segmentada de {} URLs", urls.len());
        
        // Input validations
        if urls.is_empty() {
            tracing::warn!("❌ Lista de URLs vacía");
            return Err(DownloadError::Failed("Empty URL list".to_string()).into());
        }

        validate_batch_size(urls.len(), MAX_SONGS_PER_BATCH)?;
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
        tracing::info!("🔍 Verificando instalación de spotdl...");
        Self::check_installed().await?;
        tracing::info!("✅ spotdl instalado correctamente");

        let final_segment_size = segment_size.max(1).min(50);
        let final_delay = delay.clamp(MIN_DELAY_SECS, MAX_DELAY_SECS);

        let total = urls.len();
        let mut total_downloaded = 0;
        let mut total_failed = 0;

        tracing::info!(
            "📥 Iniciando descarga de {} canciones (segmentos: {}, delay: {}s, max concurrent: {})",
            total,
            final_segment_size,
            final_delay,
            MAX_CONCURRENT_DOWNLOADS
        );

        let chunks: Vec<_> = urls.chunks(final_segment_size).collect();
        let total_segments = chunks.len();
        tracing::info!("📦 Dividiendo en {} segmentos", total_segments);

        for (segment_idx, chunk) in chunks.iter().enumerate() {
            tracing::info!(
                "📥 Procesando segmento {} de {} con {} tracks",
                segment_idx + 1,
                total_segments,
                chunk.len()
            );

            let (downloaded, failed) = Self::process_download_segment(
                chunk,
                segment_idx,
                final_segment_size,
                total,
                &output_template,
                &format,
                &output_dir,
                app_handle,
            )
            .await;

            total_downloaded += downloaded;
            total_failed += failed;
            tracing::info!(
                "✅ Segmento {} completado: {} descargadas, {} fallidas (total: {}/{})",
                segment_idx + 1,
                downloaded,
                failed,
                total_downloaded,
                total
            );

            // Emit segment completion
            let _ = app_handle.emit(
                "download-segment-finished",
                DownloadSegmentFinished {
                    segment: segment_idx + 1,
                    message: format!("✅ Segmento {} completado", segment_idx + 1),
                },
            );

            // Delay between segments (except for the last one)
            if segment_idx < total_segments - 1 {
                tracing::info!("⏳ Esperando {}s antes del siguiente segmento", final_delay);
                sleep(Duration::from_secs(final_delay)).await;
            }
        }

        // Emit final completion
        let _ = app_handle.emit(
            "download-finished",
            DownloadFinished {
                message: "✅ Descarga completada".to_string(),
                total_downloaded,
                total_failed,
            },
        );

        tracing::info!(
            "📥 Download completed: {} downloaded, {} failed",
            total_downloaded,
            total_failed
        );
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
        tracing::info!("🎵 Iniciando descarga de '{}' ({} de {})", song_name, index, total);
        
        let full_output_path = Self::build_output_path(&output_template, output_dir.as_deref());
        tracing::debug!("📁 Ruta de salida: {:?}", full_output_path);

        let mut cmd = Self::build_spotdl_command(&url, &format, full_output_path.as_deref());
        tracing::debug!("⚡ Comando spotdl: {:?}", cmd);

        let start_time = std::time::Instant::now();
        let result = timeout(Duration::from_secs(SPOTDL_TIMEOUT_SECS), cmd.output()).await;
        let duration = start_time.elapsed();

        tracing::info!("⏱️ Descarga de '{}' tomó {:.2}s", song_name, duration.as_secs_f32());

        let status_msg = Self::process_download_output(result, &song_name)?;
        tracing::info!("✅ Descarga completada: '{}' - {}", song_name, status_msg);

        // Emit progress (ignore errors)
        let _ = app_handle.emit(
            "download-progress",
            DownloadProgress {
                song: song_name,
                index,
                total,
                status: status_msg,
                url,
            },
        );

        Ok(())
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

    /// Processes a download segment with controlled concurrency
    async fn process_download_segment(
        chunk: &[String],
        segment_idx: usize,
        segment_size: usize,
        total: usize,
        output_template: &str,
        format: &str,
        output_dir: &Option<String>,
        app_handle: &AppHandle,
    ) -> (usize, usize) {
        tracing::info!("🔄 Iniciando segmento {} con {} URLs", segment_idx + 1, chunk.len());
        
        let mut download_tasks = FuturesUnordered::new();
        let mut downloaded = 0;
        let mut failed = 0;

        // Spawn all download tasks for this segment
        for (idx_in_chunk, url) in chunk.iter().enumerate() {
            let global_idx = segment_idx * segment_size + idx_in_chunk + 1;
            tracing::debug!("🚀 Spawning download task {}: {}", global_idx, url);
            
            let url_clone = url.clone();
            let output_template_clone = output_template.to_string();
            let format_clone = format.to_string();
            let output_dir_clone = output_dir.clone();
            let app_handle_clone = app_handle.clone();

            let download_task = tokio::spawn(async move {
                Self::download_single_track_with_progress(
                    url_clone,
                    output_template_clone,
                    format_clone,
                    output_dir_clone,
                    global_idx,
                    total,
                    app_handle_clone,
                )
                .await
            });

            download_tasks.push(download_task);

            // Limit concurrent downloads
            if download_tasks.len() >= MAX_CONCURRENT_DOWNLOADS {
                tracing::debug!("⏳ Máximo de descargas concurrentes alcanzado, esperando...");
                if let Some(result) = download_tasks.next().await {
                    Self::count_download_result(result, &mut downloaded, &mut failed);
                    tracing::debug!("📊 Progreso segmento: {}/{}", downloaded + failed, chunk.len());
                }
            }
        }

        // Wait for remaining downloads
        tracing::debug!("⏳ Esperando descargas restantes en segmento...");
        while let Some(result) = download_tasks.next().await {
            Self::count_download_result(result, &mut downloaded, &mut failed);
            tracing::debug!("📊 Progreso final segmento: {}/{}", downloaded + failed, chunk.len());
        }

        tracing::info!("✅ Segmento {} completado: {} exitosas, {} fallidas", segment_idx + 1, downloaded, failed);
        (downloaded, failed)
    }

    /// Counts download results (success or failure)
    fn count_download_result(
        result: Result<Result<(), AppError>, tokio::task::JoinError>,
        downloaded: &mut usize,
        failed: &mut usize,
    ) {
        match result {
            Ok(Ok(_)) => *downloaded += 1,
            Ok(Err(_)) | Err(_) => *failed += 1,
        }
    }
}
