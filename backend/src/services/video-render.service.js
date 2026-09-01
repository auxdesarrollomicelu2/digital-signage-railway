/**
 * VIDEO RENDER SERVICE
 * 
 * Servicio para optimización de videos con FFmpeg
 * 
 * Responsabilidades:
 * - Descargar video master desde R2
 * - Detectar metadata (duración, resolución, codec)
 * - Procesar con FFmpeg (redimensionar, comprimir, convertir)
 * - Subir render optimizado a R2
 * - Cachear en MediaRenders para evitar reprocesar
 * 
 * Estrategia:
 * - Formato de salida: MP4 H.264 + AAC (máxima compatibilidad)
 * - Bitrate dinámico según resolución
 * - Normalización de resolución (Full HD, 2K, 4K, 8K)
 * - Timeout 60s para procesamiento
 */

const ffmpeg = require('fluent-ffmpeg');
const { uploadBufferToR2, getPublicUrl } = require('./cloudflare');
const { MediaRender, Media } = require('../models');
const { Readable } = require('stream');

async function downloadVideoBuffer(media) {
  try {
    const response = await fetch(media.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`No se pudo descargar video master: ${error.message}`);
  }
}

function detectVideoMetadata(buffer) {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);
    
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout al detectar metadata (10s)'));
    }, 10000);

    ffmpeg(stream)
      .ffprobe((err, metadata) => {
        clearTimeout(timeoutId);
        
        if (err) {
          return reject(new Error(`Error detectando metadata: ${err.message}`));
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!videoStream) {
          return reject(new Error('No se encontró stream de video'));
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name,
          fps: eval(videoStream.r_frame_rate) || 30,
          hasAudio: !!audioStream,
          size: metadata.format.size || buffer.length,
        });
      });
  });
}

function getBitrateForResolution(width, height) {
  const pixels = width * height;
  
  if (pixels <= 2500000) {
    return '2M';
  }
  if (pixels <= 4000000) {
    return '4M';
  }
  if (pixels <= 10000000) {
    return '8M';
  }
  return '12M';
}

function getVideoRotationFilter(rotation) {
  switch (rotation) {
    case 90:
      return 'transpose=1';
    case 180:
      return 'transpose=2,transpose=2';
    case 270:
      return 'transpose=2';
    case 0:
    default:
      return null;
  }
}

