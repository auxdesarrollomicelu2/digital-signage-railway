const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const auth = require('../middleware/auth');
const {
  listMedia,
  getMedia,
  uploadMedia,
  deleteMedia,
  getMediaStats,
  rotateMedia,
  getRenderStatus,
} = require('../controllers/media.controller');

const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif']);
const VIDEO_EXT = new Set([
  '.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv', '.ogv', '.ogg',
  '.mpeg', '.mpg', '.wmv', '.3gp', '.3g2', '.flv', '.f4v', '.ts', '.m2ts',
  '.qt', '.asf', '.vob',
]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
      return;
    }
    if (mime.startsWith('video/')) {
      cb(null, true);
      return;
    }
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten imágenes y videos'));
  },
});

// Todas las rutas requieren autenticación
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Gestión de archivos multimedia (multi-tenant)
 */

/**
 * @swagger
 * /api/media:
 *   get:
 *     summary: Listar archivos media
 *     description: |
 *       - **Owner**: Ve solo los archivos de su empresa
 *       - **Super Admin**: Ve todos los archivos o puede filtrar por empresa
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre de archivo
 *       - in: query
 *         name: mime_type
 *         schema:
 *           type: string
 *           enum: [image, video]
 *         description: Filtrar por tipo de archivo
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         description: Filtrar por empresa (solo super admin)
 *     responses:
 *       200:
 *         description: Lista de archivos media
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Media'
 *       401:
 *         description: No autenticado
 */
router.get('/', listMedia);

/**
 * @swagger
 * /api/media/stats:
 *   get:
 *     summary: Obtener estadísticas de archivos media
 *     description: Devuelve contadores y tamaño total de archivos
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         description: Filtrar por empresa (solo super admin)
 *     responses:
 *       200:
 *         description: Estadísticas de media
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalFiles:
 *                   type: integer
 *                   example: 25
 *                 imageFiles:
 *                   type: integer
 *                   example: 15
 *                 videoFiles:
 *                   type: integer
 *                   example: 10
 *                 otherFiles:
 *                   type: integer
 *                   example: 0
 *                 totalSizeBytes:
 *                   type: integer
 *                   example: 52428800
 *                 totalSizeMB:
 *                   type: string
 *                   example: "50.00"
 *                 totalSizeGB:
 *                   type: string
 *                   example: "0.05"
 */
router.get('/stats', getMediaStats);

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Obtener un archivo media por ID
 *     description: Solo puede ver archivos de su propia empresa (o todos si es super admin)
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del archivo media
 *     responses:
 *       200:
 *         description: Datos del archivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       403:
 *         description: No tienes permiso para ver este archivo
 *       404:
 *         description: Archivo no encontrado
 */
router.get('/:id', getMedia);

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Subir archivos multimedia
 *     description: |
 *       - **Owner**: Sube archivos para su propia empresa
 *       - **Super Admin**: Debe especificar company_id
 *       - Formatos: JPG, PNG, GIF, WEBP, MP4, WEBM, MOV, etc.
 *       - Tamaño máximo: 50MB por archivo
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Archivos a subir (máximo 20)
 *               company_id:
 *                 type: integer
 *                 description: ID de la empresa (solo para super admin)
 *                 example: 2
 *     responses:
 *       201:
 *         description: Archivos subidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 3 archivo(s) subido(s) exitosamente
 *                 media:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *       400:
 *         description: No se subieron archivos o formato inválido
 */
router.post('/upload', upload.array('files', 20), uploadMedia);

/**
 * @swagger
 * /api/media/{id}/rotate:
 *   post:
 *     summary: Encolar procesamiento de rotación de video
 *     description: Encola un job de BullMQ para procesar el video con la rotación especificada
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del video
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rotation
 *               - width
 *               - height
 *             properties:
 *               rotation:
 *                 type: integer
 *                 enum: [0, 90, 180, 270]
 *                 example: 90
 *               width:
 *                 type: integer
 *                 example: 1920
 *               height:
 *                 type: integer
 *                 example: 1080
 *     responses:
 *       200:
 *         description: Video encolado para procesamiento
 *       400:
 *         description: Solo se pueden rotar videos
 *       404:
 *         description: Media no encontrado
 */
router.post('/:id/rotate', rotateMedia);

/**
 * @swagger
 * /api/media/{id}/render-status:
 *   get:
 *     summary: Consultar estado de procesamiento de un render
 *     description: Devuelve el estado actual de un MediaRender específico
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del media
 *       - in: query
 *         name: rotation
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [0, 90, 180, 270]
 *       - in: query
 *         name: width
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: height
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado del render
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, ready, failed]
 *                 url:
 *                   type: string
 *                   nullable: true
 *       404:
 *         description: Render no encontrado
 */
router.get('/:id/render-status', getRenderStatus);

/**
 * @swagger
 * /api/media/{id}:
 *   put:
 *     summary: Renombrar un archivo media
 *     description: Solo puede renombrar archivos de su propia empresa (o todos si es super admin).
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del archivo media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - original_name
 *             properties:
 *               original_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Archivo renombrado exitosamente
 *       403:
 *         description: No tienes permiso para modificar este archivo
 *       404:
 *         description: Archivo no encontrado
 */
// router.put('/:id', renameMedia); // Comentado: función no implementada

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Eliminar un archivo media
 *     description: |
 *       Solo puede eliminar archivos de su propia empresa (o todos si es super admin).
 *       No se puede eliminar si está siendo usado en alguna playlist.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del archivo media
 *     responses:
 *       200:
 *         description: Archivo eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: No se puede eliminar porque está en uso
 *       403:
 *         description: No tienes permiso para eliminar este archivo
 *       404:
 *         description: Archivo no encontrado
 */
router.delete('/:id', deleteMedia);

module.exports = router;
