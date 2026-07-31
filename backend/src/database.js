const { Sequelize } = require('sequelize');

// Conexión PostgreSQL (Railway)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  timezone: '-05:00', // Zona horaria de Bogotá (UTC-5)
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false  // Railway requiere SSL
    },
    // Establecer timezone en la sesión de PostgreSQL
    options: '-c timezone=America/Bogota'
  },
  schema: process.env.DB_SCHEMA || 'digital_signage',
  logging: false,
});

// Hook para establecer timezone en cada consulta
sequelize.addHook('beforeConnect', (config) => {
  config.options = config.options || {};
  config.options.timezone = 'America/Bogota';
});

module.exports = sequelize;
