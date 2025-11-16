import { normalizeTrackName } from '@/lib/utils/common';
import type { SpotifyTrack } from '@/lib/utils/tauriCommands';

export type SortBy = 'name' | 'artist' | 'album' | 'duration' | 'popularity';
export type SortOrder = 'asc' | 'desc';
export type PopularityFilter = 'all' | 'high' | 'medium' | 'low';

/**
 * Hook para manejar filtrado, ordenamiento y búsqueda de tracks
 */
export function useTrackFilters(searchQuery: () => string) {
  let sortBy = $state<SortBy>('name');
  let sortOrder = $state<SortOrder>('asc');
  let filterPopularity = $state<PopularityFilter>('all');

  /**
   * Cambia el ordenamiento de las columnas
   */
  function handleSort(column: SortBy): void {
    if (sortBy === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortOrder = 'asc';
    }
  }

  /**
   * Filtra y ordena tracks según los criterios activos
   */
  function filterAndSortTracks<T extends SpotifyTrack>(tracks: T[]): T[] {
    let filtered = tracks;

    // 🔍 Búsqueda optimizada con normalización
    const query = searchQuery().trim();
    if (query) {
      const normalizedQuery = normalizeTrackName(query);
      
      filtered = filtered.filter(t => {
        const normalizedText = normalizeTrackName(
          `${t.name} ${t.artists.join(' ')} ${t.album}`
        );
        return normalizedText.includes(normalizedQuery);
      });
    }

    // Filtrar por popularidad
    if (filterPopularity !== 'all') {
      filtered = filtered.filter(t => {
        const pop = t.popularity || 0;
        switch (filterPopularity) {
          case 'high': return pop >= 70;
          case 'medium': return pop >= 40 && pop < 70;
          case 'low': return pop < 40;
          default: return true;
        }
      });
    }

    // Ordenar (sin mutar el array original)
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'artist':
          comparison = a.artists[0].localeCompare(b.artists[0]);
          break;
        case 'album':
          comparison = a.album.localeCompare(b.album);
          break;
        case 'duration':
          comparison = a.duration_ms - b.duration_ms;
          break;
        case 'popularity':
          comparison = (a.popularity || 0) - (b.popularity || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Verifica si hay filtros activos
   */
  function hasActiveFilters(): boolean {
    return searchQuery().trim() !== '' || filterPopularity !== 'all';
  }

  /**
   * Limpia todos los filtros
   */
  function clearFilters(): void {
    filterPopularity = 'all';
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    sortBy = 'name';
    sortOrder = 'asc';
    filterPopularity = 'all';
  }

  return {
    // Estado
    get sortBy() { return sortBy; },
    get sortOrder() { return sortOrder; },
    get filterPopularity() { return filterPopularity; },
    set filterPopularity(value: PopularityFilter) { filterPopularity = value; },
    
    // Acciones
    handleSort,
    filterAndSortTracks,
    hasActiveFilters,
    clearFilters,
    reset
  };
}
