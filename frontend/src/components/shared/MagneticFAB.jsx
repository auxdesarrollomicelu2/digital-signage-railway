import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import useAnyModalOpen from '../../hooks/useAnyModalOpen';
import { FB } from '../../styles/tokens';

// Botón flotante magnético fijo abajo a la derecha, se acerca al cursor cuando está cerca.
export default function MagneticFAB({ onClick, label, icon: Icon, color }) {
  const { T } = useTheme();
  const fabRef = useRef(null);
  const rafRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);
  const ac = color || T.primary;
  const modalOpen = useAnyModalOpen();

  useEffect(() => {
    const handleMouseMove = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handleMouseMove);
    const animate = () => {
      const fab = fabRef.current;
      if (!fab) { rafRef.current = requestAnimationFrame(animate); return; }
      const rect = fab.getBoundingClientRect();
      // El rect ya incluye el transform del frame anterior — hay que restarlo
      // para obtener el centro real, o el bucle se retroalimenta y vibra.
      const fabCX = rect.left + rect.width / 2 - offsetRef.current.x;
      const fabCY = rect.top + rect.height / 2 - offsetRef.current.y;
      const dx = mouseRef.current.x - fabCX;
      const dy = mouseRef.current.y - fabCY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 150;
      const LIMIT = 26;
      let targetX = 0;
      let targetY = 0;
      if (dist < maxDist && dist > 0) {
        const pull = Math.pow(1 - dist / maxDist, 1.6) * LIMIT;
        targetX = (dx / dist) * pull;
        targetY = (dy / dist) * pull;
      }
      offsetRef.current.x += (targetX - offsetRef.current.x) * 0.14;
      offsetRef.current.y += (targetY - offsetRef.current.y) * 0.14;
      fab.style.transform = `translate(${offsetRef.current.x.toFixed(2)}px, ${offsetRef.current.y.toFixed(2)}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Mientras haya un modal abierto, el fondo está bloqueado — el FAB (y
  // cualquier otro flotante) no debe seguir ahí compitiendo visualmente.
  if (modalOpen) return null;

  // Portal a document.body: si el FAB se renderiza dentro del flujo normal de
  // la página, cualquier ancestro con un `transform` activo (p. ej. la clase
  // .enter, cuya animación termina en `transform: translateY(0)` con
  // `forwards`) lo convierte en containing block para position:fixed, y el
  // botón deja de quedar anclado al viewport. El portal lo saca de ese árbol
  // por completo, así siempre queda fijo a la pantalla y nunca estorba
  // (ni se ve afectado por) el resto del contenido de la página.
  return createPortal(
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 200, animation: 'fabPop .5s cubic-bezier(.22,1,.36,1) both' }}>
      <button
        ref={fabRef}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 20px 8px 8px',
          background: '#13161E', color: ac, border: `1.5px solid ${ac}`,
          borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB, willChange: 'transform',
          boxShadow: hov ? `0 0 32px ${ac}55, 0 0 0 1px ${ac}44, 0 8px 24px rgba(0,0,0,.5)` : `0 0 18px ${ac}28, 0 2px 12px rgba(0,0,0,.4)`,
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: `${ac}18`, border: `1.5px solid ${ac}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={ac} strokeWidth={2.2} />
        </span>
        {label}
      </button>
    </div>,
    document.body
  );
}
