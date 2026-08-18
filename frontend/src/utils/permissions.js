// Sistema de permisos: define roles y permisos de forma escalable

// Definición de roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  // Aquí se pueden agregar más roles en el futuro:
  // VIEWER: 'viewer',
  // EDITOR: 'editor',
  // MANAGER: 'manager',
};

// Definición de permisos
export const PERMISSIONS = {
  // Companies
  COMPANIES_VIEW: 'companies.view',
  COMPANIES_CREATE: 'companies.create',
  COMPANIES_EDIT: 'companies.edit',
  COMPANIES_DELETE: 'companies.delete',

  // Venues
  VENUES_VIEW: 'venues.view',
  VENUES_CREATE: 'venues.create',
  VENUES_EDIT: 'venues.edit',
  VENUES_DELETE: 'venues.delete',

  // Screens
  SCREENS_VIEW: 'screens.view',
  SCREENS_CREATE: 'screens.create',
  SCREENS_EDIT: 'screens.edit',
  SCREENS_DELETE: 'screens.delete',
  SCREENS_CONTROL: 'screens.control', // Enviar comandos

  // Media
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',

  // Playlists
  PLAYLIST_VIEW: 'playlist.view',
  PLAYLIST_EDIT: 'playlist.edit',

  // Auditoría
  AUDIT_VIEW_ALL: 'audit.view.all', // Ver logs de todas las empresas
  AUDIT_VIEW_OWN: 'audit.view.own', // Ver solo logs de su empresa

  // Sistema
  SYSTEM_DASHBOARD: 'system.dashboard', // Dashboard global del sistema
  SYSTEM_SETTINGS: 'system.settings', // Configuraciones del sistema
};

// Mapa de permisos por rol
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // Companies (solo super admin)
    PERMISSIONS.COMPANIES_VIEW,
    PERMISSIONS.COMPANIES_CREATE,
    PERMISSIONS.COMPANIES_EDIT,
    PERMISSIONS.COMPANIES_DELETE,

    // Venues (todas las empresas)
    PERMISSIONS.VENUES_VIEW,
    PERMISSIONS.VENUES_CREATE,
    PERMISSIONS.VENUES_EDIT,
    PERMISSIONS.VENUES_DELETE,

    // Screens (todas las empresas)
    PERMISSIONS.SCREENS_VIEW,
    PERMISSIONS.SCREENS_CREATE,
    PERMISSIONS.SCREENS_EDIT,
    PERMISSIONS.SCREENS_DELETE,
    PERMISSIONS.SCREENS_CONTROL,

    // Media (todas las empresas)
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,

    // Playlists (todas las empresas)
    PERMISSIONS.PLAYLIST_VIEW,
    PERMISSIONS.PLAYLIST_EDIT,

    // Auditoría (todo el sistema)
    PERMISSIONS.AUDIT_VIEW_ALL,

    // Sistema
    PERMISSIONS.SYSTEM_DASHBOARD,
    PERMISSIONS.SYSTEM_SETTINGS,
  ],

  [ROLES.OWNER]: [
    // Venues (solo su empresa)
    PERMISSIONS.VENUES_VIEW,
    PERMISSIONS.VENUES_CREATE,
    PERMISSIONS.VENUES_EDIT,
    PERMISSIONS.VENUES_DELETE,

    // Screens (solo su empresa)
    PERMISSIONS.SCREENS_VIEW,
    PERMISSIONS.SCREENS_CREATE,
    PERMISSIONS.SCREENS_EDIT,
    PERMISSIONS.SCREENS_DELETE,
    PERMISSIONS.SCREENS_CONTROL,

    // Media (solo su empresa)
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,

    // Playlists (solo su empresa)
    PERMISSIONS.PLAYLIST_VIEW,
    PERMISSIONS.PLAYLIST_EDIT,

    // Auditoría (solo su empresa)
    PERMISSIONS.AUDIT_VIEW_OWN,
  ],
};

// Verifica si un usuario tiene un permiso específico
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

// Verifica si un usuario tiene al menos uno de los permisos especificados
export function hasAnyPermission(user, permissions) {
  if (!user || !user.role) return false;
  
  return permissions.some(permission => hasPermission(user, permission));
}

// Verifica si un usuario tiene todos los permisos especificados
export function hasAllPermissions(user, permissions) {
  if (!user || !user.role) return false;
  
  return permissions.every(permission => hasPermission(user, permission));
}

// Verifica si un usuario tiene un rol específico
export function hasRole(user, role) {
  if (!user || !user.role) return false;
  
  return user.role === role;
}

// Verifica si un usuario es super admin
export function isSuperAdmin(user) {
  return hasRole(user, ROLES.SUPER_ADMIN);
}

// Verifica si un usuario es owner
export function isOwner(user) {
  return hasRole(user, ROLES.OWNER);
}

// Obtiene todos los permisos de un usuario
export function getUserPermissions(user) {
  if (!user || !user.role) return [];
  
  return ROLE_PERMISSIONS[user.role] || [];
}
