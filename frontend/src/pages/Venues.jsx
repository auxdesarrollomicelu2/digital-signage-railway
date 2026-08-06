import { useState, useEffect, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import useVenueFilters from '../hooks/useVenueFilters';
import useDebouncedValue from '../hooks/useDebouncedValue';
import FilterSearchInput from '../components/shared/FilterSearchInput';
import FilterChipBar from '../components/shared/FilterChipBar';
import FilterBarRow from '../components/shared/FilterBarRow';
import MagneticFAB from '../components/shared/MagneticFAB';
import VenueCard from '../components/shared/VenueCard';
import SedeModal from '../components/shared/SedeModal';
import DeleteModal from '../components/shared/DeleteModal';
import SedeScreensModal from '../components/shared/SedeScreensModal';
import { useTheme } from '../context/ThemeContext';
import { FD } from '../styles/tokens';

export default function Venues() {
  const { T } = useTheme();

  const [venues, setVenues] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [screensModalTarget, setScreensModalTarget] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', description: '' });

  const {
    selectedCompanyId,
    setSelectedCompanyId,
    searchTerm,
    setSearchTerm,
    buildQueryParams,
    isSuperAdmin,
  } = useVenueFilters();

  const hasFilters = (isSuperAdmin && selectedCompanyId !== 'all') || !!searchTerm;
  const totalScreens = venues.reduce((a, v) => a + (v.screenCount || 0), 0);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => { loadVenues(); }, [selectedCompanyId, debouncedSearchTerm]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/companies').then(({ data }) => setCompanies(data)).catch(() => {});
  }, [isSuperAdmin]);

  const filterFields = useMemo(() => {
    if (!isSuperAdmin) return [];
    return [{
      id: 'company', label: 'Empresa', icon: Building2, type: 'select', emptyValue: 'all',
      options: [{ value: 'all', label: 'Todas las empresas' }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))],
    }];
  }, [isSuperAdmin, companies]);

  function handleFilterChange(id, value) {
    if (id === 'company') setSelectedCompanyId(value);
  }

  async function loadVenues() {
    try {
      const queryString = buildQueryParams();
      const url = queryString ? `/venues?${queryString}` : '/venues';
      const { data } = await api.get(url);
      setVenues(data);
    } catch {
      toast.error('Error cargando sedes');
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', address: '', description: '' });
    setShowModal(true);
  }

  function openEdit(venue) {
    setEditing(venue);
    setForm({ name: venue.name, address: venue.address || '', description: venue.description || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/venues/${editing.id}`, form);
        toast.success('Sede actualizada');
      } else {
        await api.post('/venues', form);
        toast.success('Sede creada');
      }
      setShowModal(false);
      loadVenues();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/venues/${deleteTarget.id}`);
      toast.success('Sede eliminada');
      setDeleteTarget(null);
      loadVenues();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error eliminando sede');
    }
  }

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.primary, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
            Gestión
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, color: T.text, fontFamily: FD, letterSpacing: '-.02em' }}>
            Sedes
          </h1>
          <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 3 }}>
            {venues.length} ubicaci{venues.length === 1 ? 'ón' : 'ones'} · {totalScreens} pantalla{totalScreens !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <FilterBarRow>
        {isSuperAdmin && (
          <FilterChipBar
            fields={filterFields}
            values={{ company: selectedCompanyId }}
            onChange={handleFilterChange}
            style={{ flex: '0 1 auto' }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <FilterSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar sede o dirección…"
            style={{ flex: '0 1 240px', minWidth: 160 }}
          />
          <span style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap' }}>
            {venues.length} resultado{venues.length !== 1 ? 's' : ''}
          </span>
        </div>
      </FilterBarRow>

      {venues.length === 0 && (
        <div className="card" style={{ padding: 44, textAlign: 'center', color: T.textSub, fontSize: 13 }}>
          Sin sedes {hasFilters ? 'con los filtros aplicados' : 'registradas'}.
          {!hasFilters && (
            <button
              onClick={openCreate}
              style={{ display: 'block', margin: '10px auto 0', fontSize: 12, color: T.primary, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Crear la primera
            </button>
          )}
        </div>
      )}

      {venues.length > 0 && (
        <div className="sede-grid">
          {venues.map((venue, i) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              empresaName={isSuperAdmin ? venue.Company?.name : null}
              onEdit={() => openEdit(venue)}
              onDelete={() => setDeleteTarget(venue)}
              onViewScreens={() => setScreensModalTarget(venue)}
              onCoverUploaded={(updated) => setVenues((prev) => prev.map((v) => (v.id === updated.id ? { ...v, cover_url: updated.cover_url } : v)))}
              delay={i * 45}
            />
          ))}
        </div>
      )}

      <SedeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        isEdit={!!editing}
      />
      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.name}
      />
      {screensModalTarget && (
        <SedeScreensModal sede={screensModalTarget} onClose={() => setScreensModalTarget(null)} />
      )}

      <MagneticFAB onClick={openCreate} label="Nueva sede" icon={Building2} color={T.primary} />
    </div>
  );
}
