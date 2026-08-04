/**
 * Utilidades para manejo de fechas y zonas horarias
 */

/**
 * Convierte una fecha UTC a hora de Bogotá
 * @param {Date|string} date - Fecha en UTC
 * @param {boolean} includeTime - Si incluir hora o solo fecha
 * @returns {string} Fecha formateada en hora de Bogotá
 */
function toBogotaTime(date, includeTime = true) {
  if (!date) return null;
  
  const d = new Date(date);
  
  const options = {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  return d.toLocaleString('es-CO', options);
}

/**
 * Convierte una fecha UTC a ISO string en hora de Bogotá
 * @param {Date|string} date - Fecha en UTC
 * @returns {string} Fecha en formato ISO (YYYY-MM-DD HH:mm:ss)
 */
function toBogotaISO(date) {
  if (!date) return null;
  
  const d = new Date(date);
  
  // Obtener componentes en hora de Bogotá
  const year = d.toLocaleString('en-US', { timeZone: 'America/Bogota', year: 'numeric' });
  const month = d.toLocaleString('en-US', { timeZone: 'America/Bogota', month: '2-digit' });
  const day = d.toLocaleString('en-US', { timeZone: 'America/Bogota', day: '2-digit' });
  const hour = d.toLocaleString('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false });
  const minute = d.toLocaleString('en-US', { timeZone: 'America/Bogota', minute: '2-digit' });
  const second = d.toLocaleString('en-US', { timeZone: 'America/Bogota', second: '2-digit' });
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * Agrega campos de fecha formateada en hora de Bogotá a un objeto
 * @param {Object} obj - Objeto con campos createdAt y updatedAt
 * @returns {Object} Objeto con campos adicionales *_bogota
 */
function addBogotaDates(obj) {
  if (!obj) return obj;
  
  return {
    ...obj,
    createdAt_bogota: obj.createdAt ? toBogotaISO(obj.createdAt) : null,
    updatedAt_bogota: obj.updatedAt ? toBogotaISO(obj.updatedAt) : null,
  };
}

module.exports = {
  toBogotaTime,
  toBogotaISO,
  addBogotaDates,
};
