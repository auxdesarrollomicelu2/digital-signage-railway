import { useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';

export default function CompanyForm({ company, onClose, onSuccess }) {
  const isEditing = !!company;

  const [form, setForm] = useState({
    name: company?.name || '',
    username: company?.username || '',
    email: company?.email || '',
    password: '',
    role: company?.role || 'owner',
    document_type: company?.document_type || '',
    document: company?.document || '',
    phone: company?.phone || '',
    active: company?.active !== undefined ? company.active : true,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...form };
      
      // Si estamos editando y no se cambió la password, no la enviamos
      if (isEditing && !payload.password) {
        delete payload.password;
      }

      if (isEditing) {
        await api.put(`/companies/${company.id}`, payload);
        toast.success('Empresa actualizada exitosamente');
      } else {
        await api.post('/companies', payload);
        toast.success('Empresa creada exitosamente');
      }

      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error guardando empresa');
      console.error('Error saving company:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header con gradiente */}
        <div className="shrink-0 bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white sm:text-2xl">
                {isEditing ? '✏️ Editar Empresa' : '✨ Nueva Empresa'}
              </h3>
              <p className="mt-1.5 text-sm text-indigo-100">
                {isEditing
                  ? 'Actualiza la información de la empresa'
                  : 'Completa los datos para crear una nueva empresa en el sistema'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form - con scroll suave */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            {/* Información básica */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  Información Básica
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Nombre de empresa - span 2 */}
                <div className="sm:col-span-2">
                  <label htmlFor="company-name" className="mb-2 block text-sm font-semibold text-gray-700">
                    Nombre de la Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Mi Empresa S.A.S"
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Tipo de documento */}
                <div>
                  <label htmlFor="company-doc-type" className="mb-2 block text-sm font-semibold text-gray-700">
                    Tipo de Documento
                  </label>
                  <select
                    id="company-doc-type"
                    value={form.document_type}
                    onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="NIT">NIT</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="RUT">RUT</option>
                  </select>
                </div>

                {/* Número de documento */}
                <div>
                  <label htmlFor="company-doc" className="mb-2 block text-sm font-semibold text-gray-700">
                    Número de Documento
                  </label>
                  <input
                    id="company-doc"
                    type="text"
                    value={form.document}
                    onChange={(e) => setForm({ ...form, document: e.target.value })}
                    placeholder="Ej: 900123456-7"
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="company-email" className="mb-2 block text-sm font-semibold text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="company-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contacto@empresa.com"
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label htmlFor="company-phone" className="mb-2 block text-sm font-semibold text-gray-700">
                    Teléfono
                  </label>
                  <input
                    id="company-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>

            {/* Línea separadora */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            {/* Credenciales de acceso */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  Credenciales de Acceso
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Usuario */}
                <div>
                  <label htmlFor="company-username" className="mb-2 block text-sm font-semibold text-gray-700">
                    Usuario <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="company-username"
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="usuario-empresa"
                    disabled={isEditing}
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {isEditing && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      No se puede cambiar después de crear la empresa
                    </p>
                  )}
                </div>

                {/* Contraseña */}
                <div>
                  <label htmlFor="company-password" className="mb-2 block text-sm font-semibold text-gray-700">
                    Contraseña {!isEditing && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      id="company-password"
                      type={showPassword ? 'text' : 'password'}
                      required={!isEditing}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={isEditing ? 'Dejar vacío si no cambia' : '••••••••'}
                      className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
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
                  {isEditing && (
                    <p className="mt-2 text-xs text-gray-500">
                      💡 Solo completar si deseas cambiar la contraseña
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Línea separadora */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            {/* Rol y estado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  Rol y Estado
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Rol */}
                <div>
                  <label htmlFor="company-role" className="mb-2 block text-sm font-semibold text-gray-700">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="company-role"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="owner">👤 Owner (Administrador de Empresa)</option>
                    <option value="super_admin">⚡ Super Admin (Administrador del Sistema)</option>
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label htmlFor="company-active" className="mb-2 block text-sm font-semibold text-gray-700">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="company-active"
                    required
                    value={form.active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="true">✅ Activa</option>
                    <option value="false">⏸️ Inactiva</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer con botones mejorados */}
        <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 px-6 py-5 sm:px-8">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
        </div>
      </div>
    </div>
  );
}
