/**
 * 🏪 Store reactivo para playlists de Spotify
 * Centraliza la gestión de playlists en un singleton global
 */

import { untrack } from 'svelte';
import { TauriCommands, type SpotifyPlaylist } from '@/lib/utils/tauriCommands';

const { getPlaylists } = TauriCommands;

export class PlaylistStore {
    // Estado reactivo
    playlists = $state<SpotifyPlaylist[]>([]);
    isLoading = $state(false);
    error = $state<string | null>(null);

    // Estadísticas derivadas
    totalPlaylists = $derived(this.playlists.length);
    hasPlaylists = $derived(this.playlists.length > 0);

    /**
     * Carga las playlists del usuario desde Spotify
     * @param limit - Número máximo de playlists a cargar (opcional, por defecto 50)
     * @param forceReload - Si es true, fuerza recarga incluso si ya hay playlists cargadas
     */
    async loadPlaylists(limit?: number, forceReload = false): Promise<void> {
        // Si ya hay playlists cargadas y no es recarga forzada, evitar recarga
        if (this.playlists.length > 0 && !forceReload) {
            console.log(`✅ Ya hay ${this.playlists.length} playlists cargadas`);
            return;
        }

        this.isLoading = true;
        this.error = null;

        try {
            console.log('📋 Cargando playlists...');
            const data = await getPlaylists(limit);

            untrack(() => {
                this.playlists = data;
            });

            console.log(`✅ ${data.length} playlists cargadas`);
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Failed to load playlists';
            console.error('❌ Error loading playlists:', err);
            throw err;
        } finally {
            this.isLoading = false;
        }
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

// Funciones helper para compatibilidad
export function searchPlaylists(query: string): SpotifyPlaylist[] {
    return playlistStore.searchPlaylists(query);
}

export function getPlaylistById(id: string): SpotifyPlaylist | undefined {
    return playlistStore.getPlaylistById(id);
}

export function clearPlaylists(): void {
    playlistStore.clearPlaylists();
}
