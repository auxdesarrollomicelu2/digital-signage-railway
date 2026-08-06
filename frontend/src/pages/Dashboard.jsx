import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Building2, Monitor, Wifi, WifiOff, Image as ImageIcon, ChevronRight, ChevronDown, Pencil, Trash2, PlusCircle, Activity } from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import usePermissions from '../hooks/usePermissions';
import useDockScale from '../hooks/useDockScale';
import timeAgo from '../utils/timeAgo';
import SelectDropdown from '../components/shared/SelectDropdown';
import { isVideoMime } from '../utils/mediaType';
import { FD, FM, EASE } from '../styles/tokens';

// Conteo animado — siempre nace en 0 y sube hasta el valor real (nunca
// aparece "ya escrito"); en actualizaciones posteriores (polling, cambio de
// filtro) sube o baja suavemente desde el valor anterior.
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
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        prevRef.current = to;
      }
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

// Entrada estándar de las cards grandes — todo nace desde abajo, nunca de un lado.
const cardEnter = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, ease: EASE },
};

// Estado de conexión — igual, pero "flotando" (con un blur ligero que se disipa).
const connectionEnter = {
  initial: { opacity: 0, y: 28, filter: 'blur(6px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.7, ease: EASE },
};

// Grid de KPIs — cada card nace desde abajo con un pequeño scale, en cascada.
const kpiContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const kpiItem = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

const ACTION_ICON = { create: PlusCircle, update: Pencil, delete: Trash2 };
const ACTION_COLOR_KEY = { create: 'green', update: 'blue', delete: 'red' };
const RESOURCE_LABEL = { Company: 'Empresa', Venue: 'Sede', Screen: 'Pantalla', Media: 'Media', Playlist: 'Playlist', User: 'Usuario' };

// Mismos 5 KPIs y mismo destino de click que antes — solo cambia el ícono/color.
const statCards = [
  { label: 'Sedes', statKey: 'venues', icon: Building2, colorKey: 'primary', link: '/venues' },
  { label: 'Pantallas', statKey: 'screens', icon: Monitor, colorKey: 'blue', link: '/screens' },
  { label: 'En línea', statKey: 'online', icon: Wifi, colorKey: 'green', link: '/screens?status=online' },
  { label: 'Fuera de línea', statKey: 'offline', icon: WifiOff, colorKey: 'red', link: '/screens?status=offline' },
  { label: 'Archivos media', statKey: 'media', icon: ImageIcon, colorKey: 'amber', link: '/media' },
];

// De dónde sale el company_id real de cada tipo de registro (según lo que
// devuelven /venues, /screens y /media con sus includes).
const companyIdOf = {
  venue: (v) => v.Company?.id ?? v.company_id ?? null,
  screen: (s) => s.Venue?.Company?.id ?? s.Venue?.company_id ?? null,
  media: (m) => m.company_id ?? m.Company?.id ?? null,
};

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function CardHeader({ children, T, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        {children}
      </div>
      {action}
    </div>
  );
}

// KPI grande — número dominante, ícono con glow y un acento de color propio
// a la izquierda para que cada métrica se distinga a simple vista.
function KpiCard({ card, value, T, delay = 0 }) {
  const Icon = card.icon;
  const color = T[card.colorKey];
  const animatedValue = useCountUp(value);
  const body = (
    <div
      className="card-hover"
      style={{
        padding: '18px 20px 18px 18px', display: 'flex', alignItems: 'center', gap: 14, height: '100%',
        borderRadius: 14, borderLeft: `3px solid ${color}`, background: 'transparent',
        transition: 'background .2s ease',
      }}
    >
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1, 1.08, 1] }}
        transition={{ duration: 0.5, ease: EASE, delay: delay + 0.35, times: [0, 0.6, 0.8, 1] }}
        style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: `${color}1c`, border: `1px solid ${color}40`, boxShadow: `0 0 22px -6px ${color}70`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}
      >
        <Icon size={20} />
      </motion.div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: T.text, fontFamily: FD, lineHeight: 1, letterSpacing: '-.02em' }}>{animatedValue}</div>
        <div style={{ fontSize: 12.5, color: T.textSub, marginTop: 5, whiteSpace: 'nowrap', fontWeight: 500 }}>{card.label}</div>
      </div>
    </div>
  );

  if (card.link) {
    return (
      <Link to={card.link} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        {body}
      </Link>
    );
  }
  return body;
}

