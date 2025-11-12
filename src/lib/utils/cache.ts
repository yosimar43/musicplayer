/**
 * 🗄️ Caché simple en memoria con TTL (Time To Live)
 * Para optimizar llamadas repetidas a APIs externas
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  /**
   * Guarda datos en caché con TTL
   * @param key - Clave única
   * @param data - Datos a cachear
   * @param ttl - Tiempo de vida en milisegundos (default: 5 minutos)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * Obtiene datos del caché si no han expirado
   * @param key - Clave única
   * @returns Datos o null si no existe o expiró
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
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
    this.cache.delete(key);
  }
  
  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Limpia entradas expiradas (mantenimiento)
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia singleton
export const cache = new SimpleCache();

// Limpieza automática cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}
