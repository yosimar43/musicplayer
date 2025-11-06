import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { MusicFile } from '@/lib/types/music';

/**
 * Get the default music folder path for the current OS
 */
export async function getDefaultMusicFolder(): Promise<string> {
  try {
    return await invoke<string>('get_default_music_folder');
  } catch (error) {
    console.error('Error getting default music folder:', error);
    throw error;
  }
}

/**
 * Scan a folder for music files and return their metadata
 */
export async function scanMusicFolder(folderPath: string): Promise<MusicFile[]> {
  try {
    return await invoke<MusicFile[]>('scan_music_folder', { folderPath });
  } catch (error) {
    console.error('Error scanning music folder:', error);
    throw error;
  }
}

/**
 * Get metadata for a single audio file
 */
export async function getAudioMetadata(filePath: string): Promise<MusicFile> {
  try {
    return await invoke<MusicFile>('get_audio_metadata', { filePath });
  } catch (error) {
    console.error('Error getting audio metadata:', error);
    throw error;
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
      title: 'Select Music Folder',
    });
    
    return selected as string | null;
  } catch (error) {
    console.error('Error selecting folder:', error);
    return null;
  }
}

/**
 * Open file selection dialog for audio files
 */
export async function selectAudioFiles(): Promise<string[] | null> {
  try {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Audio Files',
        extensions: ['mp3', 'm4a', 'flac', 'wav', 'ogg', 'aac', 'wma']
      }],
      title: 'Select Audio Files',
    });
    
    if (Array.isArray(selected)) {
      return selected;
    } else if (selected) {
      return [selected];
    }
    return null;
  } catch (error) {
    console.error('Error selecting files:', error);
    return null;
  }
}
