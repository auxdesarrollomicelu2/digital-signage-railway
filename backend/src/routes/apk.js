const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const auth = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');
const {
  uploadApk,
  downloadApk,
  getLatestVersion,
  listVersions,
} = require('../controllers/apk.controller');

// Configure multer for APK upload
const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    
    if (ext === '.apk' || mime === 'application/vnd.android.package-archive') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos APK'));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: APK
 *   description: Gestión de versiones de APK (solo super admin)
 */

/**
 * @swagger
 * /api/apk/latest:
 *   get:
 *     summary: Obtener la última versión activa de APK
 *     tags: [APK]
 *     responses:
 *       200:
 *         description: Información de la última versión
 *       404:
 *         description: No hay versiones disponibles
 */
router.get('/latest', getLatestVersion);

/**
 * @swagger
 * /api/apk/download/{id}:
 *   get:
 *     summary: Descargar APK
 *     tags: [APK]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirección a URL de descarga
 *       404:
 *         description: APK no encontrado
 */
router.get('/download/:id', downloadApk);

/**
 * @swagger
 * /api/apk:
 *   get:
 *     summary: Listar todas las versiones de APK
 *     tags: [APK]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de versiones
 *       403:
 *         description: No autorizado
 */
router.get('/', auth, isSuperAdmin, listVersions);

/**
 * @swagger
 * /api/apk/upload:
 *   post:
 *     summary: Subir nueva versión de APK
 *     tags: [APK]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - apk
 *               - version_code
 *               - version_name
 *             properties:
 *               apk:
 *                 type: string
 *                 format: binary
 *               version_code:
 *                 type: integer
 *                 example: 4
 *               version_name:
 *                 type: string
 *                 example: "4.0.0"
 *               release_notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: APK subido exitosamente
 *       400:
 *         description: Error en la subida
 */
router.post('/upload', auth, isSuperAdmin, upload.single('apk'), uploadApk);

module.exports = router;
