import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import useFormValidation from '../../hooks/useFormValidation';
import { validationRules, normalizers } from '../../utils/validation';
import Alert from '../../components/ui/Alert';

export default function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const initialValues = {
    name: '',
    username: '',
    email: '',
    password: '',
    currentPassword: '',
    role: 'owner',
    document_type: '',
    document: '',
    phone: '',
    active: true,
  };

  const fieldRules = {
    name: [
      (value) => validationRules.required(value, 'Nombre de la empresa')
    ],
    username: [
      (value) => validationRules.required(value, 'Usuario'),
      validationRules.username,
      validationRules.noSpaces
    ],
    email: [
      (value) => validationRules.required(value, 'Email'),
      validationRules.email
    ],
    password: isEditing 
      ? [] 
      : [
          (value) => validationRules.required(value, 'Contraseña'),
          validationRules.minLength(6)
        ],
    document_type: [
      (value) => validationRules.required(value, 'Tipo de documento')
    ],
    document: [
      (value) => validationRules.required(value, 'Número de documento'),
      validationRules.documentNumber
    ],
    phone: [
      validationRules.phone
    ]
  };

  const fieldNormalizers = {
    email: normalizers.emailFormat,
    username: normalizers.usernameFormat,
    document: normalizers.numbersAndHyphens,
    phone: normalizers.numbersOnly
  };

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    setValues
  } = useFormValidation(initialValues, fieldRules, fieldNormalizers);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      loadCompany();
    }
  }, [id]);

  async function loadCompany() {
    try {
      setLoadingData(true);
      const { data } = await api.get(`/companies/${id}`);
      setValues({
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        password: '',
        currentPassword: '',
        role: data.role || 'owner',
        document_type: data.document_type || '',
        document: data.document || '',
        phone: data.phone || '',
        active: data.active !== undefined ? data.active : true,
      });
    } catch (err) {
      toast.error('Error cargando empresa');
      navigate('/admin/companies');
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!validateAll()) {
      setFormError('Por favor corrige los errores en el formulario');
      return;
    }

    setLoading(true);

    try {
      const payload = { ...values };
      
      if (isEditing) {
        if (payload.password && !payload.currentPassword) {
          setFormError('Debes proporcionar la contraseña actual para cambiar la contraseña');
          setLoading(false);
          return;
        }
        
        if (!payload.password) {
          delete payload.password;
          delete payload.currentPassword;
        }
      } else {
        delete payload.currentPassword;
      }

      if (isEditing) {
        await api.put(`/companies/${id}`, payload);
        toast.success('Empresa actualizada exitosamente');
      } else {
        await api.post('/companies', payload);
        toast.success('Empresa creada exitosamente');
      }

      navigate('/admin/companies');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error guardando empresa');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-4 text-sm text-gray-500">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enter mx-auto w-full max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link
          to="/admin/companies"
          className="text-gray-500 transition hover:text-indigo-600"
        >
          Empresas
        </Link>
        <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold text-gray-900">
          {isEditing ? 'Editar' : 'Nueva'}
        </span>
      </nav>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
                </h1>
                <p className="mt-1 text-indigo-100">
                  {isEditing
                    ? 'Actualiza la información de la empresa'
                    : 'Completa los datos para registrar una nueva empresa'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error general del formulario */}
        {formError && (
          <Alert
            type="error"
            title="Error en el formulario"
            message={formError}
            onClose={() => setFormError(null)}
          />
        )}

        {/* Información básica */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Nombre de empresa - span 2 */}
              <div className="sm:col-span-2">
                <label htmlFor="company-name" className="mb-2 block text-sm font-semibold text-gray-700">
                  Nombre de la Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={values.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="Ej: Mi Empresa S.A.S"
                  className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-4 ${
                    errors.name && touched.name
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                />
                {errors.name && touched.name && (
                  <p className="mt-2 text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Tipo de documento */}
              {/* Tipo de documento */}
              <div>
                <label htmlFor="company-doc-type" className="mb-2 block text-sm font-semibold text-gray-700">
                  Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <select
                  id="company-doc-type"
                  value={values.document_type}
                  onChange={(e) => handleChange('document_type', e.target.value)}
                  onBlur={() => handleBlur('document_type')}
                  className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:bg-white focus:ring-4 ${
                    errors.document_type && touched.document_type
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="NIT">NIT</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="RUT">RUT</option>
                </select>
                {errors.document_type && touched.document_type && (
                  <p className="mt-2 text-xs text-red-600">{errors.document_type}</p>
                )}
              </div>

              {/* Número de documento */}
              <div>
                <label htmlFor="company-doc" className="mb-2 block text-sm font-semibold text-gray-700">
                  Número de Documento <span className="text-red-500">*</span>
                </label>
                <input
                  id="company-doc"
                  type="text"
                  value={values.document}
                  onChange={(e) => handleChange('document', e.target.value)}
                  onBlur={() => handleBlur('document')}
                  placeholder="Ej: 900123456-7"
                  className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-4 ${
                    errors.document && touched.document
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                />
                {errors.document && touched.document && (
                  <p className="mt-2 text-xs text-red-600">{errors.document}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="company-email" className="mb-2 block text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="company-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="contacto@empresa.com"
                  className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-4 ${
                    errors.email && touched.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                />
                {errors.email && touched.email && (
                  <p className="mt-2 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="company-phone" className="mb-2 block text-sm font-semibold text-gray-700">
                  Teléfono
                </label>
                <input
                  id="company-phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="3001234567"
                  className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-4 ${
                    errors.phone && touched.phone
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                />
                {errors.phone && touched.phone && (
                  <p className="mt-2 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Credenciales de acceso */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Credenciales de Acceso</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Usuario */}
              <div>
                <label htmlFor="company-username" className="mb-2 block text-sm font-semibold text-gray-700">
                  Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  id="company-username"
                  type="text"
                  value={values.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  onBlur={() => handleBlur('username')}
                  placeholder="usuarioempresa"
                  disabled={isEditing}
                  className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 font-mono text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors.username && touched.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                />
                {errors.username && touched.username && !isEditing && (
                  <p className="mt-2 text-xs text-red-600">{errors.username}</p>
                )}
                {isEditing && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-amber-800">
                      El usuario no se puede cambiar después de crear la empresa
                    </p>
                  </div>
                )}
              </div>

              {/* Contraseña Actual - solo en edición */}
              {isEditing && (
                <div>
                  <label htmlFor="company-current-password" className="mb-2 block text-sm font-semibold text-gray-700">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      id="company-current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={values.currentPassword}
                      onChange={(e) => handleChange('currentPassword', e.target.value)}
                      placeholder="Ingresa la contraseña actual"
                      className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Requerida si deseas cambiar la contraseña
                  </p>
                </div>
              )}

              {/* Contraseña / Nueva Contraseña */}
              <div>
                <label htmlFor="company-password" className="mb-2 block text-sm font-semibold text-gray-700">
                  {isEditing ? 'Nueva Contraseña' : 'Contraseña'} {!isEditing && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    id="company-password"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    placeholder={isEditing ? 'Dejar vacío si no deseas cambiar' : '••••••••'}
                    className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 pr-11 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-4 ${
                      errors.password && touched.password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && touched.password && (
                  <p className="mt-2 text-xs text-red-600">{errors.password}</p>
                )}
                {isEditing && !errors.password && (
                  <p className="mt-2 text-xs text-gray-500">
                    Completar solo si deseas cambiarla
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rol y estado */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Rol y Estado</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Rol */}
              <div>
                <label htmlFor="company-role" className="mb-2 block text-sm font-semibold text-gray-700">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  id="company-role"
                  value={values.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="owner">Owner (Administrador de Empresa)</option>
                  <option value="super_admin">Super Admin (Administrador del Sistema)</option>
                </select>
              </div>

              {/* Estado */}
              <div>
                <label htmlFor="company-active" className="mb-2 block text-sm font-semibold text-gray-700">
                  Estado <span className="text-red-500">*</span>
                </label>
                <select
                  id="company-active"
                  value={values.active ? 'true' : 'false'}
                  onChange={(e) => handleChange('active', e.target.value === 'true')}
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            to="/admin/companies"
            className="inline-flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                {isEditing ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Cambios
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Empresa
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
