import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FB, EASE } from '../../styles/tokens';

// Select estilizado que se porta a document.body y se posiciona con coordenadas fijas desde el trigger, para no quedar recortado por contenedores con overflow.
export default function SelectDropdown({ value, onChange, options, placeholder = 'Seleccionar…', triggerStyle, minWidth = 150, fullWidth = false, visibleLimit = 6 }) {
  const { T } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
  }

  function handleToggle() {
    if (!open) updatePosition();
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return undefined;

    function onDocMouseDown(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    // Cualquier scroll (del <main>, de un modal, de la ventana) invalida la
    // posición calculada — cerrar es más simple y confiable que reposicionar
    // en cada evento de scroll de todos los ancestros posibles.
    function onScroll(e) {
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const ITEM_HEIGHT = 37; // alto real de cada opción (padding 9px + texto + borde)
  const needsScroll = options.length > visibleLimit;

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: fullWidth ? '100%' : undefined }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent',
          outline: 'none', color: T.text, fontSize: 12.5, fontFamily: FB, cursor: 'pointer',
          maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          ...triggerStyle,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22, ease: EASE }} style={{ display: 'flex', flexShrink: 0, color: T.textSub }}>
          <ChevronDown size={12} />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.17, ease: EASE }}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, zIndex: 400,
                width: fullWidth ? pos.width : undefined, minWidth: Math.max(minWidth, 160),
                background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 12,
                boxShadow: '0 20px 48px -12px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.03)',
                overflow: 'hidden', maxHeight: needsScroll ? ITEM_HEIGHT * visibleLimit : 'none', overflowY: needsScroll ? 'auto' : 'visible',
              }}
            >
              {options.map((o, i) => {
                const isSelected = String(o.value) === String(value);
                return (
                  <motion.button
                    key={o.value}
                    type="button"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.14, delay: Math.min(i, 8) * 0.02, ease: EASE }}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '9px 12px', background: isSelected ? T.primaryDim : 'transparent', border: 'none',
                      borderBottom: `1px solid ${T.border}`, color: isSelected ? T.primary : T.text,
                      fontSize: 12.5, fontFamily: FB, fontWeight: isSelected ? 700 : 500, cursor: 'pointer', textAlign: 'left',
                      transition: 'background .12s ease, color .12s ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.primary; } }}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text; } }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                    {isSelected && <Check size={12} style={{ flexShrink: 0 }} />}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
