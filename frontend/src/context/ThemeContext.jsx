import { createContext, useContext, useEffect } from 'react';
import { T_DARK } from '../styles/tokens';

const ThemeContext = createContext(null);

// Mapea cada token a una CSS var --ds-<key>, para poder usarlas tanto
// desde estilos inline (T.primary) como desde clases CSS (.card, etc).
function applyCssVars(T) {
  const root = document.documentElement;
  Object.entries(T).forEach(([key, value]) => {
    if (typeof value === 'string') root.style.setProperty(`--ds-${key}`, value);
  });
}

export function ThemeProvider({ children }) {
  useEffect(() => {
    applyCssVars(T_DARK);
  }, []);

  return (
    <ThemeContext.Provider value={{ T: T_DARK }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  return ctx;
}
