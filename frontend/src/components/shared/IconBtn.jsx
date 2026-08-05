import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

/** Portado de SignageControlCenter_v3.jsx (IconBtn). */
export default function IconBtn({ icon: Icon, onClick, label, color, size = 28, iconSize = 13 }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: size, height: size, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', background: hov ? (color ? `${color}18` : T.inputBg) : 'transparent',
        border: `1px solid ${hov ? (color || T.primary) + '44' : T.border}`,
        color: hov ? (color || T.primary) : T.textSub,
        transition: 'all .16s ease', transform: hov ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <Icon size={iconSize} />
    </button>
  );
}
