import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, ToggleLeft, Power } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import MagneticFAB from '../../components/shared/MagneticFAB';
import FilterChipBar from '../../components/shared/FilterChipBar';
import FilterSearchInput from '../../components/shared/FilterSearchInput';
import FilterBarRow from '../../components/shared/FilterBarRow';
import DeleteModal from '../../components/shared/DeleteModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import CompanyCard from '../../components/shared/CompanyCard';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useIdleSheen from '../../hooks/useIdleSheen';
import { useTheme } from '../../context/ThemeContext';
import { FD } from '../../styles/tokens';

export default function Companies() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const sheenActive = useIdleSheen();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    active: '',
  });
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    loadCompanies();
  }, [filters, debouncedSearch]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
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

  const filterFields = useMemo(() => [
    {
      id: 'role', label: 'Rol', icon: ShieldCheck, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todos' },
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'owner', label: 'Owner' },
      ],
    },
    {
      id: 'active', label: 'Estado', icon: ToggleLeft, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todos' },
        { value: 'true', label: 'Activas' },
        { value: 'false', label: 'Inactivas' },
      ],
    },
  ], []);

  function handleFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    const company = toggleTarget;
    const action = company.active ? 'desactivar' : 'activar';
    try {
      await api.put(`/companies/${company.id}`, { active: !company.active });
      toast.success(`Empresa ${action === 'desactivar' ? 'desactivada' : 'activada'} exitosamente`);
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, active: !c.active } : c)));
    } catch (err) {
      toast.error(err.response?.data?.error || `Error al ${action} empresa`);
    } finally {
      setToggleTarget(null);
    }
  }

  async function uploadCompanyImage(company, file) {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('company_id', company.id);
    const { data } = await api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.media[0].url;
  }

  async function handleUploadCover(company, file) {
    try {
      const url = await uploadCompanyImage(company, file);
      const { data } = await api.put(`/companies/${company.id}`, { cover_url: url });
      toast.success('Foto de portada actualizada');
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, cover_url: data.company?.cover_url ?? url } : c)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error subiendo la foto de portada');
    }
  }

  async function handleRemoveCover(company) {
    try {
      await api.put(`/companies/${company.id}`, { cover_url: null });
      toast.success('Foto de portada eliminada');
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, cover_url: null } : c)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error eliminando la foto de portada');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/companies/${deleteTarget.id}/hard-delete`);
      toast.success('Empresa eliminada permanentemente');
      setDeleteTarget(null);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error eliminando empresa');
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = !!(filters.role || filters.active || search);

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.primary, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
          Administración
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 700, color: T.text, fontFamily: FD, letterSpacing: '-.02em' }}>
          Empresas
        </h1>
        <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 3 }}>
          {companies.length} empresa{companies.length === 1 ? '' : 's'}
        </p>
      </div>

      <FilterBarRow>
        <FilterChipBar
          fields={filterFields}
          values={{ role: filters.role, active: filters.active }}
          onChange={handleFilterChange}
          style={{ flex: '0 1 auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <FilterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Nombre, usuario o email…"
            style={{ flex: '0 1 240px', minWidth: 160 }}
          />
        </div>
      </FilterBarRow>

      {loading ? (
        <div className="card" style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              margin: '0 auto', width: 34, height: 34, borderRadius: '80%',
              border: `3px solid ${T.inputBg}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ marginTop: 12, fontSize: 12.5, color: T.textSub }}>Cargando empresas…</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="card" style={{ padding: 44, textAlign: 'center', color: T.textSub, fontSize: 13 }}>
          Sin empresas {hasFilters ? 'con los filtros aplicados' : 'registradas'}.
          {!hasFilters && (
            <button
              onClick={() => navigate('/admin/companies/new')}
              style={{ display: 'block', margin: '10px auto 0', fontSize: 12, color: T.primary, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Crear la primera
            </button>
          )}
        </div>
      ) : (
        <div className="company-grid">
          {companies.map((company, i) => (
            <CompanyCard
              key={company.id}
              company={company}
              onView={() => navigate(`/admin/companies/${company.id}`)}
              onEdit={() => navigate(`/admin/companies/${company.id}/edit`)}
              onToggleActive={() => setToggleTarget(company)}
              onDelete={() => setDeleteTarget(company)}
              onUploadCover={handleUploadCover}
              onRemoveCover={handleRemoveCover}
              delay={i * 45}
              sheenActive={sheenActive}
            />
          ))}
        </div>
      )}

      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.name}
        loading={deleting}
      />

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive}
        icon={Power}
        color={toggleTarget?.active ? T.red : T.green}
        title={toggleTarget?.active ? '¿Desactivar esta empresa?' : '¿Activar esta empresa?'}
        message={
          toggleTarget?.active
            ? <>Vas a desactivar <strong style={{ color: T.text }}>&quot;{toggleTarget?.name}&quot;</strong>. Sus usuarios no podrán acceder hasta que la reactives.</>
            : <>Vas a activar <strong style={{ color: T.text }}>&quot;{toggleTarget?.name}&quot;</strong>. Sus usuarios podrán volver a acceder.</>
        }
        confirmLabel={toggleTarget?.active ? 'Desactivar' : 'Activar'}
      />

      <MagneticFAB onClick={() => navigate('/admin/companies/new')} label="Nueva empresa" icon={Users} color={T.primary} />
    </div>
  );
}
