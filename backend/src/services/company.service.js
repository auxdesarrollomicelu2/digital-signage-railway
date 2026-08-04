const { Company, Venue, Screen } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { validateCompanyData, normalizeCompanyData } = require('../utils/validation');

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
  validateCompanyData(data, false);

  const normalized = normalizeCompanyData(data);

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
  } = normalized;

  const existingUsername = await Company.findOne({ where: { username } });
  if (existingUsername) {
    throw new Error('El nombre de usuario ya está en uso');
  }

  const existingEmail = await Company.findOne({ where: { email } });
  if (existingEmail) {
    throw new Error('El email ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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

  const companyData = company.toJSON();
  delete companyData.password;

  return companyData;
};

const updateCompany = async (companyId, updateData) => {
  validateCompanyData(updateData, true);

  const normalized = normalizeCompanyData(updateData);

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
  } = normalized;

  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  if (password) {
    if (!currentPassword) {
      throw new Error('Debes proporcionar la contraseña actual para cambiar la contraseña');
    }

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

  if (email && email !== company.email) {
    const existingEmail = await Company.findOne({
      where: { email, id: { [Op.ne]: companyId } },
    });
    if (existingEmail) {
      throw new Error('El email ya está registrado por otra empresa');
    }
  }

  if (username && username !== company.username) {
    const existingUsername = await Company.findOne({
      where: { username, id: { [Op.ne]: companyId } },
    });
    if (existingUsername) {
      throw new Error('El nombre de usuario ya está en uso');
    }
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (username !== undefined) updateFields.username = username;
  if (email !== undefined) updateFields.email = email;
  if (role !== undefined) updateFields.role = role;
  if (document_type !== undefined) updateFields.document_type = document_type;
  if (document !== undefined) updateFields.document = document;
  if (phone !== undefined) updateFields.phone = phone;
  if (active !== undefined) updateFields.active = active;

  if (password) {
    updateFields.password = await bcrypt.hash(password, 10);
  }

  await company.update(updateFields);

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
