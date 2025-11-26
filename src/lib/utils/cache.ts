/**
 * 🗄️ Caché simple con persistencia en localStorage y TTL
 * Para optimizar llamadas repetidas a APIs externas y persistir datos entre sesiones
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private prefix = 'music_cache_';
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.loadFromStorage();
    }
  }

  /**
   * Carga el caché desde localStorage al iniciar
   */
  private loadFromStorage() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry = JSON.parse(raw);
            // Solo cargar si no ha expirado
            if (Date.now() - entry.timestamp <= entry.ttl) {
              const cleanKey = key.replace(this.prefix, '');
              this.memoryCache.set(cleanKey, entry);
            } else {
              // Limpiar expirados inmediatamente
              localStorage.removeItem(key);
            }
          }
        }
      }
      console.log(`📦 Caché cargado: ${this.memoryCache.size} elementos recuperados`);
    } catch (e) {
      console.warn('Error cargando caché:', e);
    }
  }

  /**
   * Guarda una entrada en localStorage
   */
  private saveToStorage(key: string, entry: CacheEntry<any>) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Error guardando en caché (posiblemente lleno):', e);
      // Si está lleno, podríamos intentar limpiar expirados
      this.cleanup();
    }
  }

  /**
   * Guarda datos en caché con TTL
   * @param key - Clave única
   * @param data - Datos a cachear
   * @param ttl - Tiempo de vida en milisegundos (default: 24 horas para persistencia)
   */
  set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): void {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.memoryCache.set(key, entry);
    this.saveToStorage(key, entry);
  }

  /**
   * Obtiene datos del caché si no han expirado
   * @param key - Clave única
   * @returns Datos o null si no existe o expiró
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Verifica si existe y no ha expirado
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Elimina una entrada específica
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    if (this.isBrowser) {
      localStorage.removeItem(this.prefix + key);
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.memoryCache.clear();
    if (this.isBrowser) {
      // Solo borrar nuestras keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  }

  /**
   * Limpia entradas expiradas (mantenimiento)
   */
  cleanup(): void {
    const now = Date.now();

    // Limpiar memoria
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
      }
    }

    // Limpiar storage (por si hay huerfanos)
    if (this.isBrowser) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const entry = JSON.parse(raw);
              if (now - entry.timestamp > entry.ttl) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            localStorage.removeItem(key); // Si está corrupto, borrar
          }
        }
      }
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    return {
      size: this.memoryCache.size,
      storageUsage: this.isBrowser ? localStorage.length : 0
    };
  }
}

// Instancia singleton
export const cache = new SimpleCache();

// Limpieza automática cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}
