const { logAudit } = require('../utils/audit');
const apkService = require('../services/apk.service');

/**
 * Upload APK file (super admin only)
 * POST /api/apk/upload
 */
const uploadApk = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo APK' });
    }

    const result = await apkService.uploadApkFile(req.file, req.body, {
      role: req.user.role,
      companyId: req.user.companyId,
      username: req.user.username,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'create',
      resourceType: 'ApkVersion',
      resourceId: result.version.id,
      resourceName: `v${result.version.version_name}`,
      oldValues: null,
      newValues: {
        version_code: result.version.version_code,
        version_name: result.version.version_name,
        r2_key: result.version.r2_key,
        sha256: result.version.sha256,
        file_size_bytes: result.version.file_size_bytes,
      },
      companyId: req.user.companyId,
    });

    res.status(201).json({
      ok: true,
      message: 'APK subido exitosamente',
      version: result.version,
    });
  } catch (err) {
    console.error('[APK Controller] Error al subir APK:', err);
    const statusCode = err.message.includes('versión ya existe') ? 400 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * Download APK file (redirects to signed R2 URL)
 * GET /api/apk/download/:id
 */
const downloadApk = async (req, res) => {
  try {
    const { id } = req.params;
    const signedUrl = await apkService.getDownloadUrl(id);
    
    if (!signedUrl) {
      return res.status(404).json({ error: 'APK no encontrado o inactivo' });
    }

    res.redirect(signedUrl);
  } catch (err) {
    console.error('[APK Controller] Error al descargar APK:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get latest active APK version
 * GET /api/apk/latest
 */
const getLatestVersion = async (req, res) => {
  try {
    const latest = await apkService.getLatestActiveVersion();

    if (!latest) {
      return res.status(404).json({ error: 'No hay versiones disponibles' });
    }

    res.json({
      version_code: latest.version_code,
      version_name: latest.version_name,
      download_url: `${process.env.BACKEND_URL}/api/apk/download/${latest.id}`,
      sha256: latest.sha256,
      file_size_bytes: latest.file_size_bytes,
      release_notes: latest.release_notes,
    });
  } catch (err) {
    console.error('[APK Controller] Error al obtener última versión:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * List all APK versions (super admin only)
 * GET /api/apk
 */
const listVersions = async (req, res) => {
  try {
    const versions = await apkService.listVersions({
      role: req.user.role,
    });

    res.json(versions);
  } catch (err) {
    console.error('[APK Controller] Error al listar versiones:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  uploadApk,
  downloadApk,
  getLatestVersion,
  listVersions,
};
