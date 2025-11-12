
/**
 * 📝 Logger condicional para desarrollo
 * En producción, los logs se desactivan automáticamente
 */

const isDev = typeof import.meta.env !== 'undefined' && (import.meta.env.MODE === 'development' || import.meta.env.DEV === true);

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    // Los errores siempre se muestran
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  }
};
