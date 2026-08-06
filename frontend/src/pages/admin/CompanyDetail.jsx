import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ChevronRight, Building2, Pencil, Power, User, Mail, Phone, IdCard, ShieldCheck,
  CalendarDays, Copy, Check, Monitor, Wifi, PlaySquare, MapPin, ClipboardList,
  HeartPulse, Activity, PlusCircle, Trash2,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import usePermissions from '../../hooks/usePermissions';
import timeAgo from '../../utils/timeAgo';
import { useTheme } from '../../context/ThemeContext';
import { FD, FM, EASE } from '../../styles/tokens';

const ROLE_LABEL = { super_admin: 'Super Admin', owner: 'Owner' };
const ACTION_ICON = { create: PlusCircle, update: Pencil, delete: Trash2 };
const ACTION_COLOR_KEY = { create: 'green', update: 'blue', delete: 'red' };
const RESOURCE_LABEL = { Company: 'Empresa', Venue: 'Sede', Screen: 'Pantalla', Media: 'Media', Playlist: 'Playlist', User: 'Usuario' };

function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return undefined;
    let start;
    let raf;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const cardEnter = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE },
};

const kpiContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const kpiItem = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

function CopyRow({ icon: Icon, label, value, T, mono }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado');
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textSub, marginBottom: 4 }}>
          <Icon size={11} />
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: mono ? FM : FD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        title="Copiar"
        style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: `1px solid ${T.border}`, color: copied ? T.green : T.textSub, cursor: 'pointer', transition: 'all .15s ease',
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, deltaTone, color, T, delay = 0 }) {
  const animatedValue = useCountUp(value);
  return (
    <motion.div
      variants={kpiItem}
      className="card-hover"
      style={{
        padding: '18px 20px 18px 18px', display: 'flex', alignItems: 'center', gap: 14,
        borderRadius: 14, borderLeft: `3px solid ${color}`, background: 'transparent',
      }}
    >
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1, 1.08, 1] }}
        transition={{ duration: 0.5, ease: EASE, delay: delay + 0.3, times: [0, 0.6, 0.8, 1] }}
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${color}1c`, border: `1px solid ${color}40`, boxShadow: `0 0 20px -6px ${color}70`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}
      >
        <Icon size={19} />
      </motion.div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: FD, lineHeight: 1, letterSpacing: '-.02em' }}>{animatedValue}</div>
        <div style={{ fontSize: 12, color: T.textSub, marginTop: 5, whiteSpace: 'nowrap', fontWeight: 500 }}>{label}</div>
        {delta && (
          <div style={{ fontSize: 10.5, marginTop: 3, fontWeight: 600, color: deltaTone === 'up' ? T.green : T.textSub }}>
            {delta}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VenueRow({ venue, T, delay = 0 }) {
  const screenCount = venue.Screens?.length ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
    <Link
      to="/venues"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
        background: T.inputBg, border: `1px solid ${T.border}`, textDecoration: 'none', cursor: 'pointer',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}1c`, border: `1px solid ${T.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accent, flexShrink: 0 }}>
        <MapPin size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</div>
        <div style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
          {venue.address || `${screenCount} pantalla${screenCount === 1 ? '' : 's'}`}
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.accent, background: `${T.accent}1c`, border: `1px solid ${T.accent}40`,
        borderRadius: 99, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {screenCount}
      </span>
      <ChevronRight size={14} color={T.textSub} style={{ flexShrink: 0 }} />
    </Link>
    </motion.div>
  );
}

function ScreenRow({ screen, T, delay = 0 }) {
  const online = screen.status === 'online';
  const color = online ? T.green : T.red;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      <Link
        to={`/screens/${screen.id}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
          background: T.inputBg, border: `1px solid ${T.border}`, textDecoration: 'none',
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.blue}1c`, border: `1px solid ${T.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue, flexShrink: 0 }}>
          <Monitor size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{screen.name}</div>
          <div style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2, fontFamily: FM }}>
            {screen.venueName} · {screen.device_id}
          </div>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color, background: `${color}22`, border: `1px solid ${color}44`,
          borderRadius: 99, padding: '3px 9px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          {online ? 'En línea' : 'Offline'}
        </span>
      </Link>
    </motion.div>
  );
}

