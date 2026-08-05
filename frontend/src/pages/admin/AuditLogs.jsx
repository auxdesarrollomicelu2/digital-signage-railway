import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Zap, FileType, Building2, CalendarRange, Eye, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import FilterChipBar from '../../components/shared/FilterChipBar';
import FilterSearchInput from '../../components/shared/FilterSearchInput';
import FilterBarRow from '../../components/shared/FilterBarRow';
import AuditLogDrawer from '../../components/admin/AuditLogDrawer';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useTheme } from '../../context/ThemeContext';
import { FD } from '../../styles/tokens';
import { ACTION_MAP, RESOURCE_TYPE_MAP } from '../../utils/auditLogConstants';

const PAGE_LIMIT = 10;
const GRID_COLS = '200px 150px 140px 120px minmax(220px,380px) 90px';
const DOCK_SPRING = { mass: 0.15, stiffness: 170, damping: 16 };
const DOCK_DISTANCE = 60;
const DOCK_MAGNIFICATION = 1.018;

// Badge de acción — punto + etiqueta, mismo lenguaje visual que StatusBadge.
function ActionBadge({ action, T }) {
  const meta = ACTION_MAP[action] || { label: action, key: 'blue' };
  const c = T[meta.key];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
      color: c, background: T[`${meta.key}Dim`], border: `1px solid ${c}30`, borderRadius: 99,
      padding: '3px 10px 3px 8px', width: 'fit-content',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}

