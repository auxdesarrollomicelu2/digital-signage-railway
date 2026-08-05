const path = require('path');
const fs = require('fs');
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

      const media = await Media.create({
        filename: file.filename,
        original_name: file.originalname,
        url: publicUrl,
        cloudflare_key: cloudflareKey,
        mime_type: file.mimetype,
        size: file.size,
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

const renameMediaFile = async (mediaId, newName, userPermissions) => {
  const { role, companyId } = userPermissions;

  const media = await Media.findByPk(mediaId);

  if (!media) {
    throw new Error('Archivo no encontrado');
  }

  if (role !== 'super_admin' && media.company_id !== companyId) {
    throw new Error('No tienes permiso para modificar este archivo');
  }

  const trimmedName = String(newName || '').trim();
  if (!trimmedName) {
    throw new Error('El nombre no puede estar vacío');
  }

  media.original_name = trimmedName;
  await media.save();

  return media;
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
  renameMediaFile,
  deleteMediaFile,
  getMediaStatistics,
};