// Fila de barra — si la sede tiene al menos un dispositivo/archivo detrás del
// número, un desplegable lista cada uno (nombre + dato real) para saber
// exactamente cuál es cuál; clic en un ítem lleva a esa pantalla en "Ver".
function BarRow({ label, value, formatDisplay, max, color, T, delay = 0, items = [], onItemClick }) {
  const [expanded, setExpanded] = useState(false);
  const animatedValue = useCountUp(value, 800);
  const pct = max > 0 ? Math.round((animatedValue / max) * 100) : 0;
  const hasItems = items.length > 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: hasItems ? 'pointer' : 'default' }}
        onClick={() => hasItems && setExpanded((e) => !e)}
      >
        <span style={{
          fontSize: 12.5, color: T.textSub, width: 90, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {label}
          {hasItems && (
            <ChevronDown size={11} style={{ flexShrink: 0, transition: 'transform .2s ease', transform: expanded ? 'rotate(180deg)' : 'none' }} />
          )}
        </span>
        <div style={{ flex: 1, height: 7, borderRadius: 99, background: T.inputBg, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: EASE, delay }}
            style={{ height: '100%', background: color, borderRadius: 99, boxShadow: `0 0 10px -2px ${color}` }}
          />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, width: 36, flexShrink: 0, textAlign: 'right' }}>
          {formatDisplay ? formatDisplay(animatedValue) : animatedValue}
        </span>
      </div>
      {hasItems && expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, margin: '6px 0 2px 100px', maxHeight: 96, overflowY: 'auto' }}>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); onItemClick && onItemClick(it); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                fontSize: 11, color: T.textSub, background: 'transparent', border: 'none',
                padding: '3px 6px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                transition: 'background .15s ease, color .15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              <span style={{ flexShrink: 0, opacity: 0.75 }}>{it.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Leyenda de color — swatch + etiqueta, usada por las cards de barras agrupadas.
function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  );
}

const COLUMN_CHART_H = 168;

