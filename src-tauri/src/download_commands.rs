use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use tokio::time::{sleep, Duration};

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

/// Descarga canciones de Spotify por segmentos usando spotdl
/// 
/// # Parámetros
/// - `urls`: Lista de URLs de Spotify a descargar
/// - `segment_size`: Cantidad de canciones por segmento (recomendado: 10)
/// - `delay`: Segundos de espera entre canciones (recomendado: 2-5)
/// - `output_template`: Template de salida de spotdl (ej: "{artist}/{album}/{title}")
/// - `format`: Formato de audio (mp3, flac, ogg, m4a, opus)
/// - `output_dir`: Directorio de salida (opcional, usa Music por defecto)
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
    // Validar que spotdl esté instalado
    let spotdl_check = Command::new("spotdl")
        .arg("--version")
        .output()
        .await;

    if spotdl_check.is_err() {
        let error_msg = "spotdl no está instalado. Por favor instala spotdl: pip install spotdl".to_string();
        app_handle
            .emit("download-error", DownloadError {
                message: error_msg.clone(),
            })
            .unwrap();
        return Err(error_msg);
    }

    let total = urls.len();
    let mut total_downloaded = 0;
    let mut total_failed = 0;

    println!("🎵 Iniciando descarga de {} canciones en segmentos de {}", total, segment_size);

    for (segment_idx, chunk) in urls.chunks(segment_size).enumerate() {
        println!("📦 Procesando segmento {} de {}", segment_idx + 1, (total + segment_size - 1) / segment_size);

        for (idx_in_chunk, url) in chunk.iter().enumerate() {
            let global_idx = segment_idx * segment_size + idx_in_chunk + 1;
            let song_name = extract_song_name(url);

            println!("🎧 [{}/{}] Descargando: {}", global_idx, total, song_name);

            // Construir comando de spotdl
            let mut cmd = Command::new("spotdl");
            cmd.arg("download").arg(url);

            // Combinar directorio con template si existe
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

            // Agregar formato
            cmd.arg("--format").arg(&format);
            
            // Agregar opciones para mejorar la descarga de YouTube
            cmd.arg("--audio").arg("youtube-music").arg("youtube");
            cmd.arg("--print-errors");

            // Ejecutar descarga
            let result = cmd.output().await;

            let status_msg = match result {
                Ok(output) if output.status.success() => {
                    total_downloaded += 1;
                    "✅ Descargada".to_string()
                }
                Ok(output) => {
                    total_failed += 1;
                    let error_msg = String::from_utf8_lossy(&output.stderr);
                    let first_line = error_msg.lines().next().unwrap_or("Error desconocido");
                    format!("❌ Error: {}", first_line)
                }
                Err(e) => {
                    total_failed += 1;
                    format!("⚠️ Fallo: {}", e)
                }
            };

            println!("{} {}", status_msg, song_name);

            // Emitir progreso al frontend
            app_handle
                .emit("download-progress", DownloadProgress {
                    song: song_name,
                    index: global_idx,
                    total,
                    status: status_msg,
                    url: url.clone(),
                })
                .unwrap();

            // Esperar antes de la siguiente descarga
            if global_idx < total {
                sleep(Duration::from_secs(delay)).await;
            }
        }

        // Emitir finalización de segmento
        app_handle
            .emit("download-segment-finished", DownloadSegmentFinished {
                segment: segment_idx + 1,
                message: format!("✅ Segmento {} completado ({} de {})", segment_idx + 1, (segment_idx + 1) * segment_size.min(total), total),
            })
            .unwrap();

        println!("✅ Segmento {} completado\n", segment_idx + 1);
    }

    // Emitir finalización total
    app_handle
        .emit("download-finished", DownloadFinished {
            message: "✅ Proceso de descarga completado".to_string(),
            total_downloaded,
            total_failed,
        })
        .unwrap();

    println!("🎉 Descarga completada: {} éxitos, {} fallos", total_downloaded, total_failed);

    Ok(())
}

