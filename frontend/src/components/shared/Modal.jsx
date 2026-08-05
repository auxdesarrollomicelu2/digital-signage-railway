import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { FD } from '../../styles/tokens';

/** Modal genérico — portado de SignageControlCenter_v3.jsx (Modal). */
export default function Modal({ open, onClose, title, subtitle, children, accent }) {
  const { T } = useTheme();
  const ac = accent || T.primary;
  useLockBodyScroll(open);
  if (!open) return null;

  // Portal a document.body: si el modal vive dentro del árbol de la páginaç
  //
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(14px)', animation: 'fadeIn .2s ease both' }} />
      <div className="sweep" style={{ '--sc': ac, '--so': 1, position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', borderRadius: 20, animation: 'modalIn .3s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ background: T.modalBg, borderRadius: 19, border: `1px solid ${T.border}`, boxShadow: `0 32px 80px -16px rgba(0,0,0,.7),0 0 48px ${ac}10`, overflow: 'auto', width: '100%' }}>
          <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: '-.02em', fontFamily: FD }}>{title}</div>
              {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.redDim; e.currentTarget.style.color = T.red; e.currentTarget.style.transform = 'rotate(90deg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.textSub; e.currentTarget.style.transform = 'rotate(0deg)'; }}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ padding: '16px 24px 24px' }}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
