import { useEffect, useState } from 'react';

// Devuelve `value` retrasado `delay` ms — evita disparar una petición por
// cada tecla escrita en un buscador; el input sigue respondiendo al instante,
// solo el efecto que dispara la carga de datos espera a que el usuario pause.
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
