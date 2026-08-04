const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación y registro
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: versat-team
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Versat-2620
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 company:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: Versat
 *                     username:
 *                       type: string
 *                       example: versat-team
 *                     email:
 *                       type: string
 *                       example: juan.garcia@versat.ai
 *                     role:
 *                       type: string
 *                       example: super_admin
 *       400:
 *         description: Datos faltantes
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    const company = await Company.findOne({ where: { username } });
    if (!company) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, company.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { 
        companyId: company.id,
        username: company.username,
        role: company.role,
        name: company.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      company: { 
        id: company.id,
        name: company.name,
        username: company.username,
        email: company.email,
        role: company.role
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nueva empresa (público)
 *     tags: [Auth]
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
 *                 example: Mi Empresa
 *               username:
 *                 type: string
 *                 example: mi-empresa
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               email:
 *                 type: string
 *                 format: email
 *                 example: contacto@miempresa.com
 *     responses:
 *       201:
 *         description: Empresa registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Datos inválidos o usuario ya existe
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    if (!username || !password || !name || !email) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const exists = await Company.findOne({ where: { username } });
    if (exists) return res.status(400).json({ error: 'El usuario ya existe' });

    const hashed = await bcrypt.hash(password, 10);
    const company = await Company.create({
      name,
      username,
      password: hashed,
      email,
      role: 'owner'
    });

    const token = jwt.sign(
      {
        companyId: company.id,
        username: company.username,
        role: company.role,
        name: company.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      company: {
        id: company.id,
        name: company.name,
        username: company.username,
        email: company.email,
        role: company.role
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
