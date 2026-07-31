const { AuditLog, ScreenLog } = require('../models');

async function logAudit({
  userId,
  userName,
  action,
  resourceType,
  resourceId,
  resourceName,
  oldValues = null,
  newValues = null,
  companyId = null
}) {
  try {
    await AuditLog.create({
      user_id: userId,
      user_name: userName,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      old_values: oldValues,
      new_values: newValues,
      company_id: companyId
    });
  } catch (error) {
    console.error('[Audit] Error:', error.message);
  }
}

async function logScreen({
  screenId,
  screenName,
  deviceId,
  eventType,
  status = null,
  playlistItems = null,
  errorMessage = null,
  companyId = null
}) {
  try {
    await ScreenLog.create({
      screen_id: screenId,
      screen_name: screenName,
      device_id: deviceId,
      event_type: eventType,
      status,
      playlist_items: playlistItems,
      error_message: errorMessage,
      company_id: companyId
    });
  } catch (error) {
    console.error('[ScreenLog] Error:', error.message);
  }
}

module.exports = { logAudit, logScreen };
