import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Btn from './Btn';
import { FD } from '../../styles/tokens';

// Modal de confirmación de borrado
export default function DeleteModal({ open, onClose, onConfirm, itemName, loading = false }) {
  const { T } = useTheme();
  useLockBodyScroll(open);
  if (!open) return null;

  // Portal a document.body — ver Modal.jsx para la explicación completa del
  // bug de containing block que esto evita.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(16px)' }} />
      <div className="sweep" style={{ '--sc': T.primary, '--so': 1, position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, animation: 'modalIn .3s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ background: T.modalBg, borderRadius: 19, border: `1px solid ${T.border}`, overflow: 'hidden', textAlign: 'center', padding: '36px 28px 28px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: T.redDim, border: `1.5px solid ${T.red}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${T.red}22`, animation: 'pulse 2s ease-in-out infinite' }} />
            <Trash2 size={28} color={T.red} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6, fontFamily: FD }}>¿Eliminar este registro?</div>
          <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, marginBottom: 24, padding: '12px 16px', background: T.redDim, borderRadius: 10, border: `1px solid ${T.red}22` }}>
            Estás a punto de eliminar <strong style={{ color: T.text }}>&quot;{itemName}&quot;</strong>. Esta acción es permanente e irreversible.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={onClose} disabled={loading} style={{ flex: 1, padding: '11px' }}>Cancelar</Btn>
            <Btn variant="secondary" onClick={onConfirm} loading={loading} disabled={loading} style={{ flex: 1, padding: '11px' }}><Trash2 size={13} /> Eliminar</Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
