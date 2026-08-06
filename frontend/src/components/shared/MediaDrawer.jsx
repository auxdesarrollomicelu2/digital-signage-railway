import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Building2, HardDrive, Calendar, Image as ImageIcon, Video, Eye, Trash2, Pencil, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { FD, EASE } from '../../styles/tokens';

function isVideoMime(mime) {
  return String(mime || '').toLowerCase().startsWith('video/');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function InfoRow({ icon: Icon, label, value, T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, background: T.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSub, flexShrink: 0 }}>
        <Icon size={12.5} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: T.textSub, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
        <div style={{ fontSize: 12.5, color: T.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
}

/** Panel lateral (drawer) con la vista previa e información de un archivo — no un modal. */
export default function MediaDrawer({ item, onClose, onRename, onDelete, onOpenViewer }) {
  const { T } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const inputRef = useRef(null);
  useLockBodyScroll(!!item);

  useEffect(() => {
    setEditing(false);
  }, [item?.id]);

  useEffect(() => {
    if (editing) {
      setNameDraft(item?.original_name || '');
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, item]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && item && !editing) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, editing, onClose]);

  function commitRename() {
    const trimmed = nameDraft.trim();
    setEditing(false);
    if (trimmed && trimmed !== item.original_name) onRename(item, trimmed);
  }

  const video = item ? isVideoMime(item.mime_type) : false;
  const accent = video ? T?.amber : T?.blue;

  return createPortal(
    <AnimatePresence>
      {item && (
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
              position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(420px, 100vw)', zIndex: 401,
              background: T.modalBg, borderLeft: `1px solid ${T.border}`, boxShadow: '-24px 0 64px -20px rgba(0,0,0,.6)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FD }}>Detalle del archivo</div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.redDim; e.currentTarget.style.color = T.red; e.currentTarget.style.transform = 'rotate(90deg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.textSub; e.currentTarget.style.transform = 'rotate(0deg)'; }}
              >
                <X size={13} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              <motion.div
                onClick={() => onOpenViewer(item)}
                style={{
                  position: 'relative', aspectRatio: '16/10', borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in',
                  background: `linear-gradient(145deg,${accent}12,${accent}06)`, border: `1px solid ${T.border}`,
                }}
              >
                {video ? (
                  <video src={item?.url} className="h-full w-full object-cover" muted preload="metadata" playsInline />
                ) : (
                  <img src={item?.url} alt={item?.original_name} className="h-full w-full object-cover" />
                )}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background .2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(10,13,18,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Eye size={16} />
                  </span>
                </div>
              </motion.div>

              <div style={{ marginTop: 16 }}>
                {editing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      ref={inputRef}
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
                      onBlur={commitRename}
                      style={{
                        flex: 1, fontSize: 14.5, fontWeight: 700, color: T.text, fontFamily: FD, background: T.inputBg,
                        border: `1px solid ${T.primary}`, borderRadius: 8, padding: '6px 9px', outline: 'none',
                      }}
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={commitRename}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: T.primaryDim, color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => setEditing(true)}
                    title="Doble clic para renombrar"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'text', padding: '4px 2px', borderRadius: 6 }}
                  >
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text, fontFamily: FD, wordBreak: 'break-word' }}>
                      {item?.original_name}
                    </span>
                    <Pencil size={11} color={T.textSub} style={{ flexShrink: 0 }} />
                  </div>
                )}
                <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>Doble clic sobre el nombre para editarlo</div>
              </div>

              <div style={{ marginTop: 14 }}>
                <InfoRow icon={video ? Video : ImageIcon} label="Tipo" value={video ? 'Video' : 'Imagen'} T={T} />
                <InfoRow icon={HardDrive} label="Peso" value={formatSize(item?.size || 0)} T={T} />
                {item?.Company && <InfoRow icon={Building2} label="Empresa" value={item.Company.name} T={T} />}
                <InfoRow icon={Calendar} label="Subido" value={formatDate(item?.createdAt)} T={T} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '14px 18px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
              <button
                onClick={() => onOpenViewer(item)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38,
                  borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${T.primary}, ${T.primaryMid})`,
                  color: '#052018', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Eye size={13} /> Ver
              </button>
              <button
                onClick={() => onDelete(item)}
                style={{
                  width: 38, height: 38, borderRadius: 9, border: `1px solid ${T.red}33`, background: `${T.red}12`,
                  color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                  transition: 'all .15s ease',
                }}
                title="Eliminar"
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
