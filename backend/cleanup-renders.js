/**
 * Script para limpiar MediaRenders en estado error o pending
 * Ejecutar: node cleanup-renders.js
 */

require('dotenv').config();
const { MediaRender } = require('./src/models');
const sequelize = require('./src/database');

async function cleanupRenders() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    const deleted = await MediaRender.destroy({
      where: {
        status: ['pending', 'error', 'processing']
      }
    });

    console.log(`✅ Eliminados ${deleted} renders en estado pending/error/processing`);
    console.log('Ahora puedes volver a asignar el video a la pantalla');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupRenders();
