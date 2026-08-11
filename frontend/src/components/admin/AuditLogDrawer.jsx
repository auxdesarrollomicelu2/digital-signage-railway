import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { useTheme } from '../../context/ThemeContext';
import { FD, FB, EASE } from '../../styles/tokens';
import { ACTION_MAP } from '../../utils/auditLogConstants';

// Traduce los nombres técnicos de campos (los que salen tal cual de la BD)
// a etiquetas que cualquier persona no desarrolladora pueda entender.
const FIELD_LABELS = {
  id: 'ID', name: 'Nombre', description: 'Descripción', status: 'Estado',
  size: 'Tamaño', filename: 'Nombre de archivo', original_name: 'Nombre original',
  cloudflare_key: 'Ruta de almacenamiento', mime_type: 'Tipo de archivo', type: 'Tipo',
  duration: 'Duración', width: 'Ancho', height: 'Alto', url: 'Enlace',
  created_at: 'Creado', updated_at: 'Actualizado', order_index: 'Orden',
  is_active: 'Activo', active: 'Activo', email: 'Correo', address: 'Dirección', phone: 'Teléfono',
  company_id: 'Empresa (ID)', venue_id: 'Sede (ID)', screen_id: 'Pantalla (ID)',
  playlist_id: 'Playlist (ID)', user_id: 'Usuario (ID)', resource_type: 'Tipo de recurso',
  items_count: 'Cantidad de elementos', screens_count: 'Cantidad de pantallas',
  media_count: 'Cantidad de archivos', role: 'Rol', username: 'Usuario',
};

