import { useEffect } from 'react';
import { pushModal, popModal } from './modalStore';

// Bloquea el scroll de la página detrás de un modal mientras está abierto —
// el fondo queda completamente inerte (ni scroll ni interacción), y se
// restaura al cerrar o desmontar. También avisa al contador global de
// modales abiertos (ver modalStore/useAnyModalOpen), que usan elementos
// flotantes como el FAB magnético para ocultarse mientras tanto.
export default function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    pushModal();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      popModal();
      document.body.style.overflow = overflow;
    };
  }, [locked]);
}
