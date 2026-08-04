import { useAuth } from '../AuthContext';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  isSuperAdmin,
  isOwner,
  getUserPermissions,
  ROLES,
  PERMISSIONS,
} from '../utils/permissions';

/**
 * Hook personalizado para manejar permisos
 * Facilita el uso del sistema de permisos en componentes
 * 
 * Ejemplo de uso:
 * 
 * function MyComponent() {
 *   const { can, canAny, canAll, is, isSuperAdmin } = usePermissions();
 *   
 *   if (isSuperAdmin) {
 *     return <AdminPanel />;
 *   }
 *   
 *   if (can('venues.create')) {
 *     return <CreateVenueButton />;
 *   }
 *   
 *   return <ReadOnlyView />;
 * }
 */
export default function usePermissions() {
  const { user } = useAuth();

  return {
    // Verificar un permiso específico
    can: (permission) => hasPermission(user, permission),

    // Verificar si tiene al menos uno de los permisos
    canAny: (permissions) => hasAnyPermission(user, permissions),

    // Verificar si tiene todos los permisos
    canAll: (permissions) => hasAllPermissions(user, permissions),

    // Verificar rol específico
    is: (role) => hasRole(user, role),

    // Verificadores de roles comunes
    isSuperAdmin: isSuperAdmin(user),
    isOwner: isOwner(user),

    // Obtener todos los permisos del usuario
    permissions: getUserPermissions(user),

    // Información del usuario
    user,
    userRole: user?.role,

    // Constantes para uso directo
    ROLES,
    PERMISSIONS,
  };
}
