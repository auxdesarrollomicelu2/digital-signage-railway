const { Venue, Screen, Company } = require('../models');
const { Op } = require('sequelize');

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
        attributes: ['id', 'name', 'status'],
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
    return {
      ...json,
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
  const { name, address, description, company_id } = venueData;
  const { role, companyId } = userPermissions;

  if (!name || name.trim() === '') {
    throw new Error('El nombre es obligatorio');
  }

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
      name: name.trim(),
      company_id: finalCompanyId,
    },
  });

  if (existingVenue) {
    throw new Error('Ya existe una sede con ese nombre en esta empresa');
  }

  const venue = await Venue.create({
    name: name.trim(),
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
  const { name, address, description } = updateData;
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

  if (name !== undefined) {
    if (name.trim() === '') {
      throw new Error('El nombre no puede estar vacío');
    }

    const existingVenue = await Venue.findOne({
      where: {
        name: name.trim(),
        company_id: venue.company_id,
        id: { [Op.ne]: venueId },
      },
    });

    if (existingVenue) {
      throw new Error('Ya existe otra sede con ese nombre en esta empresa');
    }
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name.trim();
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

module.exports = {
  listVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
};
