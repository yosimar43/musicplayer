use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use tokio::time::{sleep, Duration};

// Constantes de configuración
const MIN_DELAY_SECS: u64 = 2;
const MAX_DELAY_SECS: u64 = 10;
const SPOTDL_TIMEOUT_SECS: u64 = 300; // 5 minutos por canción
const MAX_SONGS_PER_BATCH: usize = 100;

#[derive(Serialize, Clone)]
pub struct DownloadProgress {
    pub song: String,
    pub index: usize,
    pub total: usize,
    pub status: String,
    pub url: String,
}

#[derive(Serialize, Clone)]
pub struct DownloadSegmentFinished {
    pub segment: usize,
    pub message: String,
}

#[derive(Serialize, Clone)]
pub struct DownloadFinished {
    pub message: String,
    pub total_downloaded: usize,
    pub total_failed: usize,
}

#[derive(Serialize, Clone)]
pub struct DownloadError {
    pub message: String,
}

/// Valida una URL de Spotify
fn validate_spotify_url(url: &str) -> Result<(), String> {
    if !url.starts_with("https://open.spotify.com/track/") {
        return Err("URL inválida: debe ser una URL de Spotify track".to_string());
    }
    Ok(())
}

/// Valida y sanitiza una ruta de salida
fn validate_output_path(path: &str) -> Result<PathBuf, String> {
    if path.contains("..") {
        return Err("Ruta inválida: contiene '..'".to_string());
    }
    
    let path_buf = PathBuf::from(path);
    
    // Verificar que el directorio padre existe
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            return Err(format!("El directorio no existe: {}", parent.display()));
        }
    }
    
    Ok(path_buf)
}

/// Descarga canciones de Spotify por segmentos usando spotdl
/// Valida todas las entradas y previene abusos de recursos
#[tauri::command]
pub async fn download_spotify_tracks_segmented(
    urls: Vec<String>,
    segment_size: usize,
    delay: u64,
    output_template: String,
    format: String,
    output_dir: Option<String>,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Validaciones de entrada
    if urls.is_empty() {
        return Err("Lista de URLs vacía".to_string());
    }
    
    if urls.len() > MAX_SONGS_PER_BATCH {
        return Err(format!("Demasiadas canciones. Máximo: {}", MAX_SONGS_PER_BATCH));
    }
    
    let final_segment_size = segment_size.max(1).min(50);
    let final_delay = delay.clamp(MIN_DELAY_SECS, MAX_DELAY_SECS);
    
    // Validar formato
    let valid_formats = ["mp3", "flac", "ogg", "m4a", "opus"];
    if !valid_formats.contains(&format.as_str()) {
        return Err(format!("Formato inválido. Usa: {}", valid_formats.join(", ")));
    }
    
    // Validar URLs de Spotify
    for url in &urls {
        validate_spotify_url(url)?;
    }
    
    // Validar ruta de salida si existe
    if let Some(ref dir) = output_dir {
        validate_output_path(dir)?;
    }
    
    // Verificar que spotdl está instalado
    let spotdl_check = tokio::time::timeout(
        Duration::from_secs(5),
        Command::new("spotdl").arg("--version").output()
    ).await;
    
    match spotdl_check {
        Ok(Ok(output)) if output.status.success() => {
            #[cfg(debug_assertions)]
            println!("✅ spotdl encontrado: {}", String::from_utf8_lossy(&output.stdout).trim());
        }
        _ => {
            let error_msg = "spotdl no está instalado o no responde. Instala con: pip install spotdl yt-dlp".to_string();
            let _ = app_handle.emit("download-error", DownloadError {
                message: error_msg.clone(),
            });
            return Err(error_msg);
        }
    }

    let total = urls.len();
    let mut total_downloaded = 0;
    let mut total_failed = 0;

    #[cfg(debug_assertions)]
    println!("🎵 Descargando {} canciones (segmentos: {}, delay: {}s)", 
        total, final_segment_size, final_delay);

    for (segment_idx, chunk) in urls.chunks(final_segment_size).enumerate() {
        for (idx_in_chunk, url) in chunk.iter().enumerate() {
            let global_idx = segment_idx * final_segment_size + idx_in_chunk + 1;
            let song_name = extract_song_name(url);

            // Construir comando con validación
            let mut cmd = Command::new("spotdl");
            cmd.arg("download").arg(url);

            // Configurar ruta de salida
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

            // Ejecutar con timeout
            let result = tokio::time::timeout(
                Duration::from_secs(SPOTDL_TIMEOUT_SECS),
                cmd.output()
            ).await;

            let status_msg = match result {
                Ok(Ok(output)) if output.status.success() => {
                    total_downloaded += 1;
                    "✅ Descargada".to_string()
                }
                Ok(Ok(output)) => {
                    total_failed += 1;
                    let error_msg = String::from_utf8_lossy(&output.stderr);
                    let first_line = error_msg.lines().next().unwrap_or("Error desconocido");
                    format!("❌ {}", first_line.chars().take(100).collect::<String>())
                }
                Ok(Err(e)) => {
                    total_failed += 1;
                    format!("⚠️ Error: {}", e)
                }
                Err(_) => {
                    total_failed += 1;
                    "⏱️ Timeout (>5min)".to_string()
                }
            };

            // Emitir progreso (con manejo de error)
            let _ = app_handle.emit("download-progress", DownloadProgress {
                song: song_name,
                index: global_idx,
                total,
                status: status_msg,
                url: url.clone(),
            });

            // Esperar entre descargas
            if global_idx < total {
                sleep(Duration::from_secs(final_delay)).await;
            }
        }

        // Emitir finalización de segmento
        let _ = app_handle.emit("download-segment-finished", DownloadSegmentFinished {
            segment: segment_idx + 1,
            message: format!("✅ Segmento {} completado", segment_idx + 1),
        });
    }

    // Emitir finalización total
    let _ = app_handle.emit("download-finished", DownloadFinished {
        message: "✅ Descarga completada".to_string(),
        total_downloaded,
        total_failed,
    });

    Ok(())
}