// Fila de la tabla — con el mismo efecto "Dock" vertical (magnificación
// magnética hacia el cursor) que usa "Actividad reciente" en el Dashboard,
// aplicado de forma muy sutil para no distraer de la lectura.
function LogRow({ log, onView, T, mouseY }) {
  const ref = useRef(null);
  const distance = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { top: 0, height: 52 };
    return val - rect.top - rect.height / 2;
  });
  const targetScale = useTransform(distance, [-DOCK_DISTANCE, 0, DOCK_DISTANCE], [1, DOCK_MAGNIFICATION, 1]);
  const scale = useSpring(targetScale, DOCK_SPRING);

  const hasDetail = !!(log.old_values || log.new_values);

  return (
    <motion.div ref={ref} style={{ scale, transformOrigin: 'center' }}>
      <div
        onClick={() => hasDetail && onView(log)}
        style={{
          display: 'grid', gridTemplateColumns: GRID_COLS, alignItems: 'center', columnGap: 16,
          padding: '13px 20px', borderBottom: `1px solid ${T.border}`, cursor: hasDetail ? 'pointer' : 'default',
          transition: 'background .18s ease', position: 'relative',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = T.inputBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 12, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {log.formattedDate}
        </span>

        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {log.user_name}
        </span>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ActionBadge action={log.action} T={T} />
        </div>

        <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{RESOURCE_TYPE_MAP[log.resource_type] || log.resource_type}</span>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, color: T.text, fontWeight: 700, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word',
          }} title={log.resource_name}>
            {log.resource_name || '—'}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {log.Company?.name || 'Sin empresa'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(log); }}
            disabled={!hasDetail}
            title="Ver detalle"
            aria-label="Ver detalle"
            style={{
              width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg,
              color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              cursor: hasDetail ? 'pointer' : 'not-allowed', opacity: hasDetail ? 1 : 0.3, transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => { if (hasDetail) { e.currentTarget.style.background = T.primaryDim; e.currentTarget.style.color = T.primary; e.currentTarget.style.borderColor = T.borderActive; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.textSub; e.currentTarget.style.borderColor = T.border; }}
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Lista de filas — trackea la posición Y del mouse para alimentar la
// magnificación vertical de cada fila (mismo patrón que ActivityList).
function LogRows({ logs, onView, T }) {
  const mouseY = useMotionValue(Infinity);
  return (
    <div onMouseMove={(e) => mouseY.set(e.clientY)} onMouseLeave={() => mouseY.set(Infinity)}>
      {logs.map((log) => (
        <LogRow key={log.id} log={log} onView={onView} T={T} mouseY={mouseY} />
      ))}
    </div>
  );
}

export default function AuditLogs() {
  const { T } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 0 });

  // Filtros
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    company_id: '',
    start_date: '',
    end_date: '',
  });
  const [userName, setUserName] = useState('');
  const debouncedUserName = useDebouncedValue(userName, 300);

  const [companies, setCompanies] = useState([]);
  const [drawerIndex, setDrawerIndex] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters, debouncedUserName]);

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
      if (debouncedUserName.trim()) params.append('user_name', debouncedUserName.trim());

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
    if (key === 'dateRange') {
      setFilters((f) => ({ ...f, start_date: value?.desde || '', end_date: value?.hasta || '' }));
    } else if (key === 'company') {
      setFilters((f) => ({ ...f, company_id: value }));
    } else {
      setFilters((f) => ({ ...f, [key]: value }));
    }
    setPagination((p) => ({ ...p, page: 1 })); // Reset a página 1 al filtrar
  }

  function clearFilters() {
    setFilters({
      action: '',
      resource_type: '',
      company_id: '',
      start_date: '',
      end_date: '',
    });
    setUserName('');
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(date);
  }

  function resourceLabel(type) {
    return RESOURCE_TYPE_MAP[type] || type;
  }

  const filterFields = useMemo(() => [
    {
      id: 'action', label: 'Acción', icon: Zap, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todas' },
        { value: 'create', label: 'Crear' },
        { value: 'update', label: 'Actualizar' },
        { value: 'delete', label: 'Eliminar' },
      ],
    },
    {
      id: 'resource_type', label: 'Tipo de recurso', icon: FileType, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todos' },
        ...Object.entries(RESOURCE_TYPE_MAP).map(([key, label]) => ({ value: key, label })),
      ],
    },
    {
      id: 'company', label: 'Empresa', icon: Building2, type: 'select', emptyValue: '',
      options: [
        { value: '', label: 'Todas' },
        ...companies.map((c) => ({ value: String(c.id), label: c.name })),
      ],
    },
    { id: 'dateRange', label: 'Fecha', icon: CalendarRange, type: 'daterange', emptyValue: { desde: '', hasta: '' } },
  ], [companies]);

  const hasActiveFilters = !!(filters.action || filters.resource_type || filters.company_id || filters.start_date || filters.end_date || userName);

  const displayLogs = useMemo(() => logs.map((log) => ({ ...log, formattedDate: formatDate(log.created_at) })), [logs]);

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.primary, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
          Administración
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 700, color: T.text, fontFamily: FD, letterSpacing: '-.02em' }}>
          Auditoría
        </h1>
        <p style={{ fontSize: 12.5, color: T.textSub, marginTop: 3 }}>
          {pagination.total} registro{pagination.total === 1 ? '' : 's'} · {PAGE_LIMIT} por página
        </p>
      </div>

      {/* Filtros — misma barra simple que usan Sedes/Pantallas/Media, sin card propia. */}
      <FilterBarRow>
        <FilterChipBar
          fields={filterFields}
          values={{
            action: filters.action,
            resource_type: filters.resource_type,
            company: filters.company_id,
            dateRange: { desde: filters.start_date, hasta: filters.end_date },
          }}
          onChange={handleFilterChange}
          style={{ flex: '0 1 auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <FilterSearchInput
            value={userName}
            onChange={setUserName}
            placeholder="Buscar usuario…"
            style={{ flex: '0 1 220px', minWidth: 160 }}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                flexShrink: 0, fontSize: 11.5, fontWeight: 600, padding: '7px 12px', borderRadius: 9,
                background: T.inputBg, border: `1px solid ${T.border}`, color: T.textSub, cursor: 'pointer',
                transition: 'all .15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderActive; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.textSub; e.currentTarget.style.borderColor = T.border; }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </FilterBarRow>

      {/* Card de la tabla — vidrio translúcido de verdad (fondo semi-transparente
          + blur, no el sólido de .card), con líneas horizontales muy sutiles de
          fondo (no cuadrícula). */}
      <div
        className="card"
        style={{
          padding: 0, overflow: 'hidden', position: 'relative',
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        }}
      >
        {loading ? (
          <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                margin: '0 auto', width: 34, height: 34, borderRadius: '50%',
                border: `3px solid ${T.inputBg}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ marginTop: 12, fontSize: 12.5, color: T.textSub }}>Cargando logs…</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <ShieldCheck size={22} color={T.textSub} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: T.textSub }}>No se encontraron registros</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 'fit-content' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: GRID_COLS, columnGap: 16, padding: '12px 20px',
                  fontSize: 10.5, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '.07em',
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <span>Fecha</span>
                  <span>Usuario</span>
                  <span style={{ textAlign: 'center' }}>Acción</span>
                  <span>Recurso</span>
                  <span>Detalle</span>
                  <span style={{ textAlign: 'center' }}>Acciones</span>
                </div>
                <LogRows logs={displayLogs} onView={(log) => setDrawerIndex(displayLogs.findIndex((l) => l.id === log.id))} T={T} />
              </div>
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 12.5, color: T.textSub }}>
                  Página <span style={{ fontWeight: 700, color: T.text }}>{pagination.page}</span> de {pagination.totalPages}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page === 1}
                    aria-label="Página anterior"
                    title="Página anterior"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg,
                      color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.35 : 1,
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    aria-label="Página siguiente"
                    title="Página siguiente"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg,
                      color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                      opacity: pagination.page === pagination.totalPages ? 0.35 : 1,
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AuditLogDrawer
        logs={displayLogs}
        index={drawerIndex}
        onClose={() => setDrawerIndex(null)}
        onNavigate={setDrawerIndex}
        formatDate={formatDate}
        resourceLabel={resourceLabel}
      />
    </div>
  );
}
