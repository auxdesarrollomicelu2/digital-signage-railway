import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Btn from './Btn';
import { FD } from '../../styles/tokens';

/**
 * Modal de confirmación genérico — mismo lenguaje visual que DeleteModal,
 * pero para acciones reversibles (activar/desactivar, etc.) en vez de borrado.
 */
export default function ConfirmModal({ open, onClose, onConfirm, icon: Icon, title, message, confirmLabel = 'Confirmar', color, T: TProp }) {
  const { T: TCtx } = useTheme();
  const T = TProp || TCtx;
  const ac = color || T.primary;
  useLockBodyScroll(open);
  if (!open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(16px)' }} />
      <div className="sweep" style={{ '--sc': ac, '--so': 1, position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, animation: 'modalIn .3s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ background: T.modalBg, borderRadius: 19, border: `1px solid ${T.border}`, overflow: 'hidden', textAlign: 'center', padding: '36px 28px 28px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: `${ac}1c`, border: `1.5px solid ${ac}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${ac}22`, animation: 'pulse 2s ease-in-out infinite' }} />
            {Icon && <Icon size={28} color={ac} strokeWidth={1.6} />}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: FD }}>{title}</div>
          <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, marginBottom: 24, padding: '12px 16px', background: `${ac}14`, borderRadius: 10, border: `1px solid ${ac}22` }}>
            {message}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={onClose} style={{ flex: 1, padding: '11px' }}>Cancelar</Btn>
            <Btn variant="primary" accentColor={ac} onClick={onConfirm} style={{ flex: 1, padding: '11px' }}>
              {Icon && <Icon size={13} />} {confirmLabel}
            </Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
