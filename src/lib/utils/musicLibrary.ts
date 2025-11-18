import { open } from '@tauri-apps/plugin-dialog';
import { TauriCommands } from './tauriCommands';
import type { MusicFile } from '@/lib/types';

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
