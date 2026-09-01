const { logAudit } = require('../utils/audit');
const mediaService = require('../services/media.service');
const videoRenderService = require('../services/video-render.service');

const listMedia = async (req, res) => {
  try {
    const media = await mediaService.listMedia(req.query, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    res.json(media);
  } catch (err) {
    console.error('Error al listar media:', err);
    res.status(500).json({ error: err.message });
  }
};

const getMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await mediaService.getMediaById(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    if (!media) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.json(media);
  } catch (err) {
    console.error('Error al obtener media:', err);
    const statusCode = err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const uploadMedia = async (req, res) => {
  try {
    const result = await mediaService.uploadMediaFiles(req.files, req.body, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    for (const media of result.media) {
      await logAudit({
        userId: req.user.companyId,
        userName: req.user.username,
        action: 'create',
        resourceType: 'Media',
        resourceId: media.id,
        resourceName: media.original_name,
        oldValues: null,
        newValues: {
          filename: media.filename,
          original_name: media.original_name,
          size: media.size,
          mime_type: media.mime_type
        },
        companyId: result.companyId
      });
    }

    const response = {
      success: true,
      message: `${result.media.length} archivo(s) subido(s) exitosamente`,
      media: result.media,
      cloudflare_enabled: result.r2Enabled,
    };

    if (result.warnings.length > 0) {
      response.warnings = result.warnings;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('Error al subir media:', err);
    const statusCode = err.message.includes('No se subieron') || err.message.includes('especificar') ? 400 :
                       err.message.includes('no encontrada') ? 404 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await mediaService.deleteMediaFile(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'delete',
      resourceType: 'Media',
      resourceId: result.mediaData.id,
      resourceName: result.mediaData.original_name,
      oldValues: {
        filename: result.mediaData.filename,
        original_name: result.mediaData.original_name,
        size: result.mediaData.size,
        cloudflare_key: result.mediaData.cloudflare_key
      },
      newValues: null,
      companyId: result.mediaData.company_id
    });

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente',
      deletionLog: result.deletionLog,
    });
  } catch (err) {
    console.error('Error al eliminar media:', err);
    const statusCode = err.message.includes('no encontrado') ? 404 :
                       err.message.includes('permiso') ? 403 :
                       err.message.includes('siendo usado') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const getMediaStats = async (req, res) => {
  try {
    const stats = await mediaService.getMediaStatistics(req.query, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    res.json(stats);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: err.message });
  }
};

const rotateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { rotation, width, height } = req.body;
    
    if (![0, 90, 180, 270].includes(Number(rotation))) {
      return res.status(400).json({ error: 'Rotación inválida. Debe ser 0, 90, 180 o 270' });
    }
    
    if (!width || !height) {
      return res.status(400).json({ error: 'Se requieren width y height' });
    }
    
    const media = await mediaService.getMediaById(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media no encontrado' });
    }
    
    const isVideo = media.mime_type?.startsWith('video/');
    if (!isVideo) {
      return res.status(400).json({ error: 'Solo se pueden rotar videos' });
    }
    
    await videoRenderService.queueVideoRender({
      mediaId: Number(id),
      width: Number(width),
      height: Number(height),
      rotation: Number(rotation),
    });
    
    res.json({ 
      success: true, 
      message: 'Video encolado para procesamiento',
      mediaId: Number(id),
      rotation: Number(rotation),
      resolution: `${width}x${height}`
    });
  } catch (err) {
    console.error('Error al rotar media:', err);
    const statusCode = err.message.includes('no encontrado') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const getRenderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { rotation, width, height } = req.query;
    
    const media = await mediaService.getMediaById(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media no encontrado' });
    }
    
    const status = await videoRenderService.getRenderStatus({
      mediaId: Number(id),
      width: Number(width),
      height: Number(height),
      rotation: Number(rotation),
    });
    
    res.json(status);
  } catch (err) {
    console.error('Error al consultar estado de render:', err);
    const statusCode = err.message.includes('no encontrado') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

module.exports = {
  listMedia,
  getMedia,
  uploadMedia,
  deleteMedia,
  getMediaStats,
  rotateMedia,
  getRenderStatus,
};
