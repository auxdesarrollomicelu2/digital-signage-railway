import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { hasPermission, hasRole, hasAnyPermission } from '../utils/permissions';

// Componente para proteger rutas según autenticación, roles y permisos
export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  requiredPermissions,
  fallbackPath = '/'
}) {
  const { user, isAuthenticated } = useAuth();

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol específico
  if (requiredRole && !hasRole(user, requiredRole)) {
    return <AccessDenied message="No tienes el rol necesario para acceder a esta sección." fallbackPath={fallbackPath} />;
  }

  // Verificar permiso único
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <AccessDenied message="No tienes permisos para acceder a esta sección." fallbackPath={fallbackPath} />;
  }

  // Verificar múltiples permisos (requiere al menos uno)
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAnyPermission(user, requiredPermissions)) {
      return <AccessDenied message="No tienes los permisos necesarios para acceder a esta sección." fallbackPath={fallbackPath} />;
    }
  }

  return children;
}

// Componente para mostrar mensaje de acceso denegado
function AccessDenied({ message, fallbackPath }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="mb-6 text-sm text-gray-600">{message}</p>
          <Navigate to={fallbackPath} replace />
          <a
            href={fallbackPath}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