// Una barra vertical — crece desde la base; el valor solo aparece como
// tooltip flotante al pasar el cursor, no queda fijo encima de la barra.
function BarColumn({ value, max, color, T, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const animValue = useCountUp(value, 800);
  const pct = max > 0 ? (animValue / max) * 100 : 0;
  return (
    <div style={{ width: 22, height: COLUMN_CHART_H, display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${pct}%` }}
        transition={{ duration: 0.8, ease: EASE, delay }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ width: '100%', minHeight: value > 0 ? 2 : 0, background: color, borderRadius: '5px 5px 0 0', position: 'relative', boxShadow: `0 0 10px -2px ${color}`, cursor: 'default' }}
      >
        <span
          style={{
            position: 'absolute', top: -24, left: '50%', transform: hov ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(3px)',
            fontSize: 10.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', background: color, borderRadius: 6,
            padding: '2px 6px', boxShadow: '0 4px 10px -3px rgba(0,0,0,.5)',
            opacity: hov ? 1 : 0, transition: 'opacity .15s ease, transform .15s ease', pointerEvents: 'none',
          }}
        >
          {animValue}
        </span>
      </motion.div>
    </div>
  );
}

// Card "inteligente" con barras verticales agrupadas (imágenes vs. videos por
// sede, una junto a otra por categoría) — ambas métricas se comparan de un
// vistazo, sin pastillas de tab.
function GroupedChartCard({ title, rows, emptyLabel, T, delay = 0 }) {
  const max = Math.max(...rows.map((r) => Math.max(r.imagenes, r.videos)), 1);
  return (
    <motion.div {...cardEnter} transition={{ ...cardEnter.transition, delay }} className="card card-hover" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LegendDot color={T.blue} label="Imágenes" />
          <LegendDot color={T.amber} label="Videos" />
        </div>
      </div>
      {rows.length === 0 ? (
        <span style={{ fontSize: 12.5, color: T.textSub }}>{emptyLabel}</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, overflowX: 'auto', overflowY: 'hidden', paddingTop: 30, paddingBottom: 4 }}>
          {rows.map((r, i) => (
            <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, borderBottom: `1px solid ${T.border}` }}>
                <BarColumn value={r.imagenes} max={max} color={T.blue} T={T} delay={0.05 + i * 0.07} />
                <BarColumn value={r.videos} max={max} color={T.amber} T={T} delay={0.1 + i * 0.07} />
              </div>
              <span style={{ fontSize: 11, color: T.textSub, maxWidth: 64, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ConnectionDonut({ online, total, T, size = 92 }) {
  const pct = total > 0 ? online / total : 0;
  const animatedPct = useCountUp(Math.round(pct * 100));
  const stroke = size >= 80 ? 9 : 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // Arco verde = % en línea, arco rojo = % offline — el anillo completo
  // refleja los dos estados reales, no solo "conectado vs. resto".
  const onlineLen = circumference * pct;
  const offlineLen = circumference * (1 - pct);
  const gap = total > 0 ? Math.min(circumference * 0.012, 4) : 0; // pequeño espacio entre los dos arcos
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.inputBg} strokeWidth={stroke} />
      {total > 0 && (
        <>
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={T.green} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${Math.max(onlineLen - (offlineLen > 0 ? gap : 0), 0)} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 6px ${T.green}88)` }}
          />
          {offlineLen > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={T.red} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${Math.max(offlineLen - gap, 0)} ${circumference}`}
              strokeDashoffset={-onlineLen}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1), stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 6px ${T.red}88)` }}
            />
          )}
        </>
      )}
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size >= 80 ? 19 : 14, fontWeight: 800, fill: T.text, fontFamily: FD }}>
        {total > 0 ? animatedPct : 0}%
      </text>
    </svg>
  );
}

// Pastillas de selección de métrica dentro de una card inteligente.
function TabPills({ tabs, active, onChange, T }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: T.inputBg, padding: 3, borderRadius: 99, border: `1px solid ${T.border}`, flexShrink: 0 }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: isActive ? tab.color : 'transparent',
              color: isActive ? '#04110d' : T.textSub,
              transition: 'background .2s ease, color .2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Selector de empresa — solo Super Admin, filtra todo el dashboard.
function CompanySelect({ companies, value, onChange, T }) {
  const options = [{ value: 'all', label: 'Todas las empresas' }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))];
  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={options}
      minWidth={190}
      visibleLimit={3}
      triggerStyle={{
        fontSize: 11, fontWeight: 600, padding: '6px 10px', borderRadius: 8,
        background: T.inputBg, border: `1px solid ${T.border}`, maxWidth: 190,
      }}
    />
  );
}

