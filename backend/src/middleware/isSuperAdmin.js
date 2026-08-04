/**
 * Middleware para verificar que el usuario autenticado sea Super Admin
 * Solo los super admins pueden gestionar empresas
 */
function isSuperAdmin(req, res, next) {
  // req.user viene del middleware auth.js
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo super administradores pueden realizar esta acción.' 
    });
  }

  next();
}

module.exports = isSuperAdmin;
