/**
 * PERFILES DE RESOLUCIÓN ESTÁNDAR
 * 
 * Sistema de normalización de resoluciones para optimización de video.
 * Cada perfil define un "target" al que se renderizan los videos.
 * 
 * Filosofía:
 * - Los videos se procesan UNA VEZ por perfil (no por pantalla individual)
 * - Se selecciona el perfil más cercano según píxeles totales
 * - Mantiene aspect ratio y agrega padding si es necesario
 */

const RESOLUTION_PROFILES = {
  HD: {
    name: 'Full HD',
    width: 1920,
    height: 1080,
    maxPixels: 2500000,  // ~2.5M px (1920x1300 aprox)
    description: 'Para pantallas 1080p y menores'
  },
  QHD: {
    name: '2K/QHD',
    width: 2560,
    height: 1440,
    maxPixels: 4000000,  // ~4M px (2000x2000 aprox)
    description: 'Para pantallas 1440p'
  },
  UHD: {
    name: '4K/UHD',
    width: 3840,
    height: 2160,
    maxPixels: 10000000, // ~10M px (3200x3100 aprox)
    description: 'Para pantallas 4K'
  },
  UHD8K: {
    name: '8K',
    width: 7680,
    height: 4320,
    maxPixels: Infinity,
    description: 'Para pantallas 5K, 6K, 8K y superiores'
  }
};

function normalizeResolution(width, height) {
  const pixels = width * height;
  
  // Buscar el perfil que mejor se ajuste
  for (const [key, profile] of Object.entries(RESOLUTION_PROFILES)) {
    if (pixels <= profile.maxPixels) {
      return {
        width: profile.width,
        height: profile.height,
        profile: profile.name,
        originalWidth: width,
        originalHeight: height
      };
    }
  }
  
  // Fallback (nunca debería llegar aquí por el Infinity)
  return {
    width: 7680,
    height: 4320,
    profile: '8K',
    originalWidth: width,
    originalHeight: height
  };
}

function getAvailableProfiles() {
  return Object.values(RESOLUTION_PROFILES);
}

module.exports = { 
  normalizeResolution,
  getAvailableProfiles,
  RESOLUTION_PROFILES
};
