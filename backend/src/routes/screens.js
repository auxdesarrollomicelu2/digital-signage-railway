const router = require('express').Router();
const auth = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');
const {
  getPlaylistByDevice,
  previewDeviceId,
  listScreens,
  getScreen,
  createScreen,
  updateScreen,
  deleteScreen,
  assignPlaylist,
  sendCommand,
  sendUpdateCommand,
  sendUpdateCommandToAll,
} = require('../controllers/screens.controller');

/**
 * @swagger
 * tags:
 *   name: Screens
 *   description: Gestión de pantallas digitales (multi-tenant + MQTT)
 */

/**
 * @swagger
 * /api/screens/by-device/{deviceId}/playlist:
 *   get:
 *     summary: Obtener playlist de una pantalla por device_id (PÚBLICO)
 *     description: Endpoint público usado por el player para sincronizar su playlist. No requiere autenticación.
 *     tags: [Screens]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del dispositivo
 *         example: SCREEN-001
 *     responses:
 *       200:
 *         description: Playlist de la pantalla
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       url:
 *                         type: string
 *                         example: /uploads/video.mp4
 *                       filename:
 *                         type: string
 *                         example: video_promocional.mp4
 *                       mime_type:
 *                         type: string
 *                         example: video/mp4
 *                       size:
 *                         type: integer
 *                         example: 10485760
 *                       duration:
 *                         type: integer
 *                         example: 10
 *                       position:
 *                         type: integer
 *                         example: 0
 *       404:
 *         description: Pantalla no encontrada
 */
router.get('/by-device/:deviceId/playlist', getPlaylistByDevice);

// Rutas protegidas (requieren autenticación)
router.use(auth);

/**
 * @swagger
 * /api/screens/preview-device-id:
 *   get:
 *     summary: Obtener preview del próximo device_id para la empresa del usuario
 *     description: Retorna el device_id que se generaría automáticamente para una nueva pantalla
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Device ID preview generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 device_id:
 *                   type: string
 *                   example: C1-SCREEN-003
 */
router.get('/preview-device-id', previewDeviceId);

/**
 * @swagger
 * /api/screens:
 *   get:
 *     summary: Listar pantallas
 *     description: |
 *       - **Owner**: Ve solo pantallas de sus sedes
 *       - **Super Admin**: Ve todas las pantallas
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o device_id
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline]
 *         description: Filtrar por estado
 *       - in: query
 *         name: venue_id
 *         schema:
 *           type: integer
 *         description: Filtrar por sede
 *     responses:
 *       200:
 *         description: Lista de pantallas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Screen'
 */
router.get('/', listScreens);

/**
 * @swagger
 * /api/screens/{id}:
 *   get:
 *     summary: Obtener una pantalla por ID
 *     description: Incluye la playlist actual de la pantalla
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la pantalla
 *     responses:
 *       200:
 *         description: Datos de la pantalla con playlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Screen'
 *       403:
 *         description: No tienes permiso para ver esta pantalla
 *       404:
 *         description: Pantalla no encontrada
 */
router.get('/:id', getScreen);

/**
 * @swagger
 * /api/screens:
 *   post:
 *     summary: Crear una nueva pantalla
 *     description: |
 *       Crea una pantalla en una sede. Debe tener permiso sobre la sede.
 *       El device_id debe ser único en todo el sistema.
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - device_id
 *               - venue_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pantalla Recepción
 *               device_id:
 *                 type: string
 *                 example: SCREEN-001
 *               venue_id:
 *                 type: integer
 *                 example: 1
 *               orientation:
 *                 type: string
 *                 enum: [landscape, portrait]
 *                 default: landscape
 *                 example: landscape
 *     responses:
 *       201:
 *         description: Pantalla creada exitosamente
 *       400:
 *         description: Datos inválidos o device_id/nombre duplicado
 *       403:
 *         description: No tienes permiso para crear pantallas en esa sede
 *       404:
 *         description: Sede no encontrada
 */
router.post('/', createScreen);

