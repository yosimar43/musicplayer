/**
 * 🎯 Utilidades para metadata de canciones
 * Permite compartir información adicional como imágenes de álbum entre componentes
 */

class TrackMetadataStore {
  private metadata = new Map<string, { albumImage?: string }>();

  /**
   * Guarda la imagen del álbum para una canción específica
   */
  setAlbumImage(trackPath: string, imageUrl: string | null | undefined) {
    if (imageUrl) {
      this.metadata.set(trackPath, {
        ...this.metadata.get(trackPath),
        albumImage: imageUrl
      });
    }
  }

  /**
   * Obtiene la imagen del álbum para una canción
   */
  getAlbumImage(trackPath: string): string | null {
    return this.metadata.get(trackPath)?.albumImage || null;
  }

  /**
   * Limpia la metadata de una canción
   */
  clear(trackPath: string) {
    this.metadata.delete(trackPath);
  }

  /**
   * Limpia toda la metadata
   */
  clearAll() {
    this.metadata.clear();
  }
}

export const trackMetadata = new TrackMetadataStore();

