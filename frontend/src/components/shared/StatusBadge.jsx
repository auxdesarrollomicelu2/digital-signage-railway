import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const STATUS_META = {
  online: { label: 'En línea', tone: 'green' },
  offline: { label: 'Fuera de línea', tone: 'red' },
};

/** Portado de SignageControlCenter_v3.jsx (StatusBadge). */
export default function StatusBadge({ status }) {
  const { T } = useTheme();
  const m = STATUS_META[status] || STATUS_META.offline;
  const c = T[m.tone];
  return (
    <motion.span
      layout
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '.01em',
        color: c, background: T[m.tone + 'Dim'], border: `1px solid ${c}33`, borderRadius: 99,
        padding: '3px 9px 3px 7px', flexShrink: 0,
      }}
    >
      <motion.span
        style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }}
        animate={
          status === 'online'
            ? { scale: [1, 1.35, 1], boxShadow: [`0 0 0 0 ${c}66`, `0 0 0 4px ${c}00`, `0 0 0 0 ${c}00`] }
            : { opacity: [1, 0.35, 1] }
        }
        transition={{ duration: status === 'online' ? 2 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {m.label}
    </motion.span>
  );
}
