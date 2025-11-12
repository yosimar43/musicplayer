import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { MusicFile } from '@/lib/types/music';

/**
 * Get the default music folder path for the current OS
 */
export async function getDefaultMusicFolder(): Promise<string> {
  try {
    const folder = await invoke<string>('get_default_music_folder');
    return folder;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error obteniendo carpeta predeterminada:', errorMsg);
    throw new Error(`No se pudo obtener la carpeta de música: ${errorMsg}`);
  }
}

/**
 * Scan a folder for music files and return their metadata
 * Limited to 10,000 files and 10 levels deep for performance
 */
export async function scanMusicFolder(folderPath: string): Promise<MusicFile[]> {
  if (!folderPath || folderPath.trim() === '') {
    throw new Error('Ruta de carpeta inválida');
  }
  
  try {
    const files = await invoke<MusicFile[]>('scan_music_folder', { folderPath });
    return files;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error escaneando carpeta:', errorMsg);
    throw new Error(`Error escaneando carpeta: ${errorMsg}`);
  }
}

/**
 * Get metadata for a single audio file
 */
export async function getAudioMetadata(filePath: string): Promise<MusicFile> {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Ruta de archivo inválida');
  }
  
  try {
    return await invoke<MusicFile>('get_audio_metadata', { filePath });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error obteniendo metadata:', errorMsg);
    throw new Error(`Error obteniendo metadata: ${errorMsg}`);
  }
}

/**
 * Open a folder selection dialog
 */
export async function selectMusicFolder(): Promise<string | null> {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Seleccionar Carpeta de Música',
    });
    
    return selected as string | null;
  } catch (error) {
    console.error('❌ Error seleccionando carpeta:', error);
    return null;
  }
}

/**
 * Open file selection dialog for audio files
 * Supported formats: MP3, M4A, FLAC, WAV, OGG, AAC, WMA
 */
export async function selectAudioFiles(): Promise<string[] | null> {
  try {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Archivos de Audio',
        extensions: ['mp3', 'm4a', 'flac', 'wav', 'ogg', 'aac', 'wma']
      }],
      title: 'Seleccionar Archivos de Audio',
    });
    
    if (Array.isArray(selected)) {
      return selected;
    } else if (selected) {
      return [selected];
    }
    return null;
  } catch (error) {
    console.error('❌ Error seleccionando archivos:', error);
    return null;
  }
}
