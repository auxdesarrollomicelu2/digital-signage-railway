import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, ToggleLeft } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import MagneticFAB from '../../components/shared/MagneticFAB';
import FilterChipBar from '../../components/shared/FilterChipBar';
import FilterSearchInput from '../../components/shared/FilterSearchInput';
import FilterBarRow from '../../components/shared/FilterBarRow';
import DeleteModal from '../../components/shared/DeleteModal';
import CompanyCard from '../../components/shared/CompanyCard';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useTheme } from '../../context/ThemeContext';
import { FD } from '../../styles/tokens';

export default function Companies() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  async function handleToggleActive(company) {
    const action = company.active ? 'desactivar' : 'activar';
    try {
      await api.put(`/companies/${company.id}`, { active: !company.active });
      toast.success(`Empresa ${action === 'desactivar' ? 'desactivada' : 'activada'} exitosamente`);
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, active: !c.active } : c)));
    } catch (err) {
      toast.error(err.response?.data?.error || `Error al ${action} empresa`);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/companies/${deleteTarget.id}/hard-delete`);
      toast.success('Empresa eliminada permanentemente');
      setDeleteTarget(null);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error eliminando empresa');
    }
  }

  const hasFilters = !!(filters.role || filters.active || search);

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.primary, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
          Administración
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 700, color: T.text, fontFamily: FD, letterSpacing: '-.02em' }}>
          Empresas
        </h1>
        <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
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
        <div className="card" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              margin: '0 auto', width: 34, height: 34, borderRadius: '50%',
              border: `3px solid ${T.inputBg}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ marginTop: 12, fontSize: 12.5, color: T.textMuted }}>Cargando empresas…</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="card" style={{ padding: 44, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
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
              onToggleActive={() => handleToggleActive(company)}
              onDelete={() => setDeleteTarget(company)}
              delay={i * 45}
            />
          ))}
        </div>
      )}

      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.name}
      />

      <MagneticFAB onClick={() => navigate('/admin/companies/new')} label="Nueva empresa" icon={Users} color={T.primary} />
    </div>
  );
}
