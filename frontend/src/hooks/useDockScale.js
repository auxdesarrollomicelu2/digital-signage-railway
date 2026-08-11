import { useRef } from 'react';
import { useTransform, useSpring } from 'framer-motion';

// Efecto "Dock" — la fila más cercana al cursor (en el eje Y) crece un poco y
// las vecinas se achican con la distancia. Usado por listas verticales tipo
// "Actividad reciente" (Dashboard) y la tabla de Auditoría.
export default function useDockScale(mouseY, { distance = 60, magnification = 1.05, spring = { mass: 0.15, stiffness: 170, damping: 16 }, itemHeight = 44 } = {}) {
  const ref = useRef(null);

  const dist = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { top: 0, height: itemHeight };
    return val - rect.top - rect.height / 2;
  });
  const targetScale = useTransform(dist, [-distance, 0, distance], [1, magnification, 1]);
  const scale = useSpring(targetScale, spring);

  return { ref, scale };
}
