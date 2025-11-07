import { invoke } from '@tauri-apps/api/core';

/**
 * Información de streaming de YouTube
 */
export interface SongStreamInfo {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  stream_url: string;
  thumbnail?: string;
  video_id?: string;
}

/**
 * Busca una canción en YouTube y obtiene la URL de streaming
 * @param query - Texto de búsqueda (título, artista, etc.)
 * @returns Información de la canción con URL de streaming
 */
export async function searchYoutubeStream(query: string): Promise<SongStreamInfo> {
  try {
    console.log('🔍 [YouTube Stream] Buscando:', query);
    const result = await invoke<SongStreamInfo>('search_youtube_stream', { query });
    console.log('✅ [YouTube Stream] Encontrado:', result.title);
    return result;
  } catch (error) {
    console.error('❌ [YouTube Stream] Error:', error);
    throw new Error(`Error buscando en YouTube: ${error}`);
  }
}

/**
 * Regenera la URL de streaming para un video específico
 * (Las URLs expiran después de ~6 horas)
 * @param videoId - ID del video de YouTube
 * @returns Nueva URL de streaming
 */
export async function getStreamUrl(videoId: string): Promise<string> {
  try {
    console.log('🔄 [YouTube Stream] Regenerando URL para:', videoId);
    const url = await invoke<string>('get_stream_url', { videoId });
    console.log('✅ [YouTube Stream] URL regenerada');
    return url;
  } catch (error) {
    console.error('❌ [YouTube Stream] Error regenerando URL:', error);
    throw new Error(`Error obteniendo URL: ${error}`);
  }
}

/**
 * Descarga el audio de YouTube y lo convierte a blob URL
 * @param videoId - ID del video de YouTube
 * @returns Blob URL local para reproducción
 */
export async function downloadYoutubeAudio(videoId: string): Promise<string> {
  try {
    console.log('⬇️ [YouTube Stream] Descargando audio para video:', videoId);
    const audioBytes = await invoke<number[]>('download_youtube_audio', { videoId });
    
    console.log('📦 [YouTube Stream] Recibido:', audioBytes.length, 'bytes');
    
    // Convertir array de números a Uint8Array
    const uint8Array = new Uint8Array(audioBytes);
    
    // Crear blob con tipo MIME adecuado
    const blob = new Blob([uint8Array], { type: 'audio/mp4' });
    
    // Crear URL del blob
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('✅ [YouTube Stream] Audio descargado y convertido a blob');
    console.log('🔗 [YouTube Stream] Blob URL:', blobUrl);
    return blobUrl;
  } catch (error) {
    console.error('❌ [YouTube Stream] Error descargando audio:', error);
    throw new Error(`Error descargando audio: ${error}`);
  }
}
/**
 * Formatea la duración en segundos a formato MM:SS
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
