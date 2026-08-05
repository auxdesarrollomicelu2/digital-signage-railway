// Contador global de modales abiertos — un módulo singleton simple (no un
// Context) para que cualquier componente, sin importar dónde viva en el
// árbol, pueda saber "¿hay algún modal abierto ahora mismo?" (por ejemplo,
// para ocultar el FAB magnético mientras el fondo está bloqueado).
let count = 0;
const listeners = new Set();

export function pushModal() {
  count += 1;
  listeners.forEach((l) => l(count));
}

export function popModal() {
  count = Math.max(0, count - 1);
  listeners.forEach((l) => l(count));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getModalCount() {
  return count;
}
