import { useTheme } from '../context/ThemeContext';
import CornerGrid from './CornerGrid';
import CornerGridStatic from './CornerGridStatic';

// Fondo global fijo cuadrícula de esquina luces difuminadas
export default function Backdrop() {
  const { T } = useTheme();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: T.bg,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <CornerGrid />
      <CornerGridStatic />
      <div
        style={{
          position: 'absolute', width: 560, height: 560, top: -200, left: '8%',
          borderRadius: '50%', filter: 'blur(110px)', opacity: 0.13, background: T.primary,
        }}
      />
      <div
        style={{
          position: 'absolute', width: 440, height: 440, top: '20%', right: '5%',
          borderRadius: '50%', filter: 'blur(110px)', opacity: 0.10, background: T.accent,
        }}
      />
    </div>
  );
}
