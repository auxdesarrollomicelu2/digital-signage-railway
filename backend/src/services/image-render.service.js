/**
 * IMAGE RENDER SERVICE
 * 
 * Servicio para optimización de imágenes con Sharp
 * 
 * Responsabilidades:
 * - Descargar imagen master desde R2
 * - Procesar con Sharp (rotar, redimensionar, comprimir)
 * - Mantener formato original (JPG→JPG, PNG→PNG)
 * - Subir render optimizado a R2 (carpeta renders/)
 * - Cachear en MediaRenders para evitar reprocesar
 * 
 * Estrategia:
 * - fit: 'contain' → Imagen completa visible sin recortar
 * - Calidad alta → JPG 85%, PNG compressionLevel 9
 * - Rotación → 0°, 90°, 180°, 270°
 */

const sharp = require('sharp');
const { uploadBufferToR2, getPublicUrl } = require('./cloudflare');
const { MediaRender, Media } = require('../models');

/**
 * Descargar imagen master desde URL (R2 o local)
 * @param {Object} media - Objeto Media con url
 * @returns {Promise<Buffer>} - Buffer de la imagen
 */
async function downloadImageBuffer(media) {
  try {
    const response = await fetch(media.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`No se pudo descargar imagen master: ${error.message}`);
  }
}

/**
 * Detectar formato original y aplicar compresión apropiada
 * @param {Object} pipeline - Pipeline de Sharp
 * @param {string} format - Formato original ('jpeg', 'png', 'webp', etc)
 * @returns {Object} - Pipeline con formato aplicado
 */
function applyFormatCompression(pipeline, format) {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return pipeline.jpeg({ quality: 85, mozjpeg: true });
    
    case 'png':
      return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    
    case 'webp':
      return pipeline.webp({ quality: 85 });
    
    default:
      // Fallback a JPEG si formato desconocido
      console.warn(`[ImageRender] Formato desconocido: ${format}, usando JPEG`);
      return pipeline.jpeg({ quality: 85, mozjpeg: true });
  }
}

/**
 * Procesar imagen con Sharp
 * - Detecta formato original
 * - Rota según rotation
 * - Redimensiona a width x height (fit: contain)
 * - Comprime manteniendo formato original
 * 
 * @param {Buffer} masterBuffer - Buffer de imagen original
 * @param {number} width - Ancho objetivo
 * @param {number} height - Alto objetivo
 * @param {number} rotation - Rotación (0, 90, 180, 270)
 * @returns {Promise<{buffer: Buffer, format: string, mimeType: string}>}
 */
async function processImageWithSharp(masterBuffer, width, height, rotation) {
  try {
    const maxSizeMB = 20;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (masterBuffer.length > maxSizeBytes) {
      throw new Error(`Imagen muy grande: ${(masterBuffer.length / 1024 / 1024).toFixed(2)} MB (máximo ${maxSizeMB} MB)`);
    }

    const metadata = await sharp(masterBuffer).metadata();
    const originalFormat = metadata.format;
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Imagen corrupta: dimensiones inválidas');
    }

    const minDimension = 1080;
    const maxDimension = 1920;
    const smallerSide = Math.min(metadata.width, metadata.height);
    const largerSide = Math.max(metadata.width, metadata.height);
    
    if (smallerSide < minDimension || largerSide < maxDimension) {
      throw new Error(`Imagen muy pequeña: ${metadata.width}x${metadata.height}. Mínimo requerido: ${maxDimension}x${minDimension} para pantallas digitales`);
    }

    let pipeline = sharp(masterBuffer);

    if (rotation !== 0) {
      pipeline = pipeline.rotate(rotation);
    }

    const background = originalFormat === 'png'
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: 0, g: 0, b: 0, alpha: 1 };

    pipeline = pipeline.resize(width, height, {
      fit: 'contain',
      background: background,
      withoutEnlargement: true,
      position: 'center'
    });

    pipeline = applyFormatCompression(pipeline, originalFormat);

    const outputBuffer = await pipeline.toBuffer();

    const mimeTypeMap = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp'
    };

    const sizeReduction = ((1 - (outputBuffer.length / masterBuffer.length)) * 100).toFixed(1);
    console.log(`[ImageRender] ${metadata.width}x${metadata.height} → ${width}x${height}, reducción: ${sizeReduction}%`);

    return {
      buffer: outputBuffer,
      format: originalFormat,
      mimeType: mimeTypeMap[originalFormat] || 'image/jpeg'
    };
  } catch (error) {
    throw new Error(`Error procesando imagen con Sharp: ${error.message}`);
  }
}