function fieldLabel(key) {
  return FIELD_LABELS[key] || key;
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Para ciertos campos técnicos, mostramos una versión legible del valor en
// vez del dato crudo (bytes, rutas de almacenamiento, duración en segundos).
function formatFieldValue(key, value) {
  if (value === null || value === undefined) return null;
  if (key === 'size') return formatBytes(value);
  if (key === 'duration' && Number.isFinite(Number(value))) return `${Number(value)} seg`;
  if (key === 'cloudflare_key' && typeof value === 'string') return value.split('/').pop();
  return null;
}

function JsonValue({ fieldKey, value, T }) {
  if (value === null || value === undefined) return <span style={{ color: T.textSub, fontStyle: 'italic' }}>Sin dato</span>;
  const friendly = fieldKey ? formatFieldValue(fieldKey, value) : null;
  if (friendly !== null) {
    return <span style={{ color: T.text, fontWeight: 600 }}>{friendly}</span>;
  }
  if (typeof value === 'string') return <span style={{ color: T.text, wordBreak: 'break-word' }}>{value}</span>;
  if (typeof value === 'number') return <span style={{ color: T.text, fontWeight: 600 }}>{value}</span>;
  if (typeof value === 'boolean') return <span style={{ color: value ? T.green : T.red, fontWeight: 600 }}>{value ? 'Sí' : 'No'}</span>;
  return <span style={{ color: T.text }}>{String(value)}</span>;
}

// Vista formateada (no <pre> crudo) de un objeto de valores de auditoría —
// cada campo como una fila etiqueta/valor con tipografía normal (no monospace
// ni colores de sintaxis), para que se lea como información y no como código.
function PrettyJson({ data, T, depth = 0 }) {
  if (data === null || typeof data !== 'object') return <JsonValue value={data} T={T} />;

  const entries = Array.isArray(data) ? data.map((v, i) => [i, v]) : Object.entries(data);
  if (entries.length === 0) return <span style={{ color: T.textSub, fontStyle: 'italic' }}>Sin datos</span>;

  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0, borderLeft: depth > 0 ? `2px solid ${T.border}` : 'none' }}>
      {entries.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14,
            padding: '8px 0', borderBottom: depth === 0 ? `1px solid ${T.border}` : 'none',
          }}
        >
          <span style={{ flexShrink: 0, fontWeight: 600, color: T.textSub }}>{Array.isArray(data) ? `#${Number(key) + 1}` : fieldLabel(key)}</span>
          <div style={{ textAlign: 'right' }}>
            {value !== null && typeof value === 'object' ? <PrettyJson data={value} T={T} depth={depth + 1} /> : <JsonValue fieldKey={Array.isArray(data) ? null : key} value={value} T={T} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoField({ label, value, T, span }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 13, color: T.text, marginTop: 2, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

/**
 * Panel lateral con el detalle de un log de auditoría — abre de derecha a
 * izquierda (no modal centrado), muestra los valores anteriores/nuevos ya
 * formateados, y permite recorrer los registros cargados con ← → o los
 * botones sin tener que cerrar el panel.
 */
export default function AuditLogDrawer({ logs, index, onClose, onNavigate, formatDate, resourceLabel }) {
  const { T } = useTheme();
  const open = index != null && index >= 0 && index < logs.length;
  useLockBodyScroll(open);

  const log = open ? logs[index] : null;

  function goPrev() {
    if (index > 0) onNavigate(index - 1);
  }
  function goNext() {
    if (index < logs.length - 1) onNavigate(index + 1);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, logs.length]);

  const action = log ? (ACTION_MAP[log.action] || { label: log.action, key: 'blue' }) : null;
  const actionColor = action ? T[action.key] : T.blue;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(4,6,10,.55)', backdropFilter: 'blur(6px)' }}
          />
          <motion.div
            key="drawer"
            initial={{ x: '100%', opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.4 }}
            transition={{ duration: 0.38, ease: EASE }}
            style={{
              position: 'fixed', top: 12, right: 12, bottom: 12, width: 'min(460px, calc(100vw - 24px))', zIndex: 401,
              background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 22,
              boxShadow: '-24px 0 64px -20px rgba(0,0,0,.6)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.path
                d="M 0 100 L 0 0 L 100 0"
                fill="none"
                stroke={actionColor}
                strokeWidth={0.7}
                strokeLinecap="round"
                strokeDasharray="24 176"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -200 }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                style={{ filter: `drop-shadow(0 0 5px ${actionColor})` }}
              />
            </svg>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FD }}>Detalle del registro</div>
                <div style={{ fontSize: 11.5, color: T.textSub, marginTop: 2 }}>{index + 1} de {logs.length}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={index === 0}
                  aria-label="Registro anterior"
                  title="Registro anterior"
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg,
                    color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.35 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={index === logs.length - 1}
                  aria-label="Registro siguiente"
                  title="Registro siguiente"
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg,
                    color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: index === logs.length - 1 ? 'not-allowed' : 'pointer', opacity: index === logs.length - 1 ? 0.35 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 4, transition: 'all .15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.redDim; e.currentTarget.style.color = T.red; e.currentTarget.style.transform = 'rotate(90deg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.textSub; e.currentTarget.style.transform = 'rotate(0deg)'; }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {log && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <InfoField label="Usuario" value={log.user_name} T={T} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.06em' }}>Acción</div>
                    <span style={{
                      display: 'inline-block', marginTop: 4, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                      background: `${actionColor}18`, color: actionColor, border: `1px solid ${actionColor}33`,
                    }}>
                      {action.label}
                    </span>
                  </div>
                  <InfoField label="Recurso" value={resourceLabel(log.resource_type)} T={T} />
                  <InfoField label="Empresa" value={log.Company?.name || '—'} T={T} />
                  <InfoField label="Nombre del recurso" value={log.resource_name || '—'} T={T} span />
                  <InfoField label="Fecha" value={formatDate(log.created_at)} T={T} span />
                </div>

                {!log.old_values && !log.new_values && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.textSub }}>
                    <ShieldCheck size={14} /> Este registro no tiene valores adicionales.
                  </div>
                )}

                {log.old_values && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Valores anteriores</h4>
                    <div style={{ overflow: 'auto', borderRadius: 14, border: `1px solid ${T.border}`, background: T.inputBg, padding: '4px 14px', fontFamily: FB, fontSize: 12.5, lineHeight: 1.5 }}>
                      <PrettyJson data={log.old_values} T={T} />
                    </div>
                  </div>
                )}

                {log.new_values && (
                  <div>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Valores nuevos</h4>
                    <div style={{ overflow: 'auto', borderRadius: 14, border: `1px solid ${T.border}`, background: T.inputBg, padding: '4px 14px', fontFamily: FB, fontSize: 12.5, lineHeight: 1.5 }}>
                      <PrettyJson data={log.new_values} T={T} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
