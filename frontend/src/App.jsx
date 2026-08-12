import { Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Venues from './pages/Venues';
import Screens from './pages/Screens';
import MediaPage from './pages/Media';
import ScreenDetail from './pages/ScreenDetail';
import Companies from './pages/admin/Companies';
import CompanyFormPage from './pages/admin/CompanyForm';
import CompanyDetail from './pages/admin/CompanyDetail';
import AuditLogs from './pages/admin/AuditLogs';
import { ROLES } from './utils/permissions';
import CustomToast from './components/ui/CustomToast';

if (typeof window !== 'undefined') {
  window.toast = toast;
}

function AuthenticatedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          // Estilos base para todos los toasts
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            margin: 0,
          },
          // Duración por tipo
          success: {
            duration: 3500,
          },
          error: {
            duration: 6000, 
          },
          // Renderizado personalizado
          className: '',
        }}
        containerStyle={{
          top: 20,
          right: 20,
        }}
      >
        {(t) => {
          // Detectar tipo de toast basado en el tipo nativo y className
          let type = 'info';
          if (t.type === 'success') type = 'success';
          if (t.type === 'error') type = 'error';
          if (t.type === 'loading') type = 'info';
          if (t.className?.includes('toast-warning')) type = 'warning';
          if (t.className?.includes('toast-info')) type = 'info';
          
          // Extraer mensaje del toast
          const message = typeof t.message === 'string' ? t.message : 'Notificación';
          
          return <CustomToast t={t} message={message} type={type} />;
        }}
      </Toaster>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthenticatedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/venues" element={<Venues />} />
                  <Route path="/screens" element={<Screens />} />
                  <Route path="/screens/:id" element={<ScreenDetail />} />
                  <Route path="/media" element={<MediaPage />} />
                  
                  {/* Rutas de Super Admin */}
                  <Route
                    path="/admin/companies"
                    element={
                      <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                        <Companies />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/companies/new"
                    element={
                      <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                        <CompanyFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/companies/:id"
                    element={
                      <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                        <CompanyDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/companies/:id/edit"
                    element={
                      <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                        <CompanyFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit"
                    element={
                      <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
                        <AuditLogs />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Layout>
            </AuthenticatedRoute>
          }
        />
      </Routes>
    </>
  );
}
