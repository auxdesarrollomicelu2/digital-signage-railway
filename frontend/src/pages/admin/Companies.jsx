import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    active: '',
  });

  useEffect(() => {
    loadCompanies();
  }, [filters]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.active !== '') params.append('active', filters.active);

      const { data } = await api.get(`/companies?${params.toString()}`);
      setCompanies(data);
    } catch (err) {
      toast.error('Error cargando empresas');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(company) {
    const action = company.active ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} esta empresa?`)) return;

    try {
      await api.put(`/companies/${company.id}`, {
        active: !company.active,
      });
      toast.success(`Empresa ${action === 'desactivar' ? 'desactivada' : 'activada'} exitosamente`);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.error || `Error al ${action} empresa`);
    }
  }

  async function handleDelete(company) {
    if (company.role === 'super_admin') {
      toast.error('No se puede eliminar una cuenta de super admin');
      return;
    }

    if (!confirm(`¿Eliminar permanentemente "${company.name}"? Esta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      await api.delete(`/companies/${company.id}/hard`);
      toast.success('Empresa eliminada permanentemente');
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error eliminando empresa');
    }
  }

  function getRoleBadge(role) {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 ring-1 ring-purple-600/20">
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-600/20">
        Owner
      </span>
    );
  }

  function getStatusBadge(active) {
    if (active) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Activa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 ring-1 ring-gray-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
        Inactiva
      </span>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Empresas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona todas las empresas del sistema
          </p>
        </div>
        <Link
          to="/admin/companies/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Nueva Empresa
        </Link>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="filter-search" className="mb-1 block text-xs font-medium text-gray-700">
              Buscar
            </label>
            <input
              id="filter-search"
              type="text"
              placeholder="Nombre, usuario o email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label htmlFor="filter-role" className="mb-1 block text-xs font-medium text-gray-700">
              Rol
            </label>
            <select
              id="filter-role"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos</option>
              <option value="super_admin">Super Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-active" className="mb-1 block text-xs font-medium text-gray-700">
              Estado
            </label>
            <select
              id="filter-active"
              value={filters.active}
              onChange={(e) => setFilters({ ...filters, active: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200/80 bg-white py-16 shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="mt-3 text-sm text-gray-500">Cargando empresas...</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm text-gray-500">No se encontraron empresas</p>
          <Link
            to="/admin/companies/new"
            className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Crear la primera
          </Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-gray-900">Listado</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {companies.length} empresa{companies.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[768px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5 sm:px-5">Empresa</th>
                  <th className="px-4 py-2.5 sm:px-5">Usuario</th>
                  <th className="px-4 py-2.5 sm:px-5">Email</th>
                  <th className="px-4 py-2.5 sm:px-5">Rol</th>
                  <th className="px-4 py-2.5 sm:px-5">Estado</th>
                  <th className="px-4 py-2.5 text-right sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr key={company.id} className="transition hover:bg-indigo-50/35">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-semibold text-gray-900">{company.name}</p>
                      {company.document && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {company.document_type}: {company.document}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                        {company.username}
                      </code>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <p className="text-gray-700">{company.email}</p>
                    </td>
                    <td className="px-4 py-3 sm:px-5">{getRoleBadge(company.role)}</td>
                    <td className="px-4 py-3 sm:px-5">{getStatusBadge(company.active)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/companies/${company.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                          title="Ver detalle"
                          aria-label="Ver detalle"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          to={`/admin/companies/${company.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(company)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
                            company.active
                              ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                              : 'text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                          title={company.active ? 'Desactivar' : 'Activar'}
                          aria-label={company.active ? 'Desactivar' : 'Activar'}
                        >
                          {company.active ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        {company.role !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(company)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
