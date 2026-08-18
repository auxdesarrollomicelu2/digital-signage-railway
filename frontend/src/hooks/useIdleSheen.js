import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

// Detecta inactividad global y devuelve `true` durante una breve ráfaga de "sheen" en las cards
export default function useIdleSheen(sweepMs = 2700) {
  const [active, setActive] = useState(false);
  const idleTimerRef = useRef(null);
  const sweepTimerRef = useRef(null);

  useEffect(() => {
    function scheduleIdle() {
      clearTimeout(idleTimerRef.current);
      const delay = 15000 + Math.random() * 5000; // 15-20s
      idleTimerRef.current = setTimeout(() => {
        setActive(true);
        sweepTimerRef.current = setTimeout(() => {
          setActive(false);
          scheduleIdle();
        }, sweepMs);
      }, delay);
    }

    function onActivity() {
      clearTimeout(sweepTimerRef.current);
      setActive(false);
      scheduleIdle();
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    scheduleIdle();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimeout(idleTimerRef.current);
      clearTimeout(sweepTimerRef.current);
    };
  }, [sweepMs]);

  return active;
}
