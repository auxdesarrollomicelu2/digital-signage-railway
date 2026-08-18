import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FB } from '../../styles/tokens';

// Buscador de la barra de filtros
export default function FilterSearchInput({ value, onChange, placeholder, style }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);

  return (
    <motion.div
      animate={{ y: focus ? -1 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, background: T.inputBg,
        border: `1px solid ${focus ? T.primary : T.inputBorder}`, borderRadius: 9,
        padding: '7px 11px', flex: '1 1 180px', minWidth: 140,
        boxShadow: focus ? `0 0 0 4px ${T.primaryDim}` : '0 0 0 0px transparent',
        transition: 'border-color .32s cubic-bezier(.22,1,.36,1), box-shadow .4s cubic-bezier(.22,1,.36,1)',
        ...style,
      }}
    >
      <motion.span
        animate={{ color: focus ? T.primary : T.textSub, scale: focus ? 1.1 : 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex' }}
      >
        <Search size={12} />
      </motion.span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{ background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 12.5, flex: 1, fontFamily: FB, minWidth: 0, transition: 'color .25s ease' }}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            onClick={() => onChange('')}
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: 'transparent', border: 'none', color: T.textSub, cursor: 'pointer', display: 'flex' }}
          >
            <X size={11} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
