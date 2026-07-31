const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  listVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
} = require('../controllers/venues.controller');

// Todas las rutas requieren autenticación
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Venues
 *   description: Gestión de sedes (multi-tenant)
 */

/**
 * @swagger
 * /api/venues:
 *   get:
 *     summary: Listar sedes
 *     description: |
 *       - **Owner**: Ve solo las sedes de su empresa
 *       - **Super Admin**: Ve todas las sedes o puede filtrar por empresa
 *     tags: [Venues]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o dirección
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         description: Filtrar por empresa (solo super admin)
 *     responses:
 *       200:
 *         description: Lista de sedes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Venue'
 *       401:
 *         description: No autenticado
 */
router.get('/', listVenues);

/**
 * @swagger
 * /api/venues/{id}:
 *   get:
 *     summary: Obtener una sede por ID
 *     description: Solo puede ver sedes de su propia empresa (o todas si es super admin)
 *     tags: [Venues]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sede
 *     responses:
 *       200:
 *         description: Datos de la sede
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Venue'
 *       403:
 *         description: No tienes permiso para ver esta sede
 *       404:
 *         description: Sede no encontrada
 */
router.get('/:id', getVenue);

/**
 * @swagger
 * /api/venues:
 *   post:
 *     summary: Crear una nueva sede
 *     description: |
 *       - **Owner**: Crea sede para su propia empresa
 *       - **Super Admin**: Debe especificar company_id
 *     tags: [Venues]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sede Centro
 *               address:
 *                 type: string
 *                 example: Calle 123 #45-67, Bogotá
 *               description:
 *                 type: string
 *                 example: Sede principal en el centro de la ciudad
 *               company_id:
 *                 type: integer
 *                 description: ID de la empresa (solo para super admin)
 *                 example: 2
 *     responses:
 *       201:
 *         description: Sede creada exitosamente
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
 *                   example: Sede creada exitosamente
 *                 venue:
 *                   $ref: '#/components/schemas/Venue'
 *       400:
 *         description: Datos inválidos o nombre duplicado
 */
router.post('/', createVenue);

/**
 * @swagger
 * /api/venues/{id}:
 *   put:
 *     summary: Actualizar una sede existente
 *     description: Solo puede actualizar sedes de su propia empresa (o todas si es super admin)
 *     tags: [Venues]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sede
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sede Centro Actualizada
 *               address:
 *                 type: string
 *                 example: Calle 123 #45-67, Bogotá
 *               description:
 *                 type: string
 *                 example: Descripción actualizada
 *     responses:
 *       200:
 *         description: Sede actualizada exitosamente
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
 *                   example: Sede actualizada exitosamente
 *                 venue:
 *                   $ref: '#/components/schemas/Venue'
 *       403:
 *         description: No tienes permiso para editar esta sede
 *       404:
 *         description: Sede no encontrada
 */
router.put('/:id', updateVenue);

/**
 * @swagger
 * /api/venues/{id}:
 *   delete:
 *     summary: Eliminar una sede
 *     description: |
 *       Solo puede eliminar sedes de su propia empresa (o todas si es super admin).
 *       No se puede eliminar si tiene pantallas asociadas.
 *     tags: [Venues]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sede
 *     responses:
 *       200:
 *         description: Sede eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: No se puede eliminar porque tiene pantallas asociadas
 *       403:
 *         description: No tienes permiso para eliminar esta sede
 *       404:
 *         description: Sede no encontrada
 */
router.delete('/:id', deleteVenue);

module.exports = router;
