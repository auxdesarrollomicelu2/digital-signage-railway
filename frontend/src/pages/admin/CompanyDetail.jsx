import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' o 'screens'

  useEffect(() => {
    loadCompany();
  }, [id]);

  async function loadCompany() {
    try {
      setLoading(true);
      const { data } = await api.get(`/companies/${id}`);
      setCompany(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error cargando empresa');
      navigate('/admin/companies');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    if (!company) return;
    
    const newStatus = !company.active;
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de ${action} esta empresa?`)) return;

    try {
      await api.put(`/companies/${id}`, { active: newStatus });
      toast.success(`Empresa ${newStatus ? 'activada' : 'desactivada'} exitosamente`);
      loadCompany();
    } catch (err) {
      toast.error(err.response?.data?.error || `Error al ${action} empresa`);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-4 text-sm text-gray-500">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Empresa no encontrada</p>
      </div>
    );
  }

  // Obtener todas las pantallas de todas las sedes
  const allScreens = company.Venues?.flatMap(venue => 
    (venue.Screens || []).map(screen => ({
      ...screen,
      venueName: venue.name,
      venueId: venue.id,
    }))
  ) || [];

  return (
    <div className="enter mx-auto w-full max-w-7xl space-y-6">
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
        <span className="font-semibold text-gray-900">{company.name}</span>
      </nav>

      {/* Header con acciones */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <p className="mt-1 text-indigo-100">
              {company.role === 'super_admin' ? 'Super Administrador' : 'Propietario'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/admin/companies/${id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Link>
            {company.role !== 'super_admin' && (
              <button
                type="button"
                onClick={handleToggleActive}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                  company.active
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {company.active ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Desactivar
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna izquierda - Información */}
        <div className="space-y-6 lg:col-span-4">
          {/* Información básica */}
          <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Información Básica
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500">Usuario</dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-gray-900">{company.username}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{company.email}</dd>
              </div>
              {company.phone && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Teléfono</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.phone}</dd>
                </div>
              )}
              {company.document_type && company.document && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Documento</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {company.document_type}: {company.document}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">Rol</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    company.role === 'super_admin'
                      ? 'bg-purple-50 text-purple-800 ring-purple-600/20'
                      : 'bg-blue-50 text-blue-800 ring-blue-600/20'
                  }`}>
                    {company.role === 'super_admin' ? 'Super Admin' : 'Owner'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Estado</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    company.active
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                      : 'bg-red-50 text-red-800 ring-red-600/20'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${company.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {company.active ? 'Activa' : 'Inactiva'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Fecha de creación</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(company.createdAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </section>

          {/* Estadísticas */}
          <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Estadísticas
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-2xl font-bold text-blue-900">{company.stats?.totalVenues || 0}</div>
                <div className="mt-1 text-xs font-medium text-blue-700">Sedes</div>
              </div>
              <div className="rounded-xl bg-violet-50 p-4">
                <div className="text-2xl font-bold text-violet-900">{company.stats?.totalScreens || 0}</div>
                <div className="mt-1 text-xs font-medium text-violet-700">Pantallas</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="text-2xl font-bold text-emerald-900">{company.stats?.screensOnline || 0}</div>
                <div className="mt-1 text-xs font-medium text-emerald-700">En línea</div>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <div className="text-2xl font-bold text-red-900">{company.stats?.screensOffline || 0}</div>
                <div className="mt-1 text-xs font-medium text-red-700">Fuera de línea</div>
              </div>
            </div>
          </section>
        </div>

        {/* Columna derecha - Sedes y Pantallas */}
        <div className="lg:col-span-8">
          <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('venues')}
                  className={`border-b-2 px-6 py-4 text-sm font-semibold transition ${
                    activeTab === 'venues'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Sedes ({company.Venues?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('screens')}
                  className={`border-b-2 px-6 py-4 text-sm font-semibold transition ${
                    activeTab === 'screens'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Pantallas ({allScreens.length})
                </button>
              </nav>
            </div>

            {/* Contenido de tabs */}
            <div className="p-6">
              {activeTab === 'venues' && (
                <div>
                  {!company.Venues || company.Venues.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">
                      Esta empresa no tiene sedes registradas
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {company.Venues.map((venue) => (
                        <div
                          key={venue.id}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:bg-gray-100/50"
                        >
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900">{venue.name}</h3>
                            {venue.address && (
                              <p className="mt-1 text-sm text-gray-600">{venue.address}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              {venue.Screens?.length || 0} pantalla{venue.Screens?.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="ml-4 flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {venue.Screens?.length || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'screens' && (
                <div>
                  {allScreens.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">
                      Esta empresa no tiene pantallas registradas
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            <th className="pb-3">Pantalla</th>
                            <th className="pb-3">Sede</th>
                            <th className="pb-3">Device ID</th>
                            <th className="pb-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {allScreens.map((screen) => (
                            <tr key={screen.id} className="transition hover:bg-gray-50/50">
                              <td className="py-3">
                                <Link
                                  to={`/screens/${screen.id}`}
                                  className="font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  {screen.name}
                                </Link>
                              </td>
                              <td className="py-3 text-gray-700">{screen.venueName}</td>
                              <td className="py-3">
                                <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                                  {screen.device_id}
                                </code>
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                                  screen.status === 'online'
                                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                                    : 'bg-red-50 text-red-800 ring-red-600/20'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${screen.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  {screen.status === 'online' ? 'En línea' : 'Fuera de línea'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
