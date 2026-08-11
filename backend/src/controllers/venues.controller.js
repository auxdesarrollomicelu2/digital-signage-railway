const { logAudit } = require('../utils/audit');
const venueService = require('../services/venue.service');

const listVenues = async (req, res) => {
  try {
    const venues = await venueService.listVenues(req.query, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    res.json(venues);
  } catch (err) {
    console.error('Error al listar sedes:', err);
    res.status(500).json({ error: err.message });
  }
};

const getVenue = async (req, res) => {
  try {
    const { id } = req.params;
    
    const venue = await venueService.getVenueById(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    if (!venue) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    res.json(venue);
  } catch (err) {
    console.error('Error al obtener sede:', err);
    const statusCode = err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const createVenue = async (req, res) => {
  try {
    const result = await venueService.createVenue(req.body, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'create',
      resourceType: 'Venue',
      resourceId: result.venue.id,
      resourceName: result.venue.name,
      oldValues: null,
      newValues: { 
        name: result.venue.name, 
        address: result.venue.address, 
        description: result.venue.description 
      },
      companyId: result.companyId
    });

    res.status(201).json({
      success: true,
      message: 'Sede creada exitosamente',
      venue: result.venue,
    });
  } catch (err) {
    console.error('Error al crear sede:', err);
    const statusCode = err.message.includes('obligatorio') || 
                       err.message.includes('especificar') || 
                       err.message.includes('Ya existe') ? 400 :
                       err.message.includes('no encontrada') ? 404 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await venueService.updateVenue(id, req.body, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'update',
      resourceType: 'Venue',
      resourceId: result.venue.id,
      resourceName: result.venue.name,
      oldValues: result.oldValues,
      newValues: result.newValues,
      companyId: result.venue.company_id
    });

    res.json({
      success: true,
      message: 'Sede actualizada exitosamente',
      venue: result.venue,
    });
  } catch (err) {
    console.error('Error al actualizar sede:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 :
                       err.message.includes('vacío') || err.message.includes('Ya existe') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    
    const venueData = await venueService.deleteVenue(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'delete',
      resourceType: 'Venue',
      resourceId: venueData.id,
      resourceName: venueData.name,
      oldValues: { 
        name: venueData.name, 
        address: venueData.address, 
        description: venueData.description 
      },
      newValues: null,
      companyId: venueData.company_id
    });

    res.json({
      success: true,
      message: 'Sede eliminada exitosamente',
    });
  } catch (err) {
    console.error('Error al eliminar sede:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 :
                       err.message.includes('No se puede eliminar') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const uploadVenueCover = async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await venueService.uploadVenueCover(id, req.file, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    res.json({
      success: true,
      message: 'Portada de sede actualizada',
      venue,
    });
  } catch (err) {
    console.error('Error al subir portada de sede:', err);
    const statusCode = err.message.includes('No se subió') ? 400 :
                       err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

module.exports = {
  listVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
  uploadVenueCover,
};
