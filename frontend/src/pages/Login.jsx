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
    // Prevenir el comportamiento por defecto del formulario
    e.preventDefault();
    e.stopPropagation();
    
    // Validar campos antes de enviar
    const usernameError = validateField('username', username);
    const passwordError = validateField('password', password);
    
    if (usernameError || passwordError) {
      setErrors({
        username: usernameError,
        password: passwordError
      });
      // Mostrar toast de error para que sea más visible
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setErrors({ username: '', password: '' });
    
    try {
      await login(username, password);
      toast.success('Bienvenido');
      navigate('/', { replace: true });
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
        <form 
          onSubmit={handleSubmit} 
          className="mt-6 sm:mt-8 md:mt-9 space-y-4 sm:space-y-5 md:space-y-5"
          noValidate
        >
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
            autoComplete="username"
            name="username"
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
            name="password"
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
