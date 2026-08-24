const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Media, Company, ScreenMedia } = require('../models');
const { Op } = require('sequelize');
const { uploadToR2, deleteFromR2, getPublicUrl, isR2Configured } = require('./cloudflare');

const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads');

const listMedia = async (filters, userPermissions) => {
  const { search, mime_type, company_id } = filters;
  const { role, companyId } = userPermissions;

  const where = {};

  if (role === 'super_admin') {
    if (company_id) {
      where.company_id = company_id;
    }
  } else {
    where.company_id = companyId;
  }

  if (search) {
    where.original_name = { [Op.iLike]: `%${search}%` };
  }

  if (mime_type) {
    if (mime_type === 'image') {
      where.mime_type = { [Op.like]: 'image/%' };
    } else if (mime_type === 'video') {
      where.mime_type = { [Op.like]: 'video/%' };
    } else {
      where.mime_type = { [Op.like]: `${mime_type}%` };
    }
  }

  const media = await Media.findAll({
    where,
    include: [
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return media;
};

const getMediaById = async (mediaId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const media = await Media.findByPk(mediaId, {
    include: [
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username', 'email'],
      },
    ],
  });

  if (!media) {
    return null;
  }

  if (role !== 'super_admin' && media.company_id !== companyId) {
    throw new Error('No tienes permiso para ver este archivo');
  }

  return media;
};

const uploadMediaFiles = async (files, uploadData, userPermissions) => {
  const { role, companyId } = userPermissions;
  const { company_id } = uploadData;

  if (!files || files.length === 0) {
    throw new Error('No se subieron archivos');
  }

  let finalCompanyId;
  let company;

  if (role === 'super_admin') {
    if (company_id) {
      company = await Company.findByPk(company_id);
      if (!company) {
        throw new Error('Empresa no encontrada');
      }
      finalCompanyId = company_id;
    } else {
      finalCompanyId = companyId;
      company = await Company.findByPk(companyId);
    }
  } else {
    finalCompanyId = companyId;
    company = await Company.findByPk(companyId);
    if (!company) {
      throw new Error('Empresa no encontrada');
    }
  }

  const r2Enabled = isR2Configured();
  if (!r2Enabled) {
    console.warn('⚠️ Cloudflare R2 no está configurado. Usando solo almacenamiento local.');
  }

  const mediaItems = [];
  const uploadErrors = [];

  for (const file of files) {
    try {
      if (file.mimetype && file.mimetype.startsWith('image/')) {
        const filePath = path.join(uploadDir, file.filename);
        const metadata = await sharp(filePath).metadata();
        
        if (!metadata.width || !metadata.height) {
          fs.unlinkSync(filePath);
          uploadErrors.push({
            filename: file.originalname,
            error: 'Imagen corrupta o formato no válido',
          });
          continue;
        }
        
        const minDimension = 1080;
        const maxDimension = 1920;
        const smallerSide = Math.min(metadata.width, metadata.height);
        const largerSide = Math.max(metadata.width, metadata.height);
        
        if (smallerSide < minDimension || largerSide < maxDimension) {
          fs.unlinkSync(filePath);
          uploadErrors.push({
            filename: file.originalname,
            error: `Imagen muy pequeña: ${metadata.width}x${metadata.height}. Mínimo requerido: ${maxDimension}x${minDimension} para pantallas digitales`,
          });
          continue;
        }
      }

      if (file.mimetype && file.mimetype.startsWith('video/')) {
        const maxVideoSizeMB = 100;
        const maxVideoSizeBytes = maxVideoSizeMB * 1024 * 1024;
        
        if (file.size > maxVideoSizeBytes) {
          fs.unlinkSync(path.join(uploadDir, file.filename));
          uploadErrors.push({
            filename: file.originalname,
            error: `Video muy grande: ${(file.size / 1024 / 1024).toFixed(2)} MB (máximo ${maxVideoSizeMB} MB)`,
          });
          continue;
        }

        const { detectVideoMetadata } = require('./video-render.service');
        const filePath = path.join(uploadDir, file.filename);
        const buffer = fs.readFileSync(filePath);
        
        try {
          const metadata = await detectVideoMetadata(buffer);
          
          const maxDuration = 120;
          if (metadata.duration > maxDuration) {
            fs.unlinkSync(filePath);
            uploadErrors.push({
              filename: file.originalname,
              error: `Video muy largo: ${metadata.duration.toFixed(1)}s (máximo ${maxDuration}s = 2 minutos)`,
            });
            continue;
          }

          const minDimension = 720;
          const maxDimension = 1280;
          const smallerSide = Math.min(metadata.width, metadata.height);
          const largerSide = Math.max(metadata.width, metadata.height);
          
          if (smallerSide < minDimension || largerSide < maxDimension) {
            fs.unlinkSync(filePath);
            uploadErrors.push({
              filename: file.originalname,
              error: `Video muy pequeño: ${metadata.width}x${metadata.height}. Mínimo requerido: ${maxDimension}x${minDimension} para pantallas digitales`,
            });
            continue;
          }

          if (!metadata.codec || metadata.codec === 'unknown') {
            fs.unlinkSync(filePath);
            uploadErrors.push({
              filename: file.originalname,
              error: 'Video corrupto o formato no soportado. No se pudo detectar el codec de video.',
            });
            continue;
          }

          const supportedCodecs = ['h264', 'hevc', 'h265', 'vp8', 'vp9', 'mpeg4', 'prores'];
          if (!supportedCodecs.includes(metadata.codec.toLowerCase())) {
            uploadErrors.push({
              filename: file.originalname,
              warning: `Codec de video no común: ${metadata.codec}. Puede haber problemas de compatibilidad.`,
            });
          }
        } catch (metadataError) {
          fs.unlinkSync(filePath);
          uploadErrors.push({
            filename: file.originalname,
            error: `Error validando video: ${metadataError.message}`,
          });
          continue;
        }
      }

      let cloudflareKey = null;
      let publicUrl = `/uploads/${file.filename}`;

      if (r2Enabled) {
        try {
          cloudflareKey = await uploadToR2(file, finalCompanyId, company.name);
          publicUrl = getPublicUrl(cloudflareKey);
          console.log(`✅ [R2] Archivo subido: ${file.originalname} → ${cloudflareKey}`);
        } catch (r2Error) {
          console.error(`❌ [R2] Error al subir ${file.originalname}:`, r2Error.message);
          uploadErrors.push({
            filename: file.originalname,
            error: 'No se pudo subir a R2, usando almacenamiento local',
          });
        }
      }

      let videoMetadata = null;
      if (file.mimetype && file.mimetype.startsWith('video/')) {
        try {
          const { detectVideoMetadata } = require('./video-render.service');
          const filePath = path.join(uploadDir, file.filename);
          const buffer = fs.readFileSync(filePath);
          videoMetadata = await detectVideoMetadata(buffer);
        } catch (err) {
          console.warn(`⚠️ No se pudo detectar metadata de video: ${file.originalname}`);
        }
      }

      let imageMetadata = null;
      if (file.mimetype && file.mimetype.startsWith('image/')) {
        try {
          const filePath = path.join(uploadDir, file.filename);
          imageMetadata = await sharp(filePath).metadata();
        } catch (err) {
          console.warn(`⚠️ No se pudo detectar metadata de imagen: ${file.originalname}`);
        }
      }

      const media = await Media.create({
        filename: file.filename,
        original_name: file.originalname,
        url: publicUrl,
        cloudflare_key: cloudflareKey,
        mime_type: file.mimetype,
        size: file.size,
        width: videoMetadata?.width || imageMetadata?.width || null,
        height: videoMetadata?.height || imageMetadata?.height || null,
        duration: videoMetadata?.duration || null,
        company_id: finalCompanyId,
      });

      mediaItems.push(media);
    } catch (dbError) {
      console.error(`❌ [DB] Error al guardar ${file.originalname}:`, dbError.message);
      uploadErrors.push({
        filename: file.originalname,
        error: 'Error al guardar en base de datos',
      });
    }
  }

  const mediaWithRelations = await Media.findAll({
    where: {
      id: mediaItems.map((m) => m.id),
    },
    include: [
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username'],
      },
    ],
  });

  return {
    media: mediaWithRelations,
    warnings: uploadErrors,
    r2Enabled,
    companyId: finalCompanyId,
  };
};

const deleteMediaFile = async (mediaId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const media = await Media.findByPk(mediaId);

  if (!media) {
    throw new Error('Archivo no encontrado');
  }

  if (role !== 'super_admin' && media.company_id !== companyId) {
    throw new Error('No tienes permiso para eliminar este archivo');
  }

  const inUse = await ScreenMedia.count({
    where: { media_id: mediaId },
  });

  if (inUse > 0) {
    throw new Error(`No se puede eliminar el archivo porque está siendo usado en ${inUse} playlist(s). Elimínalo de las playlists primero.`);
  }

  const deletionLog = {
    cloudflare: false,
    local: false,
    renders: { deleted: 0, failed: 0 }
  };

  if (media.cloudflare_key) {
    const r2Deleted = await deleteFromR2(media.cloudflare_key);
    deletionLog.cloudflare = r2Deleted;
    if (r2Deleted) {
      console.log(`✅ [R2] Archivo eliminado: ${media.cloudflare_key}`);
    } else {
      console.warn(`⚠️ [R2] No se pudo eliminar: ${media.cloudflare_key}`);
    }
  }

  const { MediaRender } = require('../models');
  const renders = await MediaRender.findAll({
    where: { media_id: mediaId }
  });

  for (const render of renders) {
    if (render.cloudflare_key) {
      const renderDeleted = await deleteFromR2(render.cloudflare_key);
      if (renderDeleted) {
        deletionLog.renders.deleted++;
        console.log(`✅ [R2] Render eliminado: ${render.cloudflare_key}`);
      } else {
        deletionLog.renders.failed++;
        console.warn(`⚠️ [R2] No se pudo eliminar render: ${render.cloudflare_key}`);
      }
    }
  }

  await MediaRender.destroy({
    where: { media_id: mediaId }
  });

  console.log(`✅ [DB] ${renders.length} render(s) eliminados de base de datos`);

  const filePath = path.join(uploadDir, media.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      deletionLog.local = true;
      console.log(`✅ [Local] Archivo eliminado: ${media.filename}`);
    } catch (fileErr) {
      console.error('❌ [Local] Error al eliminar archivo físico:', fileErr);
      deletionLog.local = false;
    }
  } else {
    console.warn(`⚠️ [Local] Archivo no existe: ${media.filename}`);
  }

  const mediaData = {
    id: media.id,
    original_name: media.original_name,
    filename: media.filename,
    size: media.size,
    cloudflare_key: media.cloudflare_key,
    company_id: media.company_id,
  };

  await media.destroy();
  console.log(`✅ [DB] Registro eliminado: ${media.original_name}`);

  return {
    mediaData,
    deletionLog,
  };
};

const getMediaStatistics = async (filters, userPermissions) => {
  const { company_id } = filters;
  const { role, companyId } = userPermissions;

  const where = {};

  if (role === 'super_admin') {
    if (company_id) {
      where.company_id = company_id;
    }
  } else {
    where.company_id = companyId;
  }

  const totalFiles = await Media.count({ where });

  const imageFiles = await Media.count({
    where: {
      ...where,
      mime_type: { [Op.like]: 'image/%' },
    },
  });

  const videoFiles = await Media.count({
    where: {
      ...where,
      mime_type: { [Op.like]: 'video/%' },
    },
  });

  const totalSize = await Media.sum('size', { where }) || 0;

  return {
    totalFiles,
    imageFiles,
    videoFiles,
    otherFiles: totalFiles - imageFiles - videoFiles,
    totalSizeBytes: totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
  };
};

module.exports = {
  listMedia,
  getMediaById,
  uploadMediaFiles,
  deleteMediaFile,
  getMediaStatistics,
};
