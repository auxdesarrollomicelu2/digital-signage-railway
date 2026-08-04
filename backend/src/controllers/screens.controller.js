const { logAudit, logScreen } = require('../utils/audit');
const { publishPlaylist, publishCommand } = require('../services/mqtt');
const screenService = require('../services/screen.service');

const getPlaylistByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const playlistData = await screenService.getPlaylistByDeviceId(deviceId);

    if (playlistData === null) {
      return res.status(404).json({ error: 'Pantalla no encontrada' });
    }

    res.json({ items: playlistData });
  } catch (err) {
    console.error('[getPlaylistByDevice] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const previewDeviceId = async (req, res) => {
  try {
    const { companyId } = req.user;
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId no encontrado en el token' });
    }
    
    const device_id = await screenService.generateDeviceIdForCompany(companyId);
    res.json({ device_id });
  } catch (err) {
    console.error('[previewDeviceId] Error completo:', err);
    res.status(500).json({ error: err.message || 'Error generando device_id' });
  }
};

const listScreens = async (req, res) => {
  try {
    const screens = await screenService.listScreens(req.query, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    res.json(screens);
  } catch (err) {
    console.error('[listScreens] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getScreen = async (req, res) => {
  try {
    const { id } = req.params;

    const screen = await screenService.getScreenById(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    if (!screen) {
      return res.status(404).json({ error: 'Pantalla no encontrada' });
    }

    res.json(screen);
  } catch (err) {
    console.error('[getScreen] Error:', err);
    const statusCode = err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const createScreen = async (req, res) => {
  try {
    const result = await screenService.createScreen(req.body, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'create',
      resourceType: 'Screen',
      resourceId: result.screen.id,
      resourceName: result.screen.name,
      oldValues: null,
      newValues: {
        name: result.screen.name,
        device_id: result.screen.device_id,
        venue_id: result.screen.venue_id,
        orientation: result.screen.orientation
      },
      companyId: result.companyId
    });

    res.status(201).json({
      success: true,
      message: 'Pantalla creada exitosamente',
      screen: result.screen,
    });
  } catch (err) {
    console.error('[createScreen] Error:', err);
    const statusCode = err.message.includes('obligatorio') || err.message.includes('Ya existe') ? 400 :
                       err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const updateScreen = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await screenService.updateScreen(id, req.body, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'update',
      resourceType: 'Screen',
      resourceId: result.screen.id,
      resourceName: result.screen.name,
      oldValues: result.oldValues,
      newValues: result.newValues,
      companyId: result.screen.Venue?.company_id
    });

    res.json({
      success: true,
      message: 'Pantalla actualizada exitosamente',
      screen: result.screen,
    });
  } catch (err) {
    console.error('[updateScreen] Error:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 :
                       err.message.includes('vacío') || err.message.includes('Ya existe') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const deleteScreen = async (req, res) => {
  try {
    const { id } = req.params;

    const screenData = await screenService.deleteScreen(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'delete',
      resourceType: 'Screen',
      resourceId: screenData.id,
      resourceName: screenData.name,
      oldValues: {
        name: screenData.name,
        device_id: screenData.device_id,
        venue_id: screenData.venue_id
      },
      newValues: null,
      companyId: screenData.company_id
    });

    res.json({
      success: true,
      message: 'Pantalla eliminada exitosamente',
    });
  } catch (err) {
    console.error('[deleteScreen] Error:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const assignPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const result = await screenService.assignPlaylistToScreen(id, items, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    publishPlaylist(result.screen.device_id, { items: result.playlist });

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'update',
      resourceType: 'Playlist',
      resourceId: result.screen.id,
      resourceName: result.screen.device_id,
      oldValues: null,
      newValues: { items_count: result.playlist.length },
      companyId: result.screen.Venue?.company_id
    });

    await logScreen({
      screenId: result.screen.id,
      screenName: result.screen.name,
      deviceId: result.screen.device_id,
      eventType: 'playlist_sync',
      status: 'online',
      playlistItems: result.playlist.length,
      companyId: result.screen.Venue?.company_id
    });

    res.json({ success: true, playlist: result.playlist });
  } catch (err) {
    console.error('[playlist] ERROR:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 :
                       err.message.includes('requerido') || err.message.includes('no existe') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const sendCommand = async (req, res) => {
  try {
    const { id } = req.params;

    const screen = await screenService.validateScreenPermission(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    publishCommand(screen.device_id, req.body);

    res.json({ success: true });
  } catch (err) {
    console.error('[sendCommand] Error:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

module.exports = {
  getPlaylistByDevice,
  previewDeviceId,
  listScreens,
  getScreen,
  createScreen,
  updateScreen,
  deleteScreen,
  assignPlaylist,
  sendCommand,
};
