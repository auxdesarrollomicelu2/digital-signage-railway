require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('./database');
const { setupMQTT } = require('./services/mqtt');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('./models');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(uploadDir));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Digital Signage API',
}));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/screens', require('./routes/screens'));
app.use('/api/media', require('./routes/media'));
app.use('/api/audit', require('./routes/audit'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = parseInt(process.env.PORT || '3000');

async function start() {
  try {
    await sequelize.sync();
    console.log('[DB] Base de datos sincronizada');

    // sequelize.sync() no altera tablas ya existentes: si la tabla Venues ya
    // existía antes de agregar cover_url/cover_key al modelo, hay que añadir
    // las columnas a mano (idempotente, no toca el resto del esquema).
    const queryInterface = sequelize.getQueryInterface();
    const venueTable = { tableName: 'Venues', schema: process.env.DB_SCHEMA || 'digital_signage' };
    const venueColumns = await queryInterface.describeTable(venueTable);
    if (!venueColumns.cover_url) {
      await queryInterface.addColumn(venueTable, 'cover_url', { type: require('sequelize').STRING, allowNull: true });
      console.log('[DB] Columna Venues.cover_url agregada');
    }
    if (!venueColumns.cover_key) {
      await queryInterface.addColumn(venueTable, 'cover_key', { type: require('sequelize').STRING, allowNull: true });
      console.log('[DB] Columna Venues.cover_key agregada');
    }

    const companyTable = { tableName: 'Companies', schema: process.env.DB_SCHEMA || 'digital_signage' };
    const companyColumns = await queryInterface.describeTable(companyTable);
    if (!companyColumns.logo_url) {
      await queryInterface.addColumn(companyTable, 'logo_url', { type: require('sequelize').STRING, allowNull: true });
      console.log('[DB] Columna Companies.logo_url agregada');
    }


    setupMQTT();

    // Mark screens offline if no heartbeat in 60 seconds
    setInterval(async () => {
      try {
        const { Screen } = require('./models');
        const threshold = new Date(Date.now() - 60000);
        await Screen.update(
          { status: 'offline' },
          {
            where: {
              status: 'online',
              last_heartbeat: { [Op.lt]: threshold },
            },
          }
        );
      } catch {}
    }, 30000);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[API] Servidor corriendo en http://0.0.0.0:${PORT}`);
      console.log(`[API] Uploads en ${uploadDir}`);
    });
  } catch (err) {
    console.error('Error al iniciar:', err);
    process.exit(1);
  }
}

start();
