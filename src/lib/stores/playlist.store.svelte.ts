import { untrack } from 'svelte';
import type { SpotifyPlaylist } from '@/lib/utils/tauriCommands';

/**
 * 🎯 PLAYLIST STORE - Estado Puro
 * 
 * PRINCIPIOS:
 * ✅ Solo estado reactivo ($state, $derived)
 * ✅ Métodos puros (sin side effects de I/O)
 * ✅ SIN TauriCommands (eso va en el hook)
 * ✅ Fácilmente testeable
 * 
 * La carga de playlists se maneja en useSpotifyPlaylists hook
 */
export class PlaylistStore {
    // Estado reactivo
    playlists = $state<SpotifyPlaylist[]>([]);
    isLoading = $state(false);
    error = $state<string | null>(null);

    // Estadísticas derivadas
    totalPlaylists = $derived(this.playlists.length);
    hasPlaylists = $derived(this.playlists.length > 0);

    /**
     * Establece las playlists (mutación pura)
     */
    setPlaylists(playlists: SpotifyPlaylist[]): void {
        untrack(() => {
            this.playlists = playlists;
        });
    }

    /**
     * Establece estado de carga
     */
    setLoading(loading: boolean): void {
        this.isLoading = loading;
    }

    /**
     * Establece error
     */
    setError(error: string | null): void {
        this.error = error;
    }

    /**
     * Busca playlists por nombre
     */
    searchPlaylists(query: string): SpotifyPlaylist[] {
        const lowerQuery = query.toLowerCase().trim();
        return this.playlists.filter(playlist =>
            playlist.name.toLowerCase().includes(lowerQuery) ||
            playlist.description?.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Obtiene una playlist por ID
     */
    getPlaylistById(id: string): SpotifyPlaylist | undefined {
        return this.playlists.find(p => p.id === id);
    }

    /**
     * Limpia el estado de playlists
     */
    clearPlaylists(): void {
        untrack(() => {
            this.playlists = [];
            this.error = null;
        });
    }

    /**
     * Reinicia completamente el estado
     */
    reset(): void {
        untrack(() => {
            this.playlists = [];
            this.error = null;
            this.isLoading = false;
        });
    }
}

// Exportar instancia singleton
export const playlistStore = new PlaylistStore();
