const router = require('express').Router();
const auth = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');
const {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  hardDeleteCompany,
} = require('../controllers/companies.controller');

// Todas las rutas requieren autenticación y ser super admin
router.use(auth);
router.use(isSuperAdmin);

/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Gestión de empresas (Solo Super Admin)
 */

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Listar todas las empresas
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, owner]
 *         description: Filtrar por rol
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre, username o email
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Company'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acceso denegado (no es super admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', listCompanies);

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Obtener una empresa por ID
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la empresa
 *     responses:
 *       200:
 *         description: Datos de la empresa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       404:
 *         description: Empresa no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getCompany);

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Crear una nueva empresa
 *     tags: [Companies]
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
 *               - username
 *               - password
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corporation
 *               username:
 *                 type: string
 *                 example: acme-admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@acme.com
 *               role:
 *                 type: string
 *                 enum: [super_admin, owner]
 *                 default: owner
 *                 example: owner
 *               document_type:
 *                 type: string
 *                 example: NIT
 *               document:
 *                 type: string
 *                 example: 900123456-7
 *               phone:
 *                 type: string
 *                 example: +57 300 123 4567
 *               active:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Empresa creada exitosamente
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
 *                   example: Empresa creada exitosamente
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Datos inválidos o usuario/email ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   put:
 *     summary: Actualizar una empresa existente
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corporation Updated
 *               username:
 *                 type: string
 *                 example: acme-admin-new
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewSecurePass123!
 *               email:
 *                 type: string
 *                 format: email
 *                 example: new-admin@acme.com
 *               role:
 *                 type: string
 *                 enum: [super_admin, owner]
 *                 example: owner
 *               document_type:
 *                 type: string
 *                 example: NIT
 *               document:
 *                 type: string
 *                 example: 900123456-7
 *               phone:
 *                 type: string
 *                 example: +57 300 999 8888
 *               active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Empresa actualizada exitosamente
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
 *                   example: Empresa actualizada exitosamente
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: Empresa no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     summary: Desactivar una empresa (soft delete)
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la empresa
 *     responses:
 *       200:
 *         description: Empresa desactivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: No se puede eliminar super admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Empresa no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteCompany);

/**
 * @swagger
 * /api/companies/{id}/hard-delete:
 *   delete:
 *     summary: Eliminar permanentemente una empresa (hard delete)
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la empresa
 *     responses:
 *       200:
 *         description: Empresa eliminada permanentemente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: No se puede eliminar super admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Empresa no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id/hard-delete', hardDeleteCompany);

module.exports = router;
