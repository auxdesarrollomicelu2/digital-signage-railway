const express = require('express');
const router = express.Router();
const { listAuditLogs, getAuditStats } = require('../controllers/audit.controller');
const authenticate = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: Listar logs de auditoría (SOLO SUPER ADMIN)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrar por acción (create, update, delete)
 *       - in: query
 *         name: resource_type
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de recurso
 *       - in: query
 *         name: user_name
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de usuario
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         description: Filtrar por empresa
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Lista de logs con paginación
 *       403:
 *         description: No autorizado (requiere super admin)
 */
router.get('/logs', authenticate, isSuperAdmin, listAuditLogs);

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Obtener estadísticas de auditoría (SOLO SUPER ADMIN)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Estadísticas de auditoría
 *       403:
 *         description: No autorizado (requiere super admin)
 */
router.get('/stats', authenticate, isSuperAdmin, getAuditStats);

module.exports = router;