/// Descarga una sola canción de Spotify
#[tauri::command]
pub async fn download_single_spotify_track(
    url: String,
    output_template: String,
    format: String,
    output_dir: Option<String>,
    app_handle: AppHandle,
) -> Result<String, String> {
    println!("🔍 [download_single_spotify_track] Comando invocado desde frontend");
    println!("🔍 Parámetros recibidos:");
    println!("  - url: {}", url);
    println!("  - output_template: {}", output_template);
    println!("  - format: {}", format);
    println!("  - output_dir: {:?}", output_dir);
    
    let song_name = extract_song_name(&url);
    println!("🔍 Nombre extraído de la canción: {}", song_name);

    println!("🎧 Descargando canción individual: {}", song_name);

    // Construir comando
    println!("🔍 Construyendo comando spotdl...");
    let mut cmd = Command::new("spotdl");
    cmd.arg("download").arg(&url);

    // Combinar directorio con template si existe
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
        println!("🔍 Ruta completa de salida: {}", full_output_path);
    }

    cmd.arg("--format").arg(&format);
    println!("🔍 Agregado formato: {}", format);
    
    // Agregar opciones para mejorar la descarga de YouTube
    cmd.arg("--audio").arg("youtube-music").arg("youtube");
    cmd.arg("--print-errors");
    println!("🔍 Agregadas opciones de audio: youtube-music, youtube");

    // Mostrar comando completo antes de ejecutar
    println!("🔍 Comando completo: spotdl download {} --output \"{}\" --format {}", 
        url, full_output_path, format);

    // Ejecutar
    println!("🔍 Ejecutando comando spotdl...");
    let result = cmd.output().await;
    println!("🔍 Comando ejecutado, procesando resultado...");

    match result {
        Ok(output) if output.status.success() => {
            println!("✅ spotdl ejecutado exitosamente");
            let stdout = String::from_utf8_lossy(&output.stdout);
            println!("🔍 STDOUT: {}", stdout);
            
            // Verificar si realmente hubo errores en la salida
            if stdout.contains("AudioProviderError") || stdout.contains("YT-DLP download error") {
                let error_msg = "⚠️ Error: No se pudo descargar desde YouTube. Intenta actualizar yt-dlp: pip install --upgrade yt-dlp spotdl";
                println!("⚠️ {}", error_msg);
                
                app_handle
                    .emit("download-progress", DownloadProgress {
                        song: song_name.clone(),
                        index: 1,
                        total: 1,
                        status: "⚠️ Error de YouTube".to_string(),
                        url: url.clone(),
                    })
                    .unwrap();
                
                return Err(error_msg.to_string());
            }
            
            app_handle
                .emit("download-progress", DownloadProgress {
                    song: song_name.clone(),
                    index: 1,
                    total: 1,
                    status: "✅ Descargada".to_string(),
                    url: url.clone(),
                })
                .unwrap();
            
            let success_msg = format!("✅ {} descargada correctamente", song_name);
            println!("🔍 Retornando: {}", success_msg);
            Ok(success_msg)
        }
        Ok(output) => {
            println!("❌ spotdl falló con código: {:?}", output.status);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("🔍 STDOUT: {}", stdout);
            println!("🔍 STDERR: {}", stderr);
            
            let error_msg = String::from_utf8_lossy(&output.stderr);
            let first_line = error_msg.lines().next().unwrap_or("Error desconocido");
            let error = format!("❌ Error: {}", first_line);
            println!("🔍 Retornando error: {}", error);
            Err(error)
        }
        Err(e) => {
            println!("❌ Error al ejecutar spotdl: {}", e);
            let error = format!("⚠️ Fallo al ejecutar spotdl: {}", e);
            println!("🔍 Retornando error: {}", error);
            Err(error)
        }
    }
}

/// Verifica si spotdl está instalado y devuelve su versión
#[tauri::command]
pub async fn check_spotdl_installed() -> Result<String, String> {
    match Command::new("spotdl").arg("--version").output().await {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout);
            Ok(version.trim().to_string())
        }
        Ok(_) => Err("spotdl está instalado pero no responde correctamente".to_string()),
        Err(_) => Err("spotdl no está instalado. Instala con: pip install spotdl".to_string()),
    }
}

/// Extrae el nombre de la canción desde una URL de Spotify
fn extract_song_name(url: &str) -> String {
    // Intenta extraer el ID de Spotify de la URL
    if let Some(track_id) = url.split('/').last() {
        if let Some(id_without_query) = track_id.split('?').next() {
            return id_without_query.to_string();
        }
    }
    url.to_string()
}
