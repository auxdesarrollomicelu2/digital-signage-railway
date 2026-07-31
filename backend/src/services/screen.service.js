const { Screen, Venue, Media, ScreenMedia, Company } = require('../models');
const { Op } = require('sequelize');

function normalizeMediaUrl(url) {
  if (!url) return '';
  
  if (String(url).startsWith('https://')) {
    return url;
  }
  
  if (String(url).startsWith('/uploads/')) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    return `${backendUrl}${url}`;
  }
  
  return url;
}

const getPlaylistByDeviceId = async (deviceId) => {
  const screen = await Screen.findOne({ where: { device_id: deviceId } });
  if (!screen) {
    return null;
  }

  const rows = await ScreenMedia.findAll({
    where: { screen_id: screen.id },
    include: [{ model: Media, as: 'Media' }],
    order: [['position', 'ASC']],
  });

  const playlistData = rows
    .filter((r) => r.Media != null)
    .map((r) => ({
      id: r.Media.id,
      url: normalizeMediaUrl(r.Media.url),
      filename: r.Media.original_name,
      mime_type: r.Media.mime_type,
      size: r.Media.size,
      duration: r.duration,
      position: r.position,
    }));

  return playlistData;
};

const listScreens = async (filters, userPermissions) => {
  const { search, status, venue_id } = filters;
  const { role, companyId } = userPermissions;

  const venueWhere = {};
  
  if (role === 'super_admin') {
    if (venue_id) {
      venueWhere.id = venue_id;
    }
  } else {
    venueWhere.company_id = companyId;
    if (venue_id) {
      venueWhere.id = venue_id;
    }
  }

  const allowedVenues = await Venue.findAll({
    where: venueWhere,
    attributes: ['id'],
  });

  const allowedVenueIds = allowedVenues.map((v) => v.id);

  if (allowedVenueIds.length === 0) {
    return [];
  }

  const screenWhere = {
    venue_id: { [Op.in]: allowedVenueIds },
  };

  if (status) {
    screenWhere.status = status;
  }

  if (search) {
    screenWhere[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { device_id: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const screens = await Screen.findAll({
    where: screenWhere,
    include: [
      {
        model: Venue,
        as: 'Venue',
        attributes: ['id', 'name', 'address', 'company_id'],
        include: [
          {
            model: Company,
            as: 'Company',
            attributes: ['id', 'name', 'username'],
          },
        ],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return screens;
};

const getScreenById = async (screenId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const screen = await Screen.findByPk(screenId, {
    include: [
      {
        model: Venue,
        as: 'Venue',
        attributes: ['id', 'name', 'address', 'company_id'],
        include: [
          {
            model: Company,
            as: 'Company',
            attributes: ['id', 'name', 'username'],
          },
        ],
      },
      {
        model: ScreenMedia,
        as: 'ScreenMedia',
        include: [{ model: Media, as: 'Media' }],
        separate: true,
        order: [['position', 'ASC']],
      },
    ],
  });

  if (!screen) {
    return null;
  }

  if (role !== 'super_admin' && screen.Venue?.company_id !== companyId) {
    throw new Error('No tienes permiso para ver esta pantalla');
  }

  return screen;
};

const createScreen = async (screenData, userPermissions) => {
  const { name, device_id, venue_id, orientation = 'landscape' } = screenData;
  const { role, companyId } = userPermissions;

  if (!name || name.trim() === '') {
    throw new Error('El nombre es obligatorio');
  }

  if (!device_id || device_id.trim() === '') {
    throw new Error('El device_id es obligatorio');
  }

  if (!venue_id) {
    throw new Error('El venue_id es obligatorio');
  }

  const venue = await Venue.findByPk(venue_id);
  if (!venue) {
    throw new Error('Sede no encontrada');
  }

  if (role !== 'super_admin' && venue.company_id !== companyId) {
    throw new Error('No tienes permiso para crear pantallas en esta sede');
  }

  const existingDevice = await Screen.findOne({ where: { device_id: device_id.trim() } });
  if (existingDevice) {
    throw new Error('Ya existe una pantalla con ese device_id');
  }

  const existingName = await Screen.findOne({
    where: {
      name: name.trim(),
      venue_id: venue_id,
    },
  });

  if (existingName) {
    throw new Error('Ya existe una pantalla con ese nombre en esta sede');
  }

  const screen = await Screen.create({
    name: name.trim(),
    device_id: device_id.trim(),
    venue_id: venue_id,
    orientation: orientation,
    status: 'offline',
  });

  const screenWithRelations = await Screen.findByPk(screen.id, {
    include: [
      {
        model: Venue,
        as: 'Venue',
        attributes: ['id', 'name', 'company_id'],
        include: [
          {
            model: Company,
            as: 'Company',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  return {
    screen: screenWithRelations,
    companyId: venue.company_id,
  };
};

const updateScreen = async (screenId, updateData, userPermissions) => {
  const { name, device_id, venue_id, orientation } = updateData;
  const { role, companyId } = userPermissions;

  const screen = await Screen.findByPk(screenId, {
    include: [{ model: Venue, as: 'Venue', attributes: ['id', 'company_id'] }],
  });

  if (!screen) {
    throw new Error('Pantalla no encontrada');
  }

  const oldValues = {
    name: screen.name,
    device_id: screen.device_id,
    venue_id: screen.venue_id,
    orientation: screen.orientation
  };

  if (role !== 'super_admin' && screen.Venue?.company_id !== companyId) {
    throw new Error('No tienes permiso para editar esta pantalla');
  }

  if (name !== undefined) {
    if (name.trim() === '') {
      throw new Error('El nombre no puede estar vacío');
    }

    const existingName = await Screen.findOne({
      where: {
        name: name.trim(),
        venue_id: screen.venue_id,
        id: { [Op.ne]: screenId },
      },
    });

    if (existingName) {
      throw new Error('Ya existe otra pantalla con ese nombre en esta sede');
    }
  }

  if (device_id !== undefined) {
    if (device_id.trim() === '') {
      throw new Error('El device_id no puede estar vacío');
    }

    const existingDevice = await Screen.findOne({
      where: {
        device_id: device_id.trim(),
        id: { [Op.ne]: screenId },
      },
    });

    if (existingDevice) {
      throw new Error('Ya existe otra pantalla con ese device_id');
    }
  }

  if (venue_id !== undefined) {
    const venue = await Venue.findByPk(venue_id);
    if (!venue) {
      throw new Error('Sede no encontrada');
    }

    if (role !== 'super_admin' && venue.company_id !== companyId) {
      throw new Error('No tienes permiso para mover la pantalla a esa sede');
    }
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name.trim();
  if (device_id !== undefined) updateFields.device_id = device_id.trim();
  if (venue_id !== undefined) updateFields.venue_id = venue_id;
  if (orientation !== undefined) updateFields.orientation = orientation;

  await screen.update(updateFields);

  const updatedScreen = await Screen.findByPk(screenId, {
    include: [
      {
        model: Venue,
        as: 'Venue',
        attributes: ['id', 'name', 'company_id'],
        include: [
          {
            model: Company,
            as: 'Company',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  return {
    screen: updatedScreen,
    oldValues,
    newValues: {
      name: updatedScreen.name,
      device_id: updatedScreen.device_id,
      venue_id: updatedScreen.venue_id,
      orientation: updatedScreen.orientation
    },
  };
};

const deleteScreen = async (screenId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const screen = await Screen.findByPk(screenId, {
    include: [{ model: Venue, as: 'Venue', attributes: ['id', 'company_id'] }],
  });

  if (!screen) {
    throw new Error('Pantalla no encontrada');
  }

  if (role !== 'super_admin' && screen.Venue?.company_id !== companyId) {
    throw new Error('No tienes permiso para eliminar esta pantalla');
  }

  const screenData = {
    id: screen.id,
    name: screen.name,
    device_id: screen.device_id,
    venue_id: screen.venue_id,
    company_id: screen.Venue?.company_id,
  };

  await screen.destroy();

  return screenData;
};

const assignPlaylistToScreen = async (screenId, playlistItems, userPermissions) => {
  const { role, companyId } = userPermissions;

  const screen = await Screen.findByPk(screenId, {
    include: [{ model: Venue, as: 'Venue', attributes: ['id', 'company_id'] }],
  });

  if (!screen) {
    throw new Error('Pantalla no encontrada');
  }

  if (role !== 'super_admin' && screen.Venue?.company_id !== companyId) {
    throw new Error('No tienes permiso para editar la playlist de esta pantalla');
  }

  if (!playlistItems || !Array.isArray(playlistItems)) {
    throw new Error('items[] requerido');
  }

  const sanitized = playlistItems
    .map((item, idx) => ({
      screen_id: screen.id,
      media_id: Number(item.media_id),
      duration: Number(item.duration) || 10,
      position: item.position === undefined ? idx : Number(item.position),
    }))
    .filter((row) => row.media_id && !Number.isNaN(row.media_id));

  for (const row of sanitized) {
    const media = await Media.findByPk(row.media_id);
    if (!media) {
      throw new Error(`Media con id ${row.media_id} no existe`);
    }

    if (role !== 'super_admin' && media.company_id !== companyId) {
      throw new Error(`No tienes permiso para usar el archivo media con id ${row.media_id}`);
    }
  }

  await ScreenMedia.destroy({ where: { screen_id: screen.id } });

  if (sanitized.length > 0) {
    await ScreenMedia.bulkCreate(sanitized);
  }

  const rows = await ScreenMedia.findAll({
    where: { screen_id: screen.id },
    include: [{ model: Media, as: 'Media' }],
    order: [['position', 'ASC']],
  });

  const playlistData = rows
    .filter((r) => r.Media != null)
    .map((r) => ({
      id: r.Media.id,
      url: normalizeMediaUrl(r.Media.url),
      filename: r.Media.original_name,
      mime_type: r.Media.mime_type,
      size: r.Media.size,
      duration: r.duration,
      position: r.position,
    }));

  return {
    playlist: playlistData,
    screen,
  };
};

const validateScreenPermission = async (screenId, userPermissions) => {
  const { role, companyId } = userPermissions;

  const screen = await Screen.findByPk(screenId, {
    include: [{ model: Venue, as: 'Venue', attributes: ['id', 'company_id'] }],
  });

  if (!screen) {
    throw new Error('Pantalla no encontrada');
  }

  if (role !== 'super_admin' && screen.Venue?.company_id !== companyId) {
    throw new Error('No tienes permiso para enviar comandos a esta pantalla');
  }

  return screen;
};

module.exports = {
  normalizeMediaUrl,
  getPlaylistByDeviceId,
  listScreens,
  getScreenById,
  createScreen,
  updateScreen,
  deleteScreen,
  assignPlaylistToScreen,
  validateScreenPermission,
};
