const path = require('path');
const fs = require('fs');
const { Venue, Screen, Company } = require('../models');
const { Op } = require('sequelize');
const { uploadToR2, deleteFromR2, getPublicUrl, isR2Configured } = require('./cloudflare');
const { validateVenueData, normalizeVenueData } = require('../utils/validation');

const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads');

const listVenues = async (filters, userPermissions) => {
  const { search, company_id } = filters;
  const { role, companyId } = userPermissions;

  const where = {};

  if (role === 'super_admin') {
    if (company_id) {
      where.company_id = company_id;
    }
  } else {
    where.company_id = companyId;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const venues = await Venue.findAll({
    where,
    include: [
      {
        model: Screen,
        as: 'Screens',
        attributes: ['id', 'name', 'status', 'last_heartbeat'],
      },
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return venues.map((v) => {
    const json = v.toJSON();
    const heartbeats = (json.Screens || [])
      .map((s) => s.last_heartbeat)
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    return {
      ...json,
      lastActivity: heartbeats.length ? new Date(Math.max(...heartbeats)).toISOString() : null,
      screenCount: Array.isArray(json.Screens) ? json.Screens.length : 0,
    };
  });
};

const getVenueById = async (venueId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const venue = await Venue.findByPk(venueId, {
    include: [
      {
        model: Screen,
        as: 'Screens',
        attributes: ['id', 'name', 'device_id', 'status', 'orientation', 'last_heartbeat'],
      },
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username', 'email'],
      },
    ],
  });

  if (!venue) {
    return null;
  }

  if (role !== 'super_admin' && venue.company_id !== companyId) {
    throw new Error('No tienes permiso para ver esta sede');
  }

  return venue;
};

const createVenue = async (venueData, userPermissions) => {
  validateVenueData(venueData, false);

  const normalized = normalizeVenueData(venueData);
  
  const { name, address, description, company_id } = normalized;
  const { role, companyId } = userPermissions;

  let finalCompanyId;

  if (role === 'super_admin') {
    if (company_id) {
      const companyExists = await Company.findByPk(company_id);
      if (!companyExists) {
        throw new Error('Empresa no encontrada');
      }
      finalCompanyId = company_id;
    } else {
      finalCompanyId = companyId;
    }
  } else {
    finalCompanyId = companyId;
  }

  const existingVenue = await Venue.findOne({
    where: {
      name,
      company_id: finalCompanyId,
    },
  });

  if (existingVenue) {
    throw new Error('Ya existe una sede con ese nombre en esta empresa');
  }

  const venue = await Venue.create({
    name,
    address: address || '',
    description: description || '',
    company_id: finalCompanyId,
  });

  const venueWithRelations = await Venue.findByPk(venue.id, {
    include: [
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username'],
      },
    ],
  });

  return {
    venue: venueWithRelations,
    companyId: finalCompanyId,
  };
};

const updateVenue = async (venueId, updateData, userPermissions) => {
  validateVenueData(updateData, true);

  const normalized = normalizeVenueData(updateData);
  
  const { name, address, description } = normalized;
  const { role, companyId } = userPermissions;

  const venue = await Venue.findByPk(venueId);

  if (!venue) {
    throw new Error('Sede no encontrada');
  }

  const oldValues = {
    name: venue.name,
    address: venue.address,
    description: venue.description
  };

  if (role !== 'super_admin' && venue.company_id !== companyId) {
    throw new Error('No tienes permiso para editar esta sede');
  }

  if (name !== undefined && name !== venue.name) {
    const existingVenue = await Venue.findOne({
      where: {
        name,
        company_id: venue.company_id,
        id: { [Op.ne]: venueId },
      },
    });

    if (existingVenue) {
      throw new Error('Ya existe otra sede con ese nombre en esta empresa');
    }
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (address !== undefined) updateFields.address = address;
  if (description !== undefined) updateFields.description = description;

  await venue.update(updateFields);

  const updatedVenue = await Venue.findByPk(venueId, {
    include: [
      {
        model: Company,
        as: 'Company',
        attributes: ['id', 'name', 'username'],
      },
      {
        model: Screen,
        as: 'Screens',
        attributes: ['id', 'name', 'status'],
      },
    ],
  });

  return {
    venue: updatedVenue,
    oldValues,
    newValues: { 
      name: updatedVenue.name, 
      address: updatedVenue.address, 
      description: updatedVenue.description 
    },
  };
};

const deleteVenue = async (venueId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const venue = await Venue.findByPk(venueId, {
    include: [
      {
        model: Screen,
        as: 'Screens',
        attributes: ['id'],
      },
    ],
  });

  if (!venue) {
    throw new Error('Sede no encontrada');
  }

  if (role !== 'super_admin' && venue.company_id !== companyId) {
    throw new Error('No tienes permiso para eliminar esta sede');
  }

  const screenCount = venue.Screens ? venue.Screens.length : 0;
  if (screenCount > 0) {
    throw new Error(`No se puede eliminar la sede porque tiene ${screenCount} pantalla(s) asociada(s). Elimina primero las pantallas.`);
  }

  const venueData = {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    description: venue.description,
    company_id: venue.company_id,
  };

  await venue.destroy();

  return venueData;
};

const uploadVenueCover = async (venueId, file, userPermissions) => {
  const { role, companyId } = userPermissions;

  if (!file) {
    throw new Error('No se subió ninguna imagen');
  }

  const venue = await Venue.findByPk(venueId, {
    include: [{ model: Company, as: 'Company', attributes: ['id', 'name'] }],
  });

  if (!venue) {
    throw new Error('Sede no encontrada');
  }

  if (role !== 'super_admin' && venue.company_id !== companyId) {
    throw new Error('No tienes permiso para editar esta sede');
  }

  const previousKey = venue.cover_key;

  let coverUrl = `/uploads/${file.filename}`;
  let coverKey = null;

  if (isR2Configured()) {
    try {
      coverKey = await uploadToR2(file, venue.company_id, venue.Company?.name || `empresa-${venue.company_id}`);
      coverUrl = getPublicUrl(coverKey);
    } catch (r2Error) {
      console.error('❌ [R2] Error al subir portada de sede:', r2Error.message);
    }
  }

  await venue.update({ cover_url: coverUrl, cover_key: coverKey });

  // Limpiar la portada anterior una vez la nueva quedó guardada.
  if (previousKey) {
    await deleteFromR2(previousKey);
  }

  const localFilePath = path.join(uploadDir, file.filename);
  if (coverKey && fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
    } catch {
      /* no bloquea la respuesta si falla la limpieza local */
    }
  }

  return venue;
};

module.exports = {
  listVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  uploadVenueCover,
};
