import { open } from '@tauri-apps/plugin-dialog';
import { TauriCommands } from './tauriCommands';
import type { MusicFile } from '@/lib/types/music';

/**
 * Get the default music folder path for the current OS
 * @deprecated Usar TauriCommands.getDefaultMusicFolder() directamente
 */
export async function getDefaultMusicFolder(): Promise<string> {
  return await TauriCommands.getDefaultMusicFolder();
}

/**
 * Scan a folder for music files and return their metadata
 * Limited to 10,000 files and 10 levels deep for performance
 * @deprecated Usar TauriCommands.scanMusicFolder() directamente
 */
export async function scanMusicFolder(folderPath: string): Promise<MusicFile[]> {
  if (!folderPath || folderPath.trim() === '') {
    throw new Error('Ruta de carpeta inválida');
  }
  
  return await TauriCommands.scanMusicFolder(folderPath);
}

/**
 * Get metadata for a single audio file
 * @deprecated Usar TauriCommands.getAudioMetadata() directamente
 */
export async function getAudioMetadata(filePath: string): Promise<MusicFile> {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Ruta de archivo inválida');
  }
  
  return await TauriCommands.getAudioMetadata(filePath);
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
