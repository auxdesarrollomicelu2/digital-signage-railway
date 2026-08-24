/**
 * QUEUE CONFIGURATION
 * 
 * Configuración de BullMQ para procesamiento asíncrono de videos
 * 
 * Responsabilidades:
 * - Configurar conexión a Redis
 * - Crear cola de procesamiento de videos
 * - Definir políticas de retry y limpieza
 * - Exportar instancias para uso en servicios y workers
 */

const { Queue } = require('bullmq');
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

connection.on('connect', () => {
  console.log('✅ [Redis] Conectado correctamente');
});

connection.on('error', (err) => {
  console.error('❌ [Redis] Error de conexión:', err.message);
});

const videoQueue = new Queue('video-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600,
    },
  },
});

videoQueue.on('error', (err) => {
  console.error('❌ [VideoQueue] Error en cola:', err.message);
});

module.exports = {
  videoQueue,
  connection,
};