/// Descarga una sola canción de Spotify con validaciones completas
#[tauri::command]
pub async fn download_single_spotify_track(
    url: String,
    output_template: String,
    format: String,
    output_dir: Option<String>,
    app_handle: AppHandle,
) -> Result<String, String> {
    // Validar URL
    validate_spotify_url(&url)?;
    
    // Validar formato
    let valid_formats = ["mp3", "flac", "ogg", "m4a", "opus"];
    if !valid_formats.contains(&format.as_str()) {
        return Err(format!("Formato inválido. Usa: {}", valid_formats.join(", ")));
    }
    
    // Validar ruta de salida
    if let Some(ref dir) = output_dir {
        validate_output_path(dir)?;
    }
    
    let song_name = extract_song_name(&url);

    // Construir comando
    let mut cmd = Command::new("spotdl");
    cmd.arg("download").arg(&url);

    // Configurar ruta de salida
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

    // Ejecutar con timeout
    let result = tokio::time::timeout(
        Duration::from_secs(SPOTDL_TIMEOUT_SECS),
        cmd.output()
    ).await;

    match result {
        Ok(Ok(output)) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            // Verificar errores en la salida
            if stdout.contains("AudioProviderError") || stdout.contains("YT-DLP download error") {
                let error_msg = "No se pudo descargar desde YouTube. Actualiza yt-dlp: pip install --upgrade yt-dlp spotdl";
                
                let _ = app_handle.emit("download-progress", DownloadProgress {
                    song: song_name.clone(),
                    index: 1,
                    total: 1,
                    status: "⚠️ Error de YouTube".to_string(),
                    url: url.clone(),
                });
                
                return Err(error_msg.to_string());
            }
            
            let _ = app_handle.emit("download-progress", DownloadProgress {
                song: song_name.clone(),
                index: 1,
                total: 1,
                status: "✅ Descargada".to_string(),
                url: url.clone(),
            });
            
            Ok(format!("✅ {} descargada correctamente", song_name))
        }
        Ok(Ok(output)) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let first_line = stderr.lines().next().unwrap_or("Error desconocido");
            Err(format!("Error: {}", first_line.chars().take(100).collect::<String>()))
        }
        Ok(Err(e)) => {
            Err(format!("Error ejecutando spotdl: {}", e))
        }
        Err(_) => {
            Err(format!("Timeout descargando {} (>5min)", song_name))
        }
    }
}

/// Verifica si spotdl está instalado y retorna su versión
#[tauri::command]
pub async fn check_spotdl_installed() -> Result<String, String> {
    let result = tokio::time::timeout(
        Duration::from_secs(5),
        Command::new("spotdl").arg("--version").output()
    ).await;
    
    match result {
        Ok(Ok(output)) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout);
            Ok(version.trim().to_string())
        }
        Ok(Ok(_)) => Err("spotdl no responde correctamente".to_string()),
        Ok(Err(_)) => Err("spotdl no está instalado. Instala con: pip install spotdl yt-dlp".to_string()),
        Err(_) => Err("Timeout verificando spotdl".to_string()),
    }
}

/// Extrae el ID de la canción desde una URL de Spotify
fn extract_song_name(url: &str) -> String {
    url.split('/').last()
        .and_then(|s| s.split('?').next())
        .unwrap_or("unknown")
        .to_string()
}
