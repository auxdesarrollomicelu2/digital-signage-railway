import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Btn from './Btn';
import { FD } from '../../styles/tokens';


export default function ConfirmModal({ 
  open, 
  onClose, 
  onConfirm, 
  title,
  message,
  icon: Icon,
  iconColor,
  iconBgColor,
  iconBorderColor,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  loading = false,
  variant = 'primary' // 'primary' | 'danger'
}) {
  const { T } = useTheme();
  useLockBodyScroll(open);
  if (!open) return null;

  const isDanger = variant === 'danger';
  const finalIconColor = iconColor || (isDanger ? T.red : T.primary);
  const finalIconBgColor = iconBgColor || (isDanger ? T.redDim : T.primaryDim);
  const finalIconBorderColor = iconBorderColor || (isDanger ? `${T.red}44` : `${T.primary}44`);
  const messageBoxBg = isDanger ? T.redDim : `${T.primary}15`;
  const messageBoxBorder = isDanger ? `${T.red}22` : `${T.primary}22`;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(16px)' }} />
      <div className="sweep" style={{ '--sc': T.primary, '--so': 1, position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, animation: 'modalIn .3s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ background: T.modalBg, borderRadius: 19, border: `1px solid ${T.border}`, overflow: 'hidden', textAlign: 'center', padding: '36px 28px 28px' }}>
          {Icon && (
            <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: finalIconBgColor, border: `1.5px solid ${finalIconBorderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${isDanger ? T.red : T.primary}22`, animation: 'pulse 2s ease-in-out infinite' }} />
              <Icon size={28} color={finalIconColor} strokeWidth={1.6} />
            </div>
          )}
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: FD }}>{title}</div>
          <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, marginBottom: 24, padding: '12px 16px', background: messageBoxBg, borderRadius: 10, border: `1px solid ${messageBoxBorder}` }}>
            {message}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={onClose} disabled={loading} style={{ flex: 1, padding: '11px' }}>
              {cancelText}
            </Btn>
            <Btn variant="secondary" onClick={onConfirm} loading={loading} disabled={loading} style={{ flex: 1, padding: '11px' }}>
              {Icon && <Icon size={13} />} {confirmText}
            </Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