/**
 * Obtener extensión de archivo según formato
 * @param {string} format - Formato Sharp ('jpeg', 'png', etc)
 * @returns {string} - Extensión con punto ('.jpg', '.png')
 */
function getFileExtension(format) {
  const extMap = {
    jpeg: '.jpg',
    jpg: '.jpg',
    png: '.png',
    webp: '.webp'
  };
  return extMap[format] || '.jpg';
}

/**
 * Obtener o crear render de imagen optimizado
 * - Busca en MediaRenders si ya existe (caché)
 * - Si no existe, procesa con Sharp y sube a R2
 * - Retorna MediaRender con status='ready' y URL
 * 
 * @param {number} mediaId - ID del Media master
 * @param {number} width - Ancho de pantalla objetivo
 * @param {number} height - Alto de pantalla objetivo
 * @param {number} rotation - Rotación (0, 90, 180, 270)
 * @returns {Promise<Object>} - MediaRender con url del optimizado
 */
async function getOrCreateImageRender(mediaId, width, height, rotation) {
  try {
    // 1. Buscar render existente en caché
    const existingRender = await MediaRender.findOne({
      where: { media_id: mediaId, width, height, rotation }
    });

    if (existingRender) {
      if (existingRender.status === 'ready') {
        console.log(`[ImageRender] Cache hit: render ${existingRender.id}`);
        return existingRender;
      }
      if (existingRender.status === 'error') {
        console.log(`[ImageRender] Render anterior fallo, reintentando...`);
        // Continuar para reintentar
      }
    }

    // 2. Obtener media master
    const media = await Media.findByPk(mediaId);
    if (!media) {
      throw new Error(`Media ${mediaId} no encontrado`);
    }

    // 3. Validar que sea imagen
    if (!media.mime_type || !media.mime_type.startsWith('image/')) {
      throw new Error(`Media ${mediaId} no es una imagen (mime: ${media.mime_type})`);
    }

    console.log(`[ImageRender] Procesando imagen ${mediaId}: ${width}x${height} rot${rotation}°`);

    // 4. Crear o actualizar registro en estado 'processing'
    let renderRecord = existingRender;
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

    // 5. Descargar master
    const masterBuffer = await downloadImageBuffer(media);

    // 6. Procesar con Sharp
    const { buffer, format, mimeType } = await processImageWithSharp(
      masterBuffer, 
      width, 
      height, 
      rotation
    );

    // 7. Construir key para R2
    const ext = getFileExtension(format);
    const key = `renders/img-${mediaId}-${width}x${height}-r${rotation}${ext}`;

    // 8. Subir a R2
    const cloudflareKey = await uploadBufferToR2(buffer, key, mimeType);

    // 9. Actualizar registro con resultado exitoso
    await renderRecord.update({
      status: 'ready',
      url: getPublicUrl(cloudflareKey),
      cloudflare_key: cloudflareKey,
      mime_type: mimeType,
      file_size_bytes: buffer.length,
      error_message: null
    });

    const sizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`[ImageRender] Render completado: ${renderRecord.id} (${sizeKB} KB)`);

    return renderRecord;

  } catch (error) {
    console.error(`[ImageRender] Error procesando imagen ${mediaId}:`, error);

    // Guardar error en base de datos
    if (existingRender || typeof renderRecord !== 'undefined') {
      const record = existingRender || renderRecord;
      await record.update({
        status: 'error',
        error_message: error.message
      });
    }

    // Re-lanzar error para que assignPlaylist lo maneje
    throw error;
  }
}

module.exports = {
  getOrCreateImageRender
};
