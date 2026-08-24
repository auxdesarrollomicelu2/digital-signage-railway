/**
 * VIDEO WORKER
 * 
 * Worker dedicado para procesar videos en background con BullMQ
 * 
 * Responsabilidades:
 * - Escuchar jobs de la cola "video-processing"
 * - Procesar videos usando video-render.service
 * - Manejar errores y reintentos automáticos
 * - Registrar logs de progreso
 * 
 * Configuración:
 * - Concurrencia: 2 videos simultáneos (evitar saturar CPU)
 * - Timeout: 60s por video
 * - Reintentos: 3 intentos con backoff exponencial
 */

require('dotenv').config();
const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const { getOrCreateVideoRender } = require('../services/video-render.service');
const { setupMQTTPublisher, publishCommand } = require('../services/mqtt');
const fs = require('fs');
const path = require('path');

setupMQTTPublisher();

// Limpiar archivos temporales huérfanos al iniciar el worker
try {
  const tempDir = path.join(__dirname, '../../temp-videos');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    if (files.length > 0) {
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (err) {
          console.warn(`[VideoWorker] No se pudo eliminar ${file}:`, err.message);
        }
      });
      console.log(`[VideoWorker] Limpiados ${files.length} archivo(s) temporal(es)`);
    }
  }
} catch (err) {
  console.warn('[VideoWorker] Error al limpiar archivos temporales:', err.message);
}

const worker = new Worker(
  'video-processing',
  async (job) => {
    const { mediaId, renderId, width, height, rotation = 0 } = job.data;
    
    console.log(`[VideoWorker] Job ${job.id} data completo:`, JSON.stringify(job.data));
    console.log(`[VideoWorker] Procesando job ${job.id}: media ${mediaId} → ${width}x${height} rot${rotation}°`);

    try {
      await job.updateProgress(10);

      const render = await getOrCreateVideoRender(mediaId, width, height, rotation);

      await job.updateProgress(100);

      console.log(`[VideoWorker] Job ${job.id} completado: render ${render.id}`);

      return {
        renderId: render.id,
        status: render.status,
        url: render.url,
      };
    } catch (error) {
      console.error(`[VideoWorker] Job ${job.id} falló:`, error.message);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 60000,
    },
  }
);

worker.on('completed', async (job, result) => {
  console.log(`✅ [VideoWorker] Job ${job.id} completado exitosamente`);
  
  // Notificar al player que el render está listo
  try {
    const { MediaRender, Media, ScreenMedia, Screen } = require('../models');
    
    const render = await MediaRender.findByPk(result.renderId, {
      include: [{
        model: Media,
        as: 'Media'
      }]
    });
    
    if (!render?.Media) return;
    
    // Buscar pantallas que usan este media
    const screenMedias = await ScreenMedia.findAll({
      where: { media_id: render.media_id },
      include: [{
        model: Screen,
        as: 'Screen'
      }]
    });
    
    const deviceIds = new Set(screenMedias.map(sm => sm.Screen?.device_id).filter(Boolean));
    
    if (deviceIds.size > 0) {
      console.log(`[VideoWorker] Notificando actualización a ${deviceIds.size} pantalla(s)`);
      
      for (const deviceId of deviceIds) {
        publishCommand(deviceId, { type: 'refresh', reason: 'video_render_ready' });
      }
    }
  } catch (error) {
    console.error('[VideoWorker] Error notificando actualización:', error.message);
  }
});

worker.on('failed', (job, err) => {
  console.error(`❌ [VideoWorker] Job ${job.id} falló después de ${job.attemptsMade} intentos:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ [VideoWorker] Error en worker:', err.message);
});

console.log('🚀 [VideoWorker] Worker iniciado. Esperando jobs...');

process.on('SIGTERM', async () => {
  console.log('⚠️ [VideoWorker] Recibido SIGTERM, cerrando worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ [VideoWorker] Recibido SIGINT, cerrando worker...');
  await worker.close();
  process.exit(0);
});

module.exports = worker;