/**
 * @swagger
 * /api/screens/{id}:
 *   put:
 *     summary: Actualizar una pantalla
 *     description: Solo puede actualizar pantallas de sus propias sedes
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la pantalla
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pantalla Recepción Actualizada
 *               device_id:
 *                 type: string
 *                 example: SCREEN-001-NEW
 *               venue_id:
 *                 type: integer
 *                 example: 2
 *               orientation:
 *                 type: string
 *                 enum: [landscape, portrait]
 *                 example: portrait
 *     responses:
 *       200:
 *         description: Pantalla actualizada exitosamente
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Pantalla no encontrada
 */
router.put('/:id', updateScreen);

/**
 * @swagger
 * /api/screens/{id}:
 *   delete:
 *     summary: Eliminar una pantalla
 *     description: |
 *       Elimina la pantalla y su playlist.
 *       Solo puede eliminar pantallas de sus propias sedes.
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la pantalla
 *     responses:
 *       200:
 *         description: Pantalla eliminada exitosamente
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Pantalla no encontrada
 */
router.delete('/:id', deleteScreen);

/**
 * @swagger
 * /api/screens/{id}/playlist:
 *   post:
 *     summary: Asignar playlist a una pantalla
 *     description: |
 *       Reemplaza la playlist actual con una nueva.
 *       Publica automáticamente vía MQTT para actualizar el player en tiempo real.
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la pantalla
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - media_id
 *                   properties:
 *                     media_id:
 *                       type: integer
 *                       example: 1
 *                     duration:
 *                       type: integer
 *                       description: Duración en segundos
 *                       example: 10
 *                     position:
 *                       type: integer
 *                       description: Orden en la playlist
 *                       example: 0
 *     responses:
 *       200:
 *         description: Playlist asignada y publicada vía MQTT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 playlist:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Datos inválidos o media no existe
 *       403:
 *         description: No tienes permiso
 */
router.post('/:id/playlist', assignPlaylist);

/**
 * @swagger
 * /api/screens/{id}/command:
 *   post:
 *     summary: Enviar comando MQTT a una pantalla
 *     description: |
 *       Envía un comando en tiempo real a la pantalla vía MQTT.
 *       Comandos comunes: reload, powerOff, powerOn, screenshot, etc.
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la pantalla
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *                 example: reload
 *               payload:
 *                 type: object
 *                 description: Datos adicionales del comando
 *     responses:
 *       200:
 *         description: Comando enviado vía MQTT
 *       403:
 *         description: No tienes permiso
 *       404:
 *         description: Pantalla no encontrada
 */
router.post('/:id/command', sendCommand);

/**
 * @swagger
 * /api/screens/broadcast/send-update:
 *   post:
 *     summary: Enviar comando de actualización APK a todas las pantallas online (Super Admin)
 *     description: |
 *       Envía comando MQTT de actualización a todas las pantallas que estén online.
 *       Solo super admin puede ejecutar este comando.
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Comando de actualización enviado a todas las pantallas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 sent_to:
 *                   type: integer
 *                   description: Número de pantallas a las que se envió el comando
 *                 version:
 *                   type: object
 *                   properties:
 *                     version_code:
 *                       type: integer
 *                     version_name:
 *                       type: string
 *       403:
 *         description: No tienes permiso (solo super admin)
 *       404:
 *         description: No hay versiones de APK disponibles o no hay pantallas online
 */
router.post('/broadcast/send-update', isSuperAdmin, sendUpdateCommandToAll);

/**
 * @swagger
 * /api/screens/{id}/send-update:
 *   post:
 *     summary: Enviar comando de actualización APK a una pantalla (Super Admin)
 *     description: |
 *       Envía comando MQTT para actualizar la APK del player a la última versión disponible.
 *       Solo super admin puede ejecutar este comando.
 *     tags: [Screens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la pantalla
 *     responses:
 *       200:
 *         description: Comando de actualización enviado vía MQTT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 version:
 *                   type: object
 *                   properties:
 *                     version_code:
 *                       type: integer
 *                     version_name:
 *                       type: string
 *       403:
 *         description: No tienes permiso (solo super admin)
 *       404:
 *         description: Pantalla no encontrada o no hay versiones de APK disponibles
 */
router.post('/:id/send-update', isSuperAdmin, sendUpdateCommand);

module.exports = router;
