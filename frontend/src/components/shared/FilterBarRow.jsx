import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { EASE } from '../../styles/tokens';

/**
 * Envoltorio del filtro global (FilterChipBar + buscador) 
 */
export default function FilterBarRow({ children }) {
  const { T } = useTheme();
  const [hov, setHov] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ layout: { type: 'spring', stiffness: 380, damping: 32 }, default: { duration: 0.5, ease: EASE } }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', zIndex: 30, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 10 }}
    >
      <motion.div
        layout
        transition={{ layout: { type: 'spring', stiffness: 380, damping: 32 } }}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}
      >
        {children}
      </motion.div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, overflow: 'hidden', borderRadius: 1 }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          style={{ transformOrigin: 'left', height: '100%', background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }}
        />
        <motion.div
          animate={{
            opacity: hov ? [0.4, 1, 0.4] : 0,
            left: hov ? ['-20%', '110%'] : '-20%',
          }}
          transition={{ duration: 1.8, ease: 'easeInOut', repeat: hov ? Infinity : 0 }}
          style={{
            position: 'absolute', top: 0, width: '20%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${T.primary}, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
}
