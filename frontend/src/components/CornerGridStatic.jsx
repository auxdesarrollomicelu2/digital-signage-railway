import { useTheme } from '../context/ThemeContext';

const SIZE = 640;
const COLS = 10;

// Versión estática (sin canvas/animación) de CornerGrid, espejada a la esquina superior izquierda.
export default function CornerGridStatic() {
  const { T } = useTheme();
  return (
    <div
      style={{
        position: 'absolute', left: -105, top: 0, width: SIZE, height: SIZE,
        maxWidth: '64vw', maxHeight: '68vh', pointerEvents: 'none',
        maskImage: 'radial-gradient(135% 135% at 0% 0%, black 58%, transparent 96%)',
        WebkitMaskImage: 'radial-gradient(135% 135% at 0% 0%, black 58%, transparent 96%)',
        backgroundImage: `linear-gradient(${T.primary}12 1px, transparent 1px), linear-gradient(90deg, ${T.primary}12 1px, transparent 1px)`,
        backgroundSize: `${100 / COLS}% ${100 / COLS}%`,
      }}
    />
  );
}
