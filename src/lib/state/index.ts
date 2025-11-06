/**
 * Estado global centralizado de la aplicación
 * 
 * Este módulo re-exporta todos los estados para facilitar el acceso
 */

export * from './library.svelte';
export * from './player.svelte';
export * from './ui.svelte';

// Re-exportar para imports simplificados
export { library, loadLibrary, loadDefaultLibrary, searchTracks } from './library.svelte';
export { player, play, pause, next, previous, setVolume, toggleShuffle, toggleRepeat } from './player.svelte';
export { ui, setTheme, toggleSidebar, notify, loadPreferences } from './ui.svelte';
