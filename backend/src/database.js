const { Sequelize } = require('sequelize');

// Conexión PostgreSQL (Railway)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  timezone: '-05:00', // Zona horaria de Bogotá (UTC-5) - para ESCRITURA
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false  // Railway requiere SSL
    }
  },
  schema: process.env.DB_SCHEMA || 'digital_signage',
  logging: false,
});

module.exports = sequelize;