// Columna del riel elegante tipo versat.ai (mismo lenguaje que Dashboard) — en
// reposo es angosta con ícono + título en vertical; al pasar el cursor se
// ensancha dentro de la misma fila y revela el contenido completo.
function RailColumn({ icon: Icon, label, subtitle, color, active, onEnter, children, T }) {
  return (
    <motion.div
      onMouseEnter={onEnter}
      animate={{ flex: active ? 2.6 : 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{
        position: 'relative', flexBasis: 0, minWidth: 0, overflow: 'hidden', cursor: 'pointer',
        background: `radial-gradient(120% 140% at 100% 0%, ${color}2c, transparent 55%), linear-gradient(200deg, ${T.surfaceHigh} 0%, ${T.bg} 100%)`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${color}70`, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
            <Icon size={14} />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative', marginTop: 8 }}>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.15 }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', minWidth: 220 }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: FD, marginBottom: 2, whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontSize: 10.5, color: T.textSub, marginBottom: 8, whiteSpace: 'nowrap' }}>{subtitle}</div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                  {children}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}
              >
                <span
                  style={{
                    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                    fontSize: 12.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase',
                    color: T.text, fontFamily: FD, whiteSpace: 'nowrap', opacity: 0.9,
                  }}
                >
                  {label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ChecklistRow({ label, ok, T, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ok ? T.greenDim : T.inputBg, border: `1px solid ${ok ? T.green : T.border}`, color: ok ? T.green : T.textSub,
      }}>
        {ok && <Check size={10} strokeWidth={3} />}
      </span>
      <span style={{ fontSize: 12, color: ok ? T.text : T.textSub }}>{label}</span>
    </motion.div>
  );
}

const DOCK_SPRING = { mass: 0.1, stiffness: 150, damping: 12 };
function ActivityRow({ log, T, mouseY }) {
  const ref = useRef(null);
  const distance = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { top: 0, height: 44 };
    return val - rect.top - rect.height / 2;
  });
  const targetScale = useTransform(distance, [-70, 0, 70], [1, 1.06, 1]);
  const scale = useSpring(targetScale, DOCK_SPRING);
  const Icon = ACTION_ICON[log.action] || Pencil;
  const color = T[ACTION_COLOR_KEY[log.action] || 'blue'];
  return (
    <motion.div ref={ref} style={{ scale, transformOrigin: 'left center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          <Icon size={12} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {log.user_name} {log.action === 'create' ? 'creó' : log.action === 'delete' ? 'eliminó' : 'actualizó'} {RESOURCE_LABEL[log.resource_type] || log.resource_type}
          </p>
          <p style={{ fontSize: 10.5, color: T.textSub, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {log.resource_name || '—'}
          </p>
        </div>
        <span style={{ fontSize: 10, color: T.textSub, flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
      </div>
    </motion.div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { T } = useTheme();
  const { isSuperAdmin } = usePermissions();
  const [company, setCompany] = useState(null);
  const [mediaCount, setMediaCount] = useState(null);
  const [mediaThisMonth, setMediaThisMonth] = useState(0);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('venues');
  const [hoveredRail, setHoveredRail] = useState('account');
  const [confirmToggle, setConfirmToggle] = useState(false);
  const mouseY = useMotionValue(Infinity);

  useEffect(() => {
    loadCompany();
    loadMedia();
    if (isSuperAdmin) loadActivity();
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

  async function loadMedia() {
    try {
      const { data } = await api.get(`/media?company_id=${id}`);
      setMediaCount(data.length);
      setMediaThisMonth(data.filter((m) => isThisMonth(m.createdAt)).length);
    } catch {
      setMediaCount(null);
    }
  }

  async function loadActivity() {
    try {
      const { data } = await api.get(`/audit/logs?page=1&limit=6&company_id=${id}`);
      setActivity(data.logs || []);
    } catch {
      /* silencioso — no crítico para la vista */
    }
  }

  async function handleToggleActive() {
    if (!company) return;
    const newStatus = !company.active;
    try {
      await api.put(`/companies/${id}`, { active: newStatus });
      toast.success(`Empresa ${newStatus ? 'activada' : 'desactivada'} exitosamente`);
      loadCompany();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error actualizando estado');
    } finally {
      setConfirmToggle(false);
    }
  }

  const allScreens = useMemo(() => (
    company?.Venues?.flatMap((venue) =>
      (venue.Screens || []).map((screen) => ({ ...screen, venueName: venue.name, venueId: venue.id }))
    ) || []
  ), [company]);

  const venuesThisMonth = useMemo(() => (company?.Venues || []).filter((v) => isThisMonth(v.createdAt)).length, [company]);
  const screensThisMonth = useMemo(() => allScreens.filter((s) => isThisMonth(s.createdAt)).length, [allScreens]);
  const onlinePct = company?.stats?.totalScreens ? Math.round((company.stats.screensOnline / company.stats.totalScreens) * 100) : 0;

  const checklist = useMemo(() => {
    if (!company) return [];
    return [
      { label: 'Perfil de contacto completo', ok: !!(company.email && company.phone && company.document) },
      { label: 'Al menos una sede registrada', ok: (company.stats?.totalVenues || 0) > 0 },
      { label: 'Al menos una pantalla registrada', ok: (company.stats?.totalScreens || 0) > 0 },
      { label: 'Al menos una pantalla en línea', ok: (company.stats?.screensOnline || 0) > 0 },
    ];
  }, [company]);
  const checklistScore = checklist.length ? Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100) : 0;
  const animatedScore = useCountUp(checklistScore);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ margin: '0 auto', width: 34, height: 34, borderRadius: '50%', border: `3px solid ${T.inputBg}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: 12, fontSize: 12.5, color: T.textSub }}>Cargando información…</p>
        </div>
      </div>
    );
  }

  if (!company) return null;

  const color = T.primary;

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
        <Link to="/admin/companies" style={{ color: T.textSub, textDecoration: 'none' }}>Empresas</Link>
        <ChevronRight size={13} color={T.textSub} />
        <span style={{ color: T.text, fontWeight: 600 }}>{company.name}</span>
      </nav>

      {/* Header */}
      <motion.div
        {...cardEnter}
        className="card"
        style={{
          padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          background: `linear-gradient(135deg, ${color}22, ${T.surfaceHigh})`, border: `1px solid ${color}33`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div style={{
            width: 62, height: 62, borderRadius: 18, flexShrink: 0, overflow: 'hidden',
            background: `linear-gradient(155deg, ${color}, ${T.accent})`, boxShadow: `0 10px 26px -8px ${color}70`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {company.logo_url ? (
              <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 800, color: '#04110d', fontFamily: FD }}>{company.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: FD, letterSpacing: '-.02em', margin: 0 }}>{company.name}</h1>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                color: company.active ? T.green : T.textSub, background: company.active ? T.greenDim : T.inputBg, border: `1px solid ${company.active ? 'transparent' : T.border}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: company.active ? T.green : T.red, boxShadow: company.active ? `0 0 6px 1px ${T.green}` : 'none' }} />
                {company.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: T.textSub, marginTop: 4 }}>{ROLE_LABEL[company.role] || company.role}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link
            to={`/admin/companies/${id}/edit`}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10, textDecoration: 'none',
              background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontSize: 12.5, fontWeight: 600, transition: 'all .15s ease',
            }}
          >
            <Pencil size={13} /> Editar empresa
          </Link>
          {company.role !== 'super_admin' && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setConfirmToggle(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                background: company.active ? T.redDim : T.greenDim, border: `1px solid ${company.active ? T.red : T.green}44`,
                color: company.active ? T.red : T.green, fontSize: 12.5, fontWeight: 700,
              }}
            >
              <Power size={13} /> {company.active ? 'Desactivar' : 'Activar'}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div
        variants={kpiContainer}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}
      >
        <KpiCard icon={Building2} label="Sedes" value={company.stats?.totalVenues || 0} color={T.primary} T={T}
          delta={venuesThisMonth > 0 ? `↑ +${venuesThisMonth} este mes` : null} deltaTone="up" delay={0} />
        <KpiCard icon={Monitor} label="Pantallas" value={company.stats?.totalScreens || 0} color={T.blue} T={T}
          delta={screensThisMonth > 0 ? `↑ +${screensThisMonth} este mes` : null} deltaTone="up" delay={0.08} />
        <KpiCard icon={Wifi} label="Online" value={company.stats?.screensOnline || 0} color={T.green} T={T}
          delta={company.stats?.totalScreens ? `${onlinePct}% del total` : null} deltaTone="neutral" delay={0.16} />
        <KpiCard icon={PlaySquare} label="Contenidos" value={mediaCount ?? 0} color={T.amber} T={T}
          delta={mediaThisMonth > 0 ? `↑ +${mediaThisMonth} este mes` : null} deltaTone="up" delay={0.24} />
      </motion.div>

      <div style={{ display: 'grid', gap: 16, alignItems: 'start' }} className="company-detail-grid">
        {/* Columna izquierda — información básica */}
        <motion.div {...cardEnter} transition={{ ...cardEnter.transition, delay: 0.05 }} className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ClipboardList size={15} color={T.primary} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Información básica</h2>
          </div>
          <div>
            <CopyRow icon={User} label="Usuario" value={company.username} T={T} mono />
            <CopyRow icon={Mail} label="Email" value={company.email} T={T} />
            <CopyRow icon={Phone} label="Teléfono" value={company.phone} T={T} mono />
            <CopyRow
              icon={IdCard}
              label="Documento / NIT"
              value={company.document ? `${company.document_type || 'NIT'}: ${company.document}` : null}
              T={T}
              mono
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textSub }}>
                <ShieldCheck size={11} /> Rol
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                color: company.role === 'super_admin' ? T.accent : T.primary,
                background: company.role === 'super_admin' ? T.accentDim : T.primaryDim,
              }}>
                {ROLE_LABEL[company.role] || company.role}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textSub }}>
                <CalendarDays size={11} /> Fecha de creación
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                {new Date(company.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Columna central — sedes / pantallas */}
        <motion.div {...cardEnter} transition={{ ...cardEnter.transition, delay: 0.1 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 4, padding: '14px 16px 0' }}>
            {[
              { key: 'venues', label: `Sedes (${company.Venues?.length || 0})` },
              { key: 'screens', label: `Pantallas (${allScreens.length})` },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    position: 'relative', fontSize: 12.5, fontWeight: 700, padding: '8px 4px', marginRight: 18,
                    background: 'transparent', border: 'none', cursor: 'pointer', color: active ? T.text : T.textSub,
                  }}
                >
                  {tab.label}
                  {active && (
                    <motion.div layoutId="companyDetailTab" style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: color, borderRadius: 2 }} />
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ height: 1, background: T.border, marginTop: 0 }} />
          <div style={{ padding: 16, minHeight: 260 }}>
            <AnimatePresence mode="wait">
              {activeTab === 'venues' ? (
                <motion.div key="venues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!company.Venues || company.Venues.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 12.5, color: T.textSub }}>Esta empresa no tiene sedes registradas.</p>
                  ) : (
                    company.Venues.map((venue, i) => <VenueRow key={venue.id} venue={venue} T={T} delay={i * 0.05} />)
                  )}
                </motion.div>
              ) : (
                <motion.div key="screens" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allScreens.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 12.5, color: T.textSub }}>Esta empresa no tiene pantallas registradas.</p>
                  ) : (
                    allScreens.map((screen, i) => <ScreenRow key={screen.id} screen={screen} T={T} delay={i * 0.05} />)
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>

      {/* Riel — Estado de la cuenta + Actividad reciente, angosto/expandido con el hover */}
      <motion.div
        {...cardEnter}
        transition={{ ...cardEnter.transition, delay: 0.15 }}
        className="card"
        onMouseLeave={() => setHoveredRail(null)}
        style={{ display: 'flex', padding: 0, overflow: 'hidden', minHeight: 240 }}
      >
        <RailColumn
          icon={HeartPulse}
          label="Estado de la cuenta"
          subtitle={`${checklistScore}% completo`}
          color={T.green}
          active={hoveredRail === 'account'}
          onEnter={() => setHoveredRail('account')}
          T={T}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width={72} height={72} style={{ flexShrink: 0 }}>
              <circle cx={36} cy={36} r={30} fill="none" stroke={T.inputBg} strokeWidth={7} />
              <circle
                cx={36} cy={36} r={30} fill="none" stroke={T.green} strokeWidth={7} strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30 * (checklistScore / 100)} ${2 * Math.PI * 30}`}
                transform="rotate(-90 36 36)"
                style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 6px ${T.green}88)` }}
              />
              <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 15, fontWeight: 800, fill: T.text, fontFamily: FD }}>
                {animatedScore}%
              </text>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              {checklist.map((c, i) => <ChecklistRow key={c.label} label={c.label} ok={c.ok} T={T} delay={i * 0.06} />)}
            </div>
          </div>
        </RailColumn>

        {isSuperAdmin && (
          <RailColumn
            icon={Activity}
            label="Actividad reciente"
            subtitle={`${activity.length} evento${activity.length !== 1 ? 's' : ''}`}
            color={T.accent}
            active={hoveredRail === 'activity'}
            onEnter={() => setHoveredRail('activity')}
            T={T}
          >
            <div onMouseMove={(e) => mouseY.set(e.clientY)} onMouseLeave={() => mouseY.set(Infinity)}>
              {activity.length === 0 ? (
                <span style={{ fontSize: 11.5, color: T.textSub }}>Sin actividad reciente.</span>
              ) : (
                activity.map((log) => <ActivityRow key={log.id} log={log} T={T} mouseY={mouseY} />)
              )}
            </div>
          </RailColumn>
        )}
      </motion.div>

      <ConfirmModal
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={handleToggleActive}
        icon={Power}
        color={company.active ? T.red : T.green}
        title={company.active ? '¿Desactivar esta empresa?' : '¿Activar esta empresa?'}
        message={
          company.active
            ? <>Vas a desactivar <strong style={{ color: T.text }}>&quot;{company.name}&quot;</strong>. Sus usuarios no podrán acceder hasta que la reactives.</>
            : <>Vas a activar <strong style={{ color: T.text }}>&quot;{company.name}&quot;</strong>. Sus usuarios podrán volver a acceder.</>
        }
        confirmLabel={company.active ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