// Card "inteligente" con pastillas de métrica — el contenido cambia con
// animación fluida (fade + las barras vuelven a nacer desde cero) al
// cambiar de pestaña, sin ser cuatro cards distintas.
function SmartChartCard({ title, tabs, active, onChangeTab, rows, emptyLabel, T, delay = 0, companySelector, onItemClick }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <motion.div {...cardEnter} transition={{ ...cardEnter.transition, delay }} className="card card-hover" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {companySelector}
          <TabPills tabs={tabs} active={active} onChange={onChangeTab} T={T} />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {rows.length === 0 ? (
            <span style={{ fontSize: 12.5, color: T.textSub }}>{emptyLabel}</span>
          ) : (
            rows.map((r, i) => (
              <BarRow key={`${active}-${r.name}`} label={r.name} value={r.value} formatDisplay={r.formatDisplay} max={max} color={r.color} T={T} delay={0.05 + i * 0.06} items={r.items} onItemClick={onItemClick} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

const DOCK_SPRING = { mass: 0.1, stiffness: 150, damping: 12 };
const DOCK_DISTANCE = 70;
const DOCK_MAGNIFICATION = 1.09;

// Fila de "Actividad reciente" — con el mismo efecto "Dock" (magnificación
// magnética hacia el cursor), pero en vertical: la fila más cercana al mouse
// crece un poco y las vecinas se van achicando con la distancia.
function ActivityRow({ log, T, mouseY }) {
  const { ref, scale } = useDockScale(mouseY, { distance: DOCK_DISTANCE, magnification: DOCK_MAGNIFICATION, spring: DOCK_SPRING });

  const Icon = ACTION_ICON[log.action] || Pencil;
  const color = T[ACTION_COLOR_KEY[log.action] || 'blue'];
  return (
    <motion.div
      ref={ref}
      style={{ scale, transformOrigin: 'left center' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: `1px solid rgba(255,255,255,.06)` }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          <Icon size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {log.user_name} {log.action === 'create' ? 'creó' : log.action === 'delete' ? 'eliminó' : 'actualizó'} {RESOURCE_LABEL[log.resource_type] || log.resource_type}
          </p>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {log.resource_name || '—'}
          </p>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
      </div>
    </motion.div>
  );
}

// Lista de actividad reciente — trackea la posición Y del mouse dentro del
// contenedor para alimentar la magnificación vertical de cada fila.
function ActivityList({ logs, T }) {
  const mouseY = useMotionValue(Infinity);
  return (
    <div
      onMouseMove={(e) => mouseY.set(e.clientY)}
      onMouseLeave={() => mouseY.set(Infinity)}
    >
      {logs.map((log) => (
        <ActivityRow key={log.id} log={log} T={T} mouseY={mouseY} />
      ))}
    </div>
  );
}

// Fila de "Estado de pantallas".
function ScreenStatusRow({ screen, T }) {
  const online = screen.status === 'online';
  const color = online ? T.green : T.red;
  return (
    <Link
      to={`/screens/${screen.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px',
        textDecoration: 'none', borderBottom: `1px solid rgba(255,255,255,.06)`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 3px ${color}33` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {screen.name}
        </p>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {screen.Venue?.name || 'Sin sede'} · {screen.device_id}
        </p>
      </div>
      <span
        style={{
          fontSize: 10, fontWeight: 600, color, background: `${color}22`,
          border: `1px solid ${color}44`, borderRadius: 99, padding: '2px 7px', flexShrink: 0,
        }}
      >
        {online ? 'En línea' : 'Offline'}
      </span>
    </Link>
  );
}

// Columna del riel elegante tipo versat.ai — en reposo es angosta, con un
// número índice, un ícono en un marco fino y el título en vertical, sobre un
// fondo oscuro con un resplandor de color difuminado (mismo lenguaje que el
// glow radial del Backdrop). Al pasar el cursor se ensancha dentro de la
// misma fila (nunca se sale, nunca tapa nada) y revela el contenido completo.
function IndexColumn({ index, icon: Icon, label, subtitle, color, active, onEnter, children, T }) {
  return (
    <motion.div
      onMouseEnter={onEnter}
      animate={{ flex: active ? 2.6 : 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{
        position: 'relative', flexBasis: 0, minWidth: 0, overflow: 'hidden', cursor: 'pointer',
        background: `radial-gradient(120% 140% at 100% 0%, ${color}2c, transparent 55%), linear-gradient(200deg, #12151c 0%, #0a0c11 100%)`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 10.5, fontFamily: FM, color: 'rgba(255,255,255,.4)', fontWeight: 700 }}>{index}</span>
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
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: FD, marginBottom: 2, whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)', marginBottom: 8, whiteSpace: 'nowrap' }}>{subtitle}</div>
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
                    color: '#fff', fontFamily: FD, whiteSpace: 'nowrap', opacity: 0.9,
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

const STATUS_TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'online', label: 'En línea' },
  { key: 'offline', label: 'Fuera de línea' },
];

export default function Dashboard() {
  const { T } = useTheme();
  const { isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  const [venuesRaw, setVenuesRaw] = useState([]);
  const [screensRaw, setScreensRaw] = useState([]);
  const [mediaRaw, setMediaRaw] = useState([]);
  const [screenPlaylists, setScreenPlaylists] = useState({}); // { [screenId]: ScreenMedia[] }
  const [recentActivity, setRecentActivity] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [chartTabA, setChartTabA] = useState('screens'); // 'screens' | 'duration'
  const [hoveredStrip, setHoveredStrip] = useState(null); // null | 'activity' | 'status'

  useEffect(() => {
    loadData();
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/companies').then(({ data }) => setCompanies(data)).catch(() => {});
  }, [isSuperAdmin]);

  // Actividad reciente — solo super admin, único rol con acceso a /audit/logs
  useEffect(() => {
    if (!isSuperAdmin) return;
    async function loadActivity() {
      try {
        const companyParam = selectedCompanyId !== 'all' ? `&company_id=${selectedCompanyId}` : '';
        const { data } = await api.get(`/audit/logs?page=1&limit=6${companyParam}`);
        setRecentActivity(data.logs || []);
      } catch {
        /* ignore */
      }
    }
    loadActivity();
    const interval = setInterval(() => { if (!document.hidden) loadActivity(); }, 15000);
    return () => clearInterval(interval);
  }, [isSuperAdmin, selectedCompanyId]);

  async function loadData() {
    try {
      const [venuesRes, screensRes, mediaRes] = await Promise.all([
        api.get('/venues'),
        api.get('/screens'),
        api.get('/media'),
      ]);
      const scr = screensRes.data;
      setVenuesRaw(venuesRes.data);
      setScreensRaw(scr);
      setMediaRaw(mediaRes.data);

      // Detalle de cada pantalla (incluye su playlist real: ScreenMedia + Media con duración y tipo)
      const details = await Promise.all(
        scr.map((s) => api.get(`/screens/${s.id}`).then((r) => r.data).catch(() => null))
      );
      const map = {};
      details.forEach((d, i) => {
        if (d) map[scr[i].id] = d.ScreenMedia || [];
      });
      setScreenPlaylists(map);
    } catch {
      /* ignore */
    }
  }

  // Todo lo que sigue se calcula sobre los conjuntos ya filtrados por
  // empresa (si el Super Admin eligió una) — así el dashboard entero
  // reacciona al selector.
  const venues = useMemo(
    () => (selectedCompanyId === 'all' ? venuesRaw : venuesRaw.filter((v) => String(companyIdOf.venue(v)) === selectedCompanyId)),
    [venuesRaw, selectedCompanyId]
  );
  const screens = useMemo(
    () => (selectedCompanyId === 'all' ? screensRaw : screensRaw.filter((s) => String(companyIdOf.screen(s)) === selectedCompanyId)),
    [screensRaw, selectedCompanyId]
  );
  const media = useMemo(
    () => (selectedCompanyId === 'all' ? mediaRaw : mediaRaw.filter((m) => String(companyIdOf.media(m)) === selectedCompanyId)),
    [mediaRaw, selectedCompanyId]
  );

  const stats = useMemo(() => ({
    venues: venues.length,
    screens: screens.length,
    online: screens.filter((s) => s.status === 'online').length,
    offline: screens.filter((s) => s.status !== 'online').length,
    media: media.length,
  }), [venues, screens, media]);

  // Sedes -> lista de sus pantallas — base para las dos tablas de abajo, así
  // cada barra puede desplegar exactamente cuáles dispositivos/archivos la componen.
  const venueScreensMap = useMemo(() => {
    const map = new Map();
    venues.forEach((v) => map.set(v.name, []));
    screens.forEach((s) => {
      const name = s.Venue?.name || 'Sin sede';
      const arr = map.get(name) || [];
      arr.push(s);
      map.set(name, arr);
    });
    return map;
  }, [screens, venues]);

  // Distribución de pantallas por sede — incluye también las sedes sin
  // pantallas todavía (aparecen en 0, y suben solas cuando se les asignen).
  // Cada fila trae sus pantallas reales para el desplegable (clic -> Ver pantalla).
  const screensByVenue = useMemo(() => {
    return [...venueScreensMap.entries()]
      .map(([name, arr]) => ({
        name,
        count: arr.length,
        items: arr.map((s) => ({ key: s.id, screenId: s.id, label: s.name, sub: s.device_id })),
      }))
      .sort((a, b) => b.count - a.count);
  }, [venueScreensMap]);

  // Duración total asignada por sede — suma de ScreenMedia.duration (dato real, no inventado).
  // Cada fila trae el detalle de cada archivo (nombre + duración + pantalla) para el desplegable.
  const durationByVenue = useMemo(() => {
    const rows = [...venueScreensMap.entries()].map(([name, arr]) => {
      let totalSec = 0;
      const items = [];
      arr.forEach((s) => {
        const playlist = screenPlaylists[s.id] || [];
        playlist.forEach((it, idx) => {
          const dur = Number(it.duration) || 0;
          totalSec += dur;
          items.push({
            key: `${s.id}-${it.id ?? idx}`,
            screenId: s.id,
            label: it.Media?.original_name || (isVideoMime(it.Media?.mime_type) ? 'Video' : 'Imagen'),
            sub: `${fmtDuration(dur)} · ${s.name}`,
          });
        });
      });
      return { name, totalSec, items };
    });
    return rows.filter((v) => v.totalSec > 0).sort((a, b) => b.totalSec - a.totalSec);
  }, [venueScreensMap, screenPlaylists]);

  // Imágenes y videos por sede — agrupado a partir de la playlist real de cada
  // pantalla; incluye también las sedes sin media asignada todavía (en 0).
  const mediaByVenue = useMemo(() => {
    const map = new Map();
    venues.forEach((v) => map.set(v.name, { name: v.name, imagenes: 0, videos: 0 }));
    screens.forEach((s) => {
      const venueName = s.Venue?.name || 'Sin sede';
      const items = screenPlaylists[s.id] || [];
      const entry = map.get(venueName) || { name: venueName, imagenes: 0, videos: 0 };
      items.forEach((it) => {
        const mime = it.Media?.mime_type || '';
        if (mime.startsWith('image/')) entry.imagenes += 1;
        else if (mime.startsWith('video/')) entry.videos += 1;
      });
      map.set(venueName, entry);
    });
    return [...map.values()];
  }, [screens, screenPlaylists, venues]);
  const mediaByVenueSorted = [...mediaByVenue].sort((a, b) => (b.imagenes + b.videos) - (a.imagenes + a.videos));

  const statusFilteredScreens = useMemo(() => {
    if (statusFilter === 'online') return screens.filter((s) => s.status === 'online');
    if (statusFilter === 'offline') return screens.filter((s) => s.status !== 'online');
    return screens;
  }, [screens, statusFilter]);

  const animatedVenues = useCountUp(stats.venues);
  const animatedScreens = useCountUp(stats.screens);
  const animatedMedia = useCountUp(stats.media);

  const chartARows = chartTabA === 'screens'
    ? screensByVenue.map((v) => ({ name: v.name, value: v.count, color: T.accent, items: v.items }))
    : durationByVenue.map((v) => ({ name: v.name, value: v.totalSec, formatDisplay: fmtDuration, color: T.amber, items: v.items }));

  function goToScreen(item) {
    navigate(`/screens/${item.screenId}`);
  }


  const hasActivity = isSuperAdmin && recentActivity.length > 0;

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 8 }}>
          Panel principal
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: T.text, fontFamily: FD, letterSpacing: '-.03em', lineHeight: 1 }}>
          Centro de <span style={{ color: T.primary, textShadow: `0 0 30px ${T.primary}55` }}>Control</span>
        </h1>
        <p style={{ fontSize: 14, color: T.textSub, marginTop: 10 }}>Resumen y estado de tus pantallas en tiempo real</p>
      </div>

      {/* 1. Tarjetas KPI — resumen principal */}
      <motion.div
        variants={kpiContainer}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}
      >
        {statCards.map((card, i) => (
          <motion.div key={card.label} variants={kpiItem} style={{ height: '100%' }}>
            <KpiCard card={card} value={stats[card.statKey]} T={T} delay={i * 0.09} />
          </motion.div>
        ))}
      </motion.div>

      {/* 2. Fila superior — Estado de conexión y Cantidad de sedes compactos,
          + el riel elegante (Actividad reciente / Estado de pantallas) tipo
          versat.ai: oscuro, con glow, índice numerado y expansión in-flow
          (nunca se sale de su fila, nunca tapa nada). */}
      <div className="dash-top-row">
        <motion.div {...connectionEnter} className="card card-hover" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start' }}>
            <CardHeader T={T}>Conexión</CardHeader>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <ConnectionDonut online={stats.online} total={stats.screens} T={T} size={68} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSub }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, boxShadow: `0 0 6px ${T.green}`, flexShrink: 0 }} /> {stats.online} en línea
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSub }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.red, boxShadow: `0 0 6px ${T.red}`, flexShrink: 0 }} /> {stats.offline} offline
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div {...cardEnter} className="card card-hover" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start' }}>
            <CardHeader T={T}>Sedes</CardHeader>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: T.text, fontFamily: FD, lineHeight: 1, letterSpacing: '-.02em' }}>{animatedVenues}</div>
            <div style={{ fontSize: 11.5, color: T.textSub, marginTop: 8 }}>{stats.screens} pantalla{stats.screens !== 1 ? 's' : ''} distribuidas</div>
          </div>
        </motion.div>

        <motion.div
          {...cardEnter}
          className="card"
          onMouseLeave={() => setHoveredStrip(null)}
          style={{ display: 'flex', padding: 0, overflow: 'hidden' }}
        >
          <IndexColumn
            icon={Activity}
            label="Actividad reciente"
            subtitle={`${recentActivity.length} evento${recentActivity.length !== 1 ? 's' : ''}`}
            color={T.primary}
            active={hoveredStrip === 'activity'}
            onEnter={() => setHoveredStrip('activity')}
            T={T}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 2 }}>
              <Link to="/admin/audit" style={{ fontSize: 10, color: T.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                Ver todo <ChevronRight size={9} />
              </Link>
            </div>
            {!hasActivity && <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)' }}>Sin actividad reciente.</span>}
            {hasActivity && <ActivityList logs={recentActivity} T={T} />}
          </IndexColumn>

          <IndexColumn
            icon={Monitor}
            label="Estado de pantallas"
            subtitle={`${stats.online} en línea · ${stats.offline} offline`}
            color={T.blue}
            active={hoveredStrip === 'status'}
            onEnter={() => setHoveredStrip('status')}
            T={T}
          >
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {STATUS_TABS.map((tab) => {
                const activeTab = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={(e) => { e.preventDefault(); setStatusFilter(tab.key); }}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, cursor: 'pointer',
                      border: `1px solid ${activeTab ? T.blue : 'rgba(255,255,255,.14)'}`,
                      background: activeTab ? `${T.blue}22` : 'transparent',
                      color: activeTab ? T.blue : 'rgba(255,255,255,.55)',
                      transition: 'all .18s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {statusFilteredScreens.length === 0 ? (
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)' }}>Sin pantallas en este estado.</span>
            ) : (
              statusFilteredScreens.map((screen) => (
                <ScreenStatusRow key={screen.id} screen={screen} T={T} />
              ))
            )}
          </IndexColumn>
        </motion.div>
      </div>

      {/* 3. Tercera fila — dos cards inteligentes con filtros internos */}
      <div className="dash-pair">
        <SmartChartCard
          title="duración por medio"
          tabs={[
            { key: 'screens', label: 'Pantallas', color: T.accent },
            { key: 'duration', label: 'Videos', color: T.amber },
          ]}
          active={chartTabA}
          onChangeTab={setChartTabA}
          rows={chartARows}
          emptyLabel="Sin datos para mostrar."
          T={T}
          delay={0.05}
          onItemClick={goToScreen}
          companySelector={isSuperAdmin && (
            <CompanySelect companies={companies} value={selectedCompanyId} onChange={setSelectedCompanyId} T={T} />
          )}
        />

        <GroupedChartCard
          title="Imágenes y videos por sede"
          rows={mediaByVenueSorted}
          emptyLabel="Sin media asignada."
          T={T}
          delay={0.1}
        />
      </div>

    </div>
  );
}
