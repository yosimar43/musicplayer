use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;

/// Estructura de información de streaming de YouTube
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SongStreamInfo {
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<u64>,
    pub stream_url: String,
    pub thumbnail: Option<String>,
    pub video_id: Option<String>,
}

/// Sanitiza el query de búsqueda para prevenir inyección de comandos
fn sanitize_query(query: &str) -> String {
    // Remover caracteres peligrosos y limitar longitud
    query
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '\'')
        .take(200)
        .collect()
}

/// Comando Tauri: Busca una canción en YouTube y retorna la URL de streaming
#[tauri::command]
pub async fn search_youtube_stream(query: String) -> Result<SongStreamInfo, String> {
    println!("🔍 [YouTube] Buscando: {}", query);
    
    // Sanitizar query
    let safe_query = sanitize_query(&query);
    if safe_query.is_empty() {
        return Err("Query inválido o vacío".to_string());
    }
    
    // Construir búsqueda de YouTube
    let search_query = format!("ytsearch1:{}", safe_query);
    
    println!("📡 [YouTube] Ejecutando yt-dlp...");
    
    // Ejecutar yt-dlp
    let output = Command::new("yt-dlp")
        .args(&[
            "--format", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
            "--dump-json",
            "--no-playlist",
            "--no-warnings",
            "--socket-timeout", "30",
            "--geo-bypass",
            &search_query,
        ])
        .output()
        .map_err(|e| {
            eprintln!("❌ [YouTube] Error ejecutando yt-dlp: {}", e);
            format!("Error ejecutando yt-dlp. ¿Está instalado? Error: {}", e)
        })?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("❌ [YouTube] yt-dlp falló: {}", stderr);
        return Err(format!("yt-dlp falló: {}", stderr));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    println!("📥 [YouTube] Parseando respuesta JSON...");
    
    // Parsear JSON
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| {
            eprintln!("❌ [YouTube] Error parseando JSON: {}", e);
            format!("Error parseando respuesta: {}", e)
        })?;
    
    // Extraer información
    let title = json["title"]
        .as_str()
        .unwrap_or("Título desconocido")
        .to_string();
    
    let artist = json["artist"]
        .as_str()
        .or_else(|| json["uploader"].as_str())
        .map(|s| s.to_string());
    
    let album = json["album"].as_str().map(|s| s.to_string());
    
    let duration = json["duration"].as_u64();
    
    let stream_url = json["url"]
        .as_str()
        .ok_or_else(|| {
            eprintln!("❌ [YouTube] No se encontró URL de streaming");
            eprintln!("JSON recibido: {}", stdout);
            "No se encontró URL de streaming".to_string()
        })?
        .to_string();
    
    println!("🔗 [YouTube] Stream URL: {}", stream_url);
    
    let thumbnail = json["thumbnail"]
        .as_str()
        .or_else(|| {
            json["thumbnails"]
                .as_array()
                .and_then(|thumbs| thumbs.last())
                .and_then(|thumb| thumb["url"].as_str())
        })
        .map(|s| s.to_string());
    
    let video_id = json["id"].as_str().map(|s| s.to_string());
    
    let info = SongStreamInfo {
        title: title.clone(),
        artist,
        album,
        duration,
        stream_url: stream_url.clone(),
        thumbnail,
        video_id,
    };
    
    println!("✅ [YouTube] Encontrado: {}", title);
    println!("🔗 [YouTube] URL: {}", stream_url);
    println!("🔗 [YouTube] URL obtenida (válida por ~6 horas)");
    
    Ok(info)
}

/// Comando Tauri: Regenera la URL de streaming para un video_id específico
#[tauri::command]
pub async fn get_stream_url(video_id: String) -> Result<String, String> {
    println!("🔄 [YouTube] Regenerando URL para video: {}", video_id);
    
    let youtube_url = format!("https://www.youtube.com/watch?v={}", video_id);
    
    let output = Command::new("yt-dlp")
        .args(&[
            "--format", "bestaudio",
            "--get-url",
            "--no-playlist",
            "--no-warnings",
            &youtube_url,
        ])
        .output()
        .map_err(|e| format!("Error ejecutando yt-dlp: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp falló: {}", stderr));
    }
    
    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    println!("✅ [YouTube] URL regenerada");
    Ok(url)
}

/// Comando Tauri: Descarga el audio usando yt-dlp a archivo temporal
#[tauri::command]
pub async fn download_youtube_audio(video_id: String) -> Result<Vec<u8>, String> {
    println!("⬇️ [YouTube] Descargando audio para video: {}", video_id);
    
    let youtube_url = format!("https://www.youtube.com/watch?v={}", video_id);
    
    // Crear archivo temporal
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("yt_audio_{}.m4a", video_id));
    let temp_path = temp_file.to_str().ok_or("Error creando ruta temporal")?;
    
    println!("📁 [YouTube] Archivo temporal: {}", temp_path);
    
    // Usar yt-dlp para descargar a archivo
    let output = Command::new("yt-dlp")
        .args(&[
            "--format", "bestaudio[ext=m4a]/bestaudio",
            "--output", temp_path,
            "--no-playlist",
            "--no-warnings",
            "--progress",
            "--newline",
            "--cookies-from-browser", "chrome",  // Usar cookies del navegador
            &youtube_url,
        ])
        .output()
        .map_err(|e| {
            eprintln!("❌ [YouTube] Error ejecutando yt-dlp: {}", e);
            format!("Error ejecutando yt-dlp: {}", e)
        })?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("❌ [YouTube] yt-dlp falló: {}", stderr);
        
        // Limpiar archivo temporal si existe
        let _ = fs::remove_file(&temp_file);
        
        return Err(format!("Error descargando: {}", stderr));
    }
    
    println!("✅ [YouTube] Descarga completada, leyendo archivo...");
    
    // Leer el archivo
    let bytes = fs::read(&temp_file)
        .map_err(|e| {
            eprintln!("❌ [YouTube] Error leyendo archivo: {}", e);
            format!("Error leyendo archivo: {}", e)
        })?;
    
    // Limpiar archivo temporal
    let _ = fs::remove_file(&temp_file);
    
    if bytes.is_empty() {
        return Err("No se descargó audio (vacío)".to_string());
    }
    
    println!("✅ [YouTube] Audio cargado: {} bytes ({:.2} MB)", 
             bytes.len(), 
             bytes.len() as f64 / 1024.0 / 1024.0);
    
    Ok(bytes)
}