async function processVideoWithFFmpeg(masterBuffer, width, height, rotation = 0) {
  const fs = require('fs');
  const path = require('path');
  
  const tempDir = path.join(__dirname, '../../temp-videos');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.mp4`);

  try {
    fs.writeFileSync(inputPath, masterBuffer);

    await new Promise((resolve, reject) => {
      let settled = false;
      let ffmpegCommand;
      const timeoutMs = width >= 7680 || height >= 4320 ? 300000 : 120000;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (ffmpegCommand) ffmpegCommand.kill('SIGKILL');
        reject(new Error(`Timeout procesando video con FFmpeg (${timeoutMs / 1000}s)`));
      }, timeoutMs);

      const bitrate = getBitrateForResolution(width, height);
      const rotationFilter = getVideoRotationFilter(rotation);

      ffmpegCommand = ffmpeg(inputPath)
        .inputOptions([
          '-y',
          '-noautorotate'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .audioChannels(2)
        .audioFrequency(44100);

      if (rotationFilter) {
        // Cuando hay rotación, aplicar transpose y luego scale
        ffmpegCommand.videoFilters([
          rotationFilter,
          `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
        ]);
      } else {
        // Sin rotación, usar el método original
        ffmpegCommand
          .size(`${width}x${height}`)
          .autopad('black')
          .aspect('16:9');
      }

      ffmpegCommand
        .outputOptions([
          `-b:v ${bitrate}`,
          '-preset fast',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-profile:v baseline',
          '-level 3.0',
          '-strict experimental',
          '-metadata:s:v:0 rotate=0'
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log(`[FFmpeg] Iniciando: ${cmd}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[FFmpeg] Progreso: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .on('end', () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve();
        })
        .run();
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg no generó el archivo de salida');
    }

    const outputBuffer = fs.readFileSync(outputPath);

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    return outputBuffer;
  } catch (error) {
    if (fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch (e) {}
    }
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (e) {}
    }
    throw error;
  }
}

async function getOrCreateVideoRender(mediaId, width, height, rotation = 0) {
  let renderRecord = null;
  
  try {
    const existingRender = await MediaRender.findOne({
      where: { 
        media_id: mediaId, 
        width, 
        height,
        rotation,
      }
    });

    if (existingRender) {
      if (existingRender.status === 'ready') {
        console.log(`[VideoRender] Cache hit: render ${existingRender.id}`);
        return existingRender;
      }
      if (existingRender.status === 'processing') {
        console.log(`[VideoRender] Render ${existingRender.id} aún procesando`);
        return existingRender;
      }
    }

    const media = await Media.findByPk(mediaId);
    if (!media) {
      throw new Error(`Media ${mediaId} no encontrado`);
    }

    if (!media.mime_type || !media.mime_type.startsWith('video/')) {
      throw new Error(`Media ${mediaId} no es un video (mime: ${media.mime_type})`);
    }

    console.log(`[VideoRender] Procesando video ${mediaId}: ${width}x${height} rot${rotation}°`);

    renderRecord = existingRender;
    if (!renderRecord) {
      renderRecord = await MediaRender.create({
        media_id: mediaId,
        width,
        height,
        rotation,
        status: 'processing'
      });
    } else {
      await renderRecord.update({ status: 'processing', error_message: null });
    }

    const masterBuffer = await downloadVideoBuffer(media);

    const maxSizeMB = 100;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (masterBuffer.length > maxSizeBytes) {
      throw new Error(`Video muy grande: ${(masterBuffer.length / 1024 / 1024).toFixed(2)} MB (máximo ${maxSizeMB} MB)`);
    }

    const metadata = await detectVideoMetadata(masterBuffer);
    
    const maxDuration = 300;
    if (metadata.duration > maxDuration) {
      throw new Error(`Video muy largo: ${metadata.duration.toFixed(1)}s (máximo ${maxDuration}s)`);
    }

    const minDimension = 720;
    const maxDimension = 1280;
    const smallerSide = Math.min(metadata.width, metadata.height);
    const largerSide = Math.max(metadata.width, metadata.height);
    
    if (smallerSide < minDimension || largerSide < maxDimension) {
      throw new Error(`Video muy pequeño: ${metadata.width}x${metadata.height}. Mínimo requerido: ${minDimension}x${maxDimension} (horizontal) o ${maxDimension}x${minDimension} (vertical) para pantallas digitales`);
    }

    const outputBuffer = await processVideoWithFFmpeg(masterBuffer, width, height, rotation);

    const key = `renders/vid-${mediaId}-${width}x${height}-r${rotation}.mp4`;
    const cloudflareKey = await uploadBufferToR2(outputBuffer, key, 'video/mp4');

    await renderRecord.update({
      status: 'ready',
      url: getPublicUrl(cloudflareKey),
      cloudflare_key: cloudflareKey,
      mime_type: 'video/mp4',
      file_size_bytes: outputBuffer.length,
      error_message: null
    });

    const sizeKB = (outputBuffer.length / 1024).toFixed(2);
    console.log(`[VideoRender] Render completado: ${renderRecord.id} (${sizeKB} KB)`);

    return renderRecord;

  } catch (error) {
    console.error(`[VideoRender] Error procesando video ${mediaId}:`, error);

    if (renderRecord) {
      await renderRecord.update({
        status: 'error',
        error_message: error.message
      });
    }

    throw error;
  }
}

async function queueVideoRender({ mediaId, width, height, rotation }) {
  const { videoQueue } = require('../config/queue');
  const { normalizeResolution } = require('../utils/resolution');
  
  const normalized = normalizeResolution(width, height);
  
  let render = await MediaRender.findOne({
    where: { 
      media_id: mediaId, 
      width: normalized.width, 
      height: normalized.height,
      rotation: rotation || 0,
    }
  });

  if (!render) {
    render = await MediaRender.create({
      media_id: mediaId,
      width: normalized.width,
      height: normalized.height,
      rotation: rotation || 0,
      status: 'pending'
    });
  }

  if (render.status === 'ready') {
    return { render, queued: false, message: 'Render ya existe y está listo' };
  }

  await videoQueue.add('process-video', {
    mediaId,
    renderId: render.id,
    width: normalized.width,
    height: normalized.height,
    rotation: rotation || 0
  });

  console.log(`[VideoRender] Video ${mediaId} encolado para procesamiento (${normalized.width}x${normalized.height} rot${rotation}°)`);
  
  return { render, queued: true, message: 'Video encolado para procesamiento' };
}

async function getRenderStatus({ mediaId, width, height, rotation }) {
  const { normalizeResolution } = require('../utils/resolution');
  
  const normalized = normalizeResolution(width, height);
  
  const render = await MediaRender.findOne({
    where: { 
      media_id: mediaId, 
      width: normalized.width, 
      height: normalized.height,
      rotation: rotation || 0,
    }
  });

  if (!render) {
    return { status: 'not_found', url: null };
  }

  return { 
    status: render.status, 
    url: render.url,
    progress: render.progress || 0
  };
}

module.exports = {
  getOrCreateVideoRender,
  detectVideoMetadata,
  queueVideoRender,
  getRenderStatus,
};
