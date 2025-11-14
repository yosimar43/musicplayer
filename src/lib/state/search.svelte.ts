/**
 * 🎯 Estado global de búsqueda
 * Permite que el Navbar y otras páginas compartan el estado de búsqueda
 */

class SearchState {
  query = $state('');

  /**
   * Establece el query de búsqueda
   */
  setQuery(q: string) {
    this.query = q;
  }

  /**
   * Limpia el query de búsqueda
   */
  clear() {
    this.query = '';
  }
}

export const search = new SearchState();

