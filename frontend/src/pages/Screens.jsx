import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Monitor, Building2, MapPin, Flag } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import useScreenFilters from '../hooks/useScreenFilters';
import useDebouncedValue from '../hooks/useDebouncedValue';
import FilterSearchInput from '../components/shared/FilterSearchInput';
import FilterChipBar from '../components/shared/FilterChipBar';
import FilterBarRow from '../components/shared/FilterBarRow';
import MagneticFAB from '../components/shared/MagneticFAB';
import ScreenCard from '../components/shared/ScreenCard';
import ScreenModal from '../components/shared/ScreenModal';
import DeleteModal from '../components/shared/DeleteModal';
import { useTheme } from '../context/ThemeContext';
import usePermissions from '../hooks/usePermissions';
import { FD } from '../styles/tokens';

export default function Screens() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSuperAdmin } = usePermissions();

  const [screens, setScreens] = useState([]);
  const [venues, setVenues] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', device_id: '', venue_id: '', orientation: 'landscape' });
  const [thumbnails, setThumbnails] = useState({}); // { [screenId]: { url, mime_type } }

  const {
    selectedCompanyId,
    setSelectedCompanyId,
    selectedVenueId,
    setSelectedVenueId,
    selectedStatus,
    setSelectedStatus,
    searchTerm,
    setSearchTerm,
    buildQueryParams,
    resetFilters,
  } = useScreenFilters();

  // Filtro de estado inicial via URL (?status=online|offline) — usado por los
  // enlaces "En línea" / "Fuera de línea" del Dashboard.
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'online' || statusParam === 'offline') {
      setSelectedStatus(statusParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    loadScreens();
    loadVenues();
    const interval = setInterval(() => { if (!document.hidden) loadScreens(); }, 10000);
    return () => clearInterval(interval);
  }, [selectedCompanyId, selectedVenueId, selectedStatus, debouncedSearchTerm]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/companies').then(({ data }) => setCompanies(data)).catch(() => {});
  }, [isSuperAdmin]);

  const filterFields = useMemo(() => {
    const fields = [];
    if (isSuperAdmin) {
      fields.push({
        id: 'company', label: 'Empresa', icon: Building2, type: 'select', emptyValue: 'all',
        options: [{ value: 'all', label: 'Todas las empresas' }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))],
      });
    }
    fields.push({
      id: 'venue', label: 'Sede', icon: MapPin, type: 'select', emptyValue: 'all',
      options: [{ value: 'all', label: 'Todas las sedes' }, ...venues.map((v) => ({ value: String(v.id), label: v.name }))],
    });
    fields.push({
      id: 'status', label: 'Estado', icon: Flag, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todos los estados' },
        { value: 'online', label: 'En línea' },
        { value: 'offline', label: 'Fuera de línea' },
      ],
    });
    return fields;
  }, [isSuperAdmin, companies, venues]);

  const filterValues = { company: selectedCompanyId, venue: selectedVenueId, status: selectedStatus };
  const hasFilters = (isSuperAdmin && selectedCompanyId !== 'all') || selectedVenueId !== 'all' || !!selectedStatus || !!searchTerm;

  function handleFilterChange(id, value) {
    if (id === 'company') setSelectedCompanyId(value);
    else if (id === 'venue') setSelectedVenueId(value);
    else if (id === 'status') setSelectedStatus(value);
  }

  async function loadScreens() {
    try {
      const queryString = buildQueryParams();
      const url = queryString ? `/screens?${queryString}` : '/screens';
      const { data } = await api.get(url);
      setScreens(data);
      loadThumbnails(data);
    } catch {
      toast.error('Error cargando pantallas');
    }
  }

  // Miniatura real: primer contenido de la playlist, solo para pantallas online
  // (evita llamadas innecesarias para pantallas offline, que igual no la muestran).
  async function loadThumbnails(screenList) {
    const onlineScreens = screenList.filter((s) => s.status === 'online');
    if (onlineScreens.length === 0) return;
    const details = await Promise.all(
      onlineScreens.map((s) => api.get(`/screens/${s.id}`).then((r) => r.data).catch(() => null))
    );
    const map = {};
    details.forEach((d, i) => {
      const firstItem = d?.ScreenMedia?.[0];
      if (firstItem?.Media) {
        map[onlineScreens[i].id] = { url: firstItem.Media.url, mime_type: firstItem.Media.mime_type };
      }
    });
    setThumbnails(map);
  }

  async function loadVenues() {
    try {
      const { data } = await api.get('/venues');
      setVenues(data);
    } catch {
      /* ignore */
    }
  }

  async function openCreate() {
    setEditing(null);
    setForm({ name: '', device_id: '', venue_id: venues[0]?.id ? String(venues[0].id) : '', orientation: 'landscape' });
    setShowModal(true);
    
    try {
      const { data } = await api.get('/screens/preview-device-id');
      setForm({ name: '', device_id: data.device_id, venue_id: venues[0]?.id || '', orientation: 'landscape' });
    } catch {
      setForm({ name: '', device_id: '', venue_id: venues[0]?.id || '', orientation: 'landscape' });
    }
  }

  function openEdit(screen) {
    setEditing(screen);
    setForm({
      name: screen.name,
      device_id: screen.device_id,
      venue_id: screen.venue_id ? String(screen.venue_id) : '',
      orientation: screen.orientation || 'landscape',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editing && !form.venue_id) {
      toast.error('La sede es obligatoria');
      return;
    }
    try {
      const payload = { ...form, venue_id: form.venue_id || null };
      if (editing) {
        await api.put(`/screens/${editing.id}`, payload);
        toast.success('Pantalla actualizada');
      } else {
        await api.post('/screens', payload);
        toast.success('Pantalla creada');
      }
      setShowModal(false);
      loadScreens();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/screens/${deleteTarget.id}`);
      toast.success('Pantalla eliminada');
      setDeleteTarget(null);
      loadScreens();
    } catch {
      toast.error('Error eliminando pantalla');
    }
  }

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.primary, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
            Gestión
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, color: T.text, fontFamily: FD, letterSpacing: '-.02em' }}>
            Pantallas
          </h1>
          <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 3 }}>
            {screens.length} dispositivo{screens.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <FilterBarRow>
        <FilterChipBar
          fields={filterFields}
          values={filterValues}
          onChange={handleFilterChange}
          style={{ flex: '0 1 auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <FilterSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nombre o device ID…"
            style={{ flex: '0 1 240px', minWidth: 160 }}
          />
          <span style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap' }}>
            {screens.length} resultado{screens.length !== 1 ? 's' : ''}
          </span>
        </div>
      </FilterBarRow>

      <LayoutGroup>
        <div className="screen-grid">
          <AnimatePresence mode="popLayout">
            {screens.map((screen, i) => (
              <motion.div
                key={screen.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: i * 0.02 }}
              >
                <ScreenCard
                  screen={screen}
                  thumbnail={thumbnails[screen.id]}
                  onView={(s) => navigate(`/screens/${s.id}`)}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  showActions
                  showCompany={isSuperAdmin}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {screens.length === 0 && (
        <div style={{ textAlign: 'center', padding: '44px 0', color: T.textSub, fontSize: 13 }}>
            No hay pantallas {hasFilters ? 'con los filtros aplicados' : 'registradas'}.
            {hasFilters ? (
              <button
                onClick={resetFilters}
                style={{ display: 'block', margin: '10px auto 0', fontSize: 12, color: T.primary, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                onClick={openCreate}
                style={{ display: 'block', margin: '10px auto 0', fontSize: 12, color: T.primary, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Crear la primera
              </button>
            )}
        </div>
      )}

      <ScreenModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        venues={venues}
        isEdit={!!editing}
      />
      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.name}
      />

      <MagneticFAB onClick={openCreate} label="Nueva pantalla" icon={Monitor} color={T.blue} />
    </div>
  );
}
