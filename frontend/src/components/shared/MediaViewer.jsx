import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { EASE } from '../../styles/tokens';

function isVideoMime(mime) {
  return String(mime || '').toLowerCase().startsWith('video/');
}

/**
 * Visor tipo lightbox — permite recorrer todos los archivos con ← → o
 * los botones anterior/siguiente sin cerrar el visor. Reproduce video inline.
 */
export default function MediaViewer({ items, index, onClose, onNavigate }) {
  const { T } = useTheme();
  const open = index != null && index >= 0;
  useLockBodyScroll(open);

  const goPrev = useCallback(() => {
    if (index == null) return;
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index == null) return;
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext]);

  const item = open ? items[index] : null;
  const video = item ? isVideoMime(item.mime_type) : false;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(3,4,7,.92)', backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
              {index + 1} / {items.length}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar visor"
              style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${T.red}30`; e.currentTarget.style.borderColor = T.red; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 70px 24px', minHeight: 0 }}>
            {items.length > 1 && (
              <button
                onClick={goPrev}
                aria-label="Anterior"
                style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,.15)',
                  background: 'rgba(255,255,255,.06)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all .18s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.primary}30`; e.currentTarget.style.borderColor = T.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={item?.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22, ease: EASE }}
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
              >
                {video ? (
                  <video
                    key={item.id}
                    src={item.url}
                    controls
                    autoPlay
                    playsInline
                    style={{ maxWidth: '82vw', maxHeight: '72vh', borderRadius: 10, boxShadow: '0 24px 64px -16px rgba(0,0,0,.7)' }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.original_name}
                    style={{ maxWidth: '82vw', maxHeight: '72vh', borderRadius: 10, boxShadow: '0 24px 64px -16px rgba(0,0,0,.7)', objectFit: 'contain' }}
                  />
                )}
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 600, textAlign: 'center', maxWidth: '70vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.original_name}
                </div>
              </motion.div>
            </AnimatePresence>

            {items.length > 1 && (
              <button
                onClick={goNext}
                aria-label="Siguiente"
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,.15)',
                  background: 'rgba(255,255,255,.06)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all .18s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.primary}30`; e.currentTarget.style.borderColor = T.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
