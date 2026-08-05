import { useState, useEffect } from 'react';
import { subscribe, getModalCount } from './modalStore';

// True mientras haya al menos un modal abierto en cualquier parte de la app
// (lo alimenta useLockBodyScroll). Lo usan elementos flotantes globales
// (el FAB magnético) para desaparecer mientras el fondo está bloqueado.
export default function useAnyModalOpen() {
  const [count, setCount] = useState(getModalCount());
  useEffect(() => subscribe(setCount), []);
  return count > 0;
}
