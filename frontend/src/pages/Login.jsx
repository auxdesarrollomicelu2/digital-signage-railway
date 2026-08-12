import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { User, Lock } from 'lucide-react';

// Import new Versat UI components
import LoginLayout from '../components/auth/LoginLayout';
import LoginCard from '../components/auth/LoginCard';
import FormHeader from '../components/auth/FormHeader';
import Logo from '../components/ui/Logo';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    password: ''
  });
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return (
      <LoginLayout>
        <p className="text-sm text-gray-400">Redirigiendo…</p>
      </LoginLayout>
    );
  }

  // Validar campo individual
  const validateField = (field, value) => {
    if (!value.trim()) {
      return field === 'username' ? 'Usuario requerido' : 'Contraseña requerida';
    }
    return '';
  };

  // Manejar cambio de username
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    // Limpiar error cuando el usuario empieza a escribir
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }
  };

  // Manejar cambio de password
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    // Limpiar error cuando el usuario empieza a escribir
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  // Validar campo al perder foco
  const handleBlur = (field, value) => {
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar campos antes de enviar
    const usernameError = validateField('username', username);
    const passwordError = validateField('password', password);
    
    if (usernameError || passwordError) {
      setErrors({
        username: usernameError,
        password: passwordError
      });
      return;
    }

    setLoading(true);
    setErrors({ username: '', password: '' });
    
    try {
      await login(username, password);
      toast.success('Bienvenido');
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error de conexión';
      
      // Si son credenciales inválidas (401), marcar ambos campos
      if (err.response?.status === 401) {
        setErrors({
          username: 'Credenciales inválidas',
          password: 'Credenciales inválidas'
        });
        toast.error('Usuario o contraseña incorrectos');
      } else {
        // Otros errores
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <LoginCard>
        {/* Logo */}
        <div className="mb-6 sm:mb-8 md:mb-9 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Header */}
        <FormHeader
          title="Bienvenido"
          subtitle="Ingresa tus credenciales para acceder al sistema"
        />

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 md:mt-9 space-y-4 sm:space-y-5 md:space-y-5">
          <Input
            label="Usuario"
            type="text"
            placeholder="Ingresa tu usuario"
            icon={User}
            value={username}
            onChange={handleUsernameChange}
            onBlur={(e) => handleBlur('username', e.target.value)}
            error={errors.username}
            required
            variant="dark"
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={handlePasswordChange}
            onBlur={(e) => handleBlur('password', e.target.value)}
            error={errors.password}
            required
            autoComplete="current-password"
            variant="dark"
          />

          {/* Submit Button */}
          <div className="pt-2 md:pt-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </div>
        </form>
      </LoginCard>
    </LoginLayout>
  );
}

/* 
========================================
OLD LOGIN CODE (BACKUP - DO NOT DELETE)
========================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Redirigiendo…</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Bienvenido');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl shadow-black/25">
          <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50/95 to-white px-5 pb-4 pt-6">
            <div className="text-center">
              <p className="text-xl font-bold uppercase tracking-[0.18em] text-indigo-600 sm:text-2xl">
                Digital Signage
              </p>
              <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-gray-700 sm:text-xl">Micelu.co</h1>
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4 text-left">
              <h2 className="text-base font-semibold text-gray-900">Iniciar sesión</h2>
              <p className="mt-0.5 text-xs text-gray-500">Por favor introduce tus credenciales</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div>
              <label htmlFor="login-username" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Usuario
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>

            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 text-center text-[11px] text-gray-500">
              Entorno demo: <span className="font-mono text-gray-700">admin</span> / <span className="font-mono text-gray-700">admin123</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
*/
