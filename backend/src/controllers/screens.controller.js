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
    const { venue_id } = req.query;
    
    if (!venue_id) {
      // Fallback: generar basado en company
      const { companyId } = req.user;
      if (!companyId) {
        return res.status(400).json({ error: 'companyId no encontrado en el token' });
      }
      const device_id = await screenService.generateDeviceIdForCompany(companyId);
      return res.json({ device_id });
    }
    
    // Generar device_id basado en la sede seleccionada
    const device_id = await screenService.generateDeviceIdForVenue(venue_id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });
    
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

const sendUpdateCommand = async (req, res) => {
  try {
    const { id } = req.params;

    // Only super admin can send update commands
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super admin puede enviar actualizaciones' });
    }

    const screen = await screenService.validateScreenPermission(id, {
      role: req.user.role,
      companyId: req.user.companyId,
    });

    // Get latest APK version
    const { ApkVersion } = require('../models');
    const latestVersion = await ApkVersion.findOne({
      where: { is_active: true },
      order: [['version_code', 'DESC']],
    });

    if (!latestVersion) {
      return res.status(404).json({ error: 'No hay versiones de APK disponibles' });
    }

    // Publish MQTT command
    const updateCommand = {
      type: 'update_apk',
      version_code: latestVersion.version_code,
      version_name: latestVersion.version_name,
      download_url: `${process.env.BACKEND_URL}/api/apk/download/${latestVersion.id}`,
      sha256: latestVersion.sha256,
    };

    publishCommand(screen.device_id, updateCommand);

    await logAudit({
      userId: req.user.companyId,
      userName: req.user.username,
      action: 'update',
      resourceType: 'Screen',
      resourceId: screen.id,
      resourceName: screen.name,
      oldValues: null,
      newValues: { command: 'update_apk', version: latestVersion.version_name },
      companyId: screen.Venue?.company_id,
    });

    res.json({
      success: true,
      message: `Comando de actualización enviado a ${screen.device_id}`,
      version: {
        version_code: latestVersion.version_code,
        version_name: latestVersion.version_name,
      },
    });
  } catch (err) {
    console.error('[sendUpdateCommand] Error:', err);
    const statusCode = err.message.includes('no encontrada') ? 404 :
                       err.message.includes('permiso') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

const sendUpdateCommandToAll = async (req, res) => {
  try {
    // Only super admin can send update commands
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super admin puede enviar actualizaciones' });
    }

    // Get latest APK version
    const { ApkVersion, Screen } = require('../models');
    const latestVersion = await ApkVersion.findOne({
      where: { is_active: true },
      order: [['version_code', 'DESC']],
    });

    if (!latestVersion) {
      return res.status(404).json({ error: 'No hay versiones de APK disponibles' });
    }

    // Get all online screens
    const onlineScreens = await Screen.findAll({
      where: { status: 'online' },
      attributes: ['id', 'device_id', 'name', 'current_apk_version'],
    });

    if (onlineScreens.length === 0) {
      return res.status(404).json({ error: 'No hay pantallas online para actualizar' });
    }

    // Filter screens that need update (current version < latest version)
    const screensNeedingUpdate = onlineScreens.filter(
      screen => (screen.current_apk_version || 1) < latestVersion.version_code
    );

    if (screensNeedingUpdate.length === 0) {
      return res.json({
        success: true,
        message: 'Todas las pantallas online ya tienen la última versión',
        sent_to: 0,
        already_updated: onlineScreens.length,
        version: {
          version_code: latestVersion.version_code,
          version_name: latestVersion.version_name,
        },
      });
    }

    // Prepare MQTT command
    const updateCommand = {
      type: 'update_apk',
      version_code: latestVersion.version_code,
      version_name: latestVersion.version_name,
      download_url: `${process.env.BACKEND_URL}/api/apk/download/${latestVersion.id}`,
      sha256: latestVersion.sha256,
    };

    // Send command only to screens that need update
    let sentCount = 0;
    for (const screen of screensNeedingUpdate) {
      try {
        publishCommand(screen.device_id, updateCommand);
        sentCount++;
        
        // Log audit for each screen
        await logAudit({
          userId: req.user.companyId,
          userName: req.user.username,
          action: 'update',
          resourceType: 'Screen',
          resourceId: screen.id,
          resourceName: screen.name,
          oldValues: { apk_version: screen.current_apk_version || 1 },
          newValues: { command: 'update_apk_broadcast', target_version: latestVersion.version_name },
          companyId: req.user.companyId,
        });
      } catch (err) {
        console.error(`[sendUpdateCommandToAll] Error enviando a ${screen.device_id}:`, err);
      }
    }

    const alreadyUpdated = onlineScreens.length - screensNeedingUpdate.length;
    
    res.json({
      success: true,
      message: `Actualización enviada a ${sentCount} pantalla${sentCount !== 1 ? 's' : ''}${alreadyUpdated > 0 ? `. ${alreadyUpdated} ya tenía${alreadyUpdated !== 1 ? 'n' : ''} la última versión` : ''}`,
      sent_to: sentCount,
      already_updated: alreadyUpdated,
      version: {
        version_code: latestVersion.version_code,
        version_name: latestVersion.version_name,
      },
    });
  } catch (err) {
    console.error('[sendUpdateCommandToAll] Error:', err);
    res.status(500).json({ error: err.message || 'Error enviando actualización' });
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
  sendUpdateCommand,
  sendUpdateCommandToAll,
};
