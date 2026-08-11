import { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FB } from '../../styles/tokens';

/** Portado de SignageControlCenter_v3.jsx (ClearFiltersButton). */
export default function ClearFiltersButton({ onClick, style }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: 12.5, fontWeight: 600, color: hov ? T.text : T.textSub, background: T.inputBg,
        border: `1px solid ${hov ? T.borderActive : T.border}`, borderRadius: 8, padding: '7px 12px',
        cursor: 'pointer', fontFamily: FB, display: 'inline-flex', alignItems: 'center', gap: 5,
        transition: 'all .15s ease', flexShrink: 0, ...style,
      }}
    >
      <X size={11} /> Limpiar filtros
    </button>
  );
}
