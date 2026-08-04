import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';

// Mapeo de acciones a español y colores
const ACTION_MAP = {
  create: { label: 'Crear', color: 'emerald' },
  update: { label: 'Actualizar', color: 'blue' },
  delete: { label: 'Eliminar', color: 'red' },
};

// Mapeo de tipos de recursos a español
const RESOURCE_TYPE_MAP = {
  Company: 'Empresa',
  Venue: 'Sede',
  Screen: 'Pantalla',
  Media: 'Media',
  Playlist: 'Playlist',
  User: 'Usuario',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
  
  // Filtros
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    user_name: '',
    company_id: '',
    start_date: '',
    end_date: '',
  });

  const [companies, setCompanies] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters]);

  async function loadCompanies() {
    try {
      const { data } = await api.get('/companies');
      setCompanies(data);
    } catch {
      // Ignorar error
    }
  }

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Agregar filtros solo si tienen valor
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const { data } = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error cargando logs');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 }); // Reset a página 1 al filtrar
  }

  function clearFilters() {
    setFilters({
      action: '',
      resource_type: '',
      user_name: '',
      company_id: '',
      start_date: '',
      end_date: '',
    });
    setPagination({ ...pagination, page: 1 });
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  function getActionBadge(action) {
    const config = ACTION_MAP[action] || { label: action, color: 'gray' };
    const colorClasses = {
      emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
      blue: 'bg-blue-50 text-blue-800 ring-blue-600/20',
      red: 'bg-red-50 text-red-800 ring-red-600/20',
      gray: 'bg-gray-50 text-gray-800 ring-gray-600/20',
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${colorClasses[config.color]}`}>
        {config.label}
      </span>
    );
  }

  function toggleRowExpansion(logId) {
    setExpandedRow(expandedRow === logId ? null : logId);
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Logs de Auditoría</h2>
        <p className="mt-1 text-sm text-gray-500">
          Historial completo de acciones realizadas en el sistema
        </p>
      </div>

      {/* Filtros */}
      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Acción */}
            <div>
              <label htmlFor="filter-action" className="mb-1.5 block text-xs font-medium text-gray-700">
                Acción
              </label>
              <select
                id="filter-action"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Todas</option>
                <option value="create">Crear</option>
                <option value="update">Actualizar</option>
                <option value="delete">Eliminar</option>
              </select>
            </div>

            {/* Tipo de Recurso */}
            <div>
              <label htmlFor="filter-resource" className="mb-1.5 block text-xs font-medium text-gray-700">
                Tipo de Recurso
              </label>
              <select
                id="filter-resource"
                value={filters.resource_type}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Todos</option>
                {Object.entries(RESOURCE_TYPE_MAP).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Usuario */}
            <div>
              <label htmlFor="filter-user" className="mb-1.5 block text-xs font-medium text-gray-700">
                Usuario
              </label>
              <input
                id="filter-user"
                type="text"
                value={filters.user_name}
                onChange={(e) => handleFilterChange('user_name', e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Empresa */}
            <div>
              <label htmlFor="filter-company" className="mb-1.5 block text-xs font-medium text-gray-700">
                Empresa
              </label>
              <select
                id="filter-company"
                value={filters.company_id}
                onChange={(e) => handleFilterChange('company_id', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Inicio */}
            <div>
              <label htmlFor="filter-start" className="mb-1.5 block text-xs font-medium text-gray-700">
                Fecha Inicio
              </label>
              <input
                id="filter-start"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Fecha Fin */}
            <div>
              <label htmlFor="filter-end" className="mb-1.5 block text-xs font-medium text-gray-700">
                Fecha Fin
              </label>
              <input
                id="filter-end"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Botón Limpiar Filtros */}
          {(filters.action || filters.resource_type || filters.user_name || filters.company_id || filters.start_date || filters.end_date) && (
            <div className="mt-4">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Tabla de Logs */}
      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Registros</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {pagination.total} registro{pagination.total === 1 ? '' : 's'} en total
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
              <p className="mt-3 text-sm text-gray-500">Cargando logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-gray-500">No se encontraron registros</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Acción</th>
                    <th className="px-5 py-3">Recurso</th>
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3 text-center">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="transition hover:bg-gray-50/50">
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-600">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-gray-900">{log.user_name}</span>
                        </td>
                        <td className="px-5 py-3">{getActionBadge(log.action)}</td>
                        <td className="px-5 py-3 text-gray-700">
                          {RESOURCE_TYPE_MAP[log.resource_type] || log.resource_type}
                        </td>
                        <td className="max-w-xs truncate px-5 py-3 text-gray-700" title={log.resource_name}>
                          {log.resource_name || '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {log.Company?.name || '—'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {(log.old_values || log.new_values) && (
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(log.id)}
                              className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                            >
                              {expandedRow === log.id ? 'Ocultar' : 'Ver'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedRow === log.id && (
                        <tr>
                          <td colSpan="7" className="bg-gray-50/50 px-5 py-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              {log.old_values && (
                                <div>
                                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Valores Anteriores
                                  </h4>
                                  <pre className="overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-800">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Valores Nuevos
                                  </h4>
                                  <pre className="overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-800">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.totalPages}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
