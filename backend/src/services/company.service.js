const { Company, Venue, Screen } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const listCompanies = async (filters = {}) => {
  const { active, role, search } = filters;
  
  const where = {};
  
  if (active !== undefined) {
    where.active = active === 'true';
  }
  
  if (role) {
    where.role = role;
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { username: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const companies = await Company.findAll({
    where,
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Venue,
        as: 'Venues',
        attributes: ['id', 'name'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return companies;
};

const getCompanyById = async (companyId) => {
  const company = await Company.findByPk(companyId, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Venue,
        as: 'Venues',
        attributes: ['id', 'name', 'address', 'createdAt'],
        include: [
          {
            model: Screen,
            as: 'Screens',
            attributes: ['id', 'name', 'device_id', 'status', 'orientation', 'createdAt'],
          },
        ],
      },
    ],
  });

  if (!company) {
    return null;
  }

  // Calcular estadísticas
  const stats = calculateCompanyStats(company);

  return {
    ...company.toJSON(),
    stats,
  };
};

/**
 * Calcular estadísticas de una empresa
 */
const calculateCompanyStats = (company) => {
  const venues = company.Venues || [];
  const allScreens = venues.flatMap(v => v.Screens || []);
  
  return {
    totalVenues: venues.length,
    totalScreens: allScreens.length,
    screensOnline: allScreens.filter(s => s.status === 'online').length,
    screensOffline: allScreens.filter(s => s.status !== 'online').length,
  };
};

const createCompany = async (data) => {
  const {
    name,
    username,
    password,
    email,
    role = 'owner',
    document_type,
    document,
    phone,
    active = true,
  } = data;

  // Validaciones
  if (!name || !username || !password || !email) {
    throw new Error('Los campos name, username, password y email son obligatorios');
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Email inválido');
  }

  // Validar rol
  if (!['super_admin', 'owner'].includes(role)) {
    throw new Error('El rol debe ser "super_admin" o "owner"');
  }

  // Verificar si el username ya existe
  const existingUsername = await Company.findOne({ where: { username } });
  if (existingUsername) {
    throw new Error('El nombre de usuario ya está en uso');
  }

  // Verificar si el email ya existe
  const existingEmail = await Company.findOne({ where: { email } });
  if (existingEmail) {
    throw new Error('El email ya está registrado');
  }

  // Hashear password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear empresa
  const company = await Company.create({
    name,
    username,
    password: hashedPassword,
    email,
    role,
    document_type,
    document,
    phone,
    active,
  });

  // Devolver sin password
  const companyData = company.toJSON();
  delete companyData.password;

  return companyData;
};

/**
 * Actualizar una empresa existente
 */
const updateCompany = async (companyId, updateData) => {
  const {
    name,
    username,
    password,
    currentPassword,
    email,
    role,
    document_type,
    document,
    phone,
    active,
  } = updateData;

  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // Si se intenta cambiar la contraseña, validar la contraseña actual
  if (password) {
    if (!currentPassword) {
      throw new Error('Debes proporcionar la contraseña actual para cambiar la contraseña');
    }

    // Verificar que la contraseña actual sea correcta
    const isPasswordValid = await bcrypt.compare(currentPassword, company.password);
    if (!isPasswordValid) {
      throw new Error('La contraseña actual es incorrecta');
    }
  }

  const oldValues = {
    name: company.name,
    username: company.username,
    email: company.email,
    role: company.role,
    active: company.active
  };

  // Validar email si se está actualizando
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }

    // Verificar que el email no esté en uso por otra empresa
    const existingEmail = await Company.findOne({
      where: { email, id: { [Op.ne]: companyId } },
    });
    if (existingEmail) {
      throw new Error('El email ya está registrado por otra empresa');
    }
  }

  // Verificar username si se está actualizando
  if (username) {
    const existingUsername = await Company.findOne({
      where: { username, id: { [Op.ne]: companyId } },
    });
    if (existingUsername) {
      throw new Error('El nombre de usuario ya está en uso');
    }
  }

  // Validar rol si se está actualizando
  if (role && !['super_admin', 'owner'].includes(role)) {
    throw new Error('El rol debe ser "super_admin" o "owner"');
  }

  // Preparar datos a actualizar
  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (username !== undefined) updateFields.username = username;
  if (email !== undefined) updateFields.email = email;
  if (role !== undefined) updateFields.role = role;
  if (document_type !== undefined) updateFields.document_type = document_type;
  if (document !== undefined) updateFields.document = document;
  if (phone !== undefined) updateFields.phone = phone;
  if (active !== undefined) updateFields.active = active;

  // Si se envía nueva password, hashearla
  if (password) {
    updateFields.password = await bcrypt.hash(password, 10);
  }

  await company.update(updateFields);

  // Devolver sin password
  const companyData = company.toJSON();
  delete companyData.password;

  return {
    company: companyData,
    oldValues,
    newValues: { 
      name: company.name, 
      username: company.username, 
      email: company.email, 
      role: company.role, 
      active: company.active 
    },
  };
};

const deactivateCompany = async (companyId) => {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // No permitir desactivar super admins
  if (company.role === 'super_admin') {
    throw new Error('No se puede desactivar una cuenta de super administrador');
  }

  await company.update({ active: false });

  return {
    company: company.toJSON(),
    oldValues: { active: true },
    newValues: { active: false },
  };
};

const deleteCompany = async (companyId) => {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  // No permitir eliminar super admins
  if (company.role === 'super_admin') {
    throw new Error('No se puede eliminar una cuenta de super administrador');
  }

  const companyData = company.toJSON();
  await company.destroy();

  return companyData;
};

module.exports = {
  listCompanies,
  getCompanyById,
  calculateCompanyStats,
  createCompany,
  updateCompany,
  deactivateCompany,
  deleteCompany,
};
