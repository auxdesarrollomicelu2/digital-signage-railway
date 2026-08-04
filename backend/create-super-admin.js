require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./src/database');
const Company = require('./src/models/Company');

async function createSuperAdmin() {
  try {
    await sequelize.sync();
    
    // Hash del password
    const hashedPassword = await bcrypt.hash('Versat-2620', 10);
    
    // Crear super admin Versat
    const company = await Company.create({
      name: 'Versat',
      username: 'versat-team',
      password: hashedPassword,
      email: 'juan.garcia@versat.ai',
      document_type: 'nit',
      document: '8888888888',
      phone: '3113118899',
      role: 'super_admin',
      active: true
    });
    
    console.log('✅ Super Admin creado exitosamente:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:', company.id);
    console.log('Empresa:', company.name);
    console.log('Usuario:', company.username);
    console.log('Email:', company.email);
    console.log('Rol:', company.role);
    console.log('Documento:', company.document_type.toUpperCase(), company.document);
    console.log('Teléfono:', company.phone);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Credenciales de login:');
    console.log('Usuario: versat-team');
    console.log('Password: Versat-2620');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('El usuario "versat-team" ya existe');
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createSuperAdmin();
