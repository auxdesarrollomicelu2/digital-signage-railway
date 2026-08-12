import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FB } from '../../styles/tokens';

/** Botón con ripple + glass-swipe — portado de SignageControlCenter_v3.jsx (Btn). */
export default function Btn({ children, onClick, variant = 'ghost', size = 'md', style, disabled, loading, accentColor, ...rest }) {
  const { T } = useTheme();
  const [ripples, setRipples] = useState([]);
  const [hover, setHover] = useState(false);
  const ac = accentColor || T.primary;

  // Deshabilitar si está loading o disabled
  const isDisabled = disabled || loading;

  const handleClick = (e) => {
    if (isDisabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    onClick && onClick(e);
  };

  const pd = { sm: '6px 12px', md: '9px 16px', lg: '11px 22px' }[size];
  const fs = { sm: 12, md: 13, lg: 14 }[size];
  const styles = {
    primary: { bg: `linear-gradient(135deg,${ac},${T.primaryMid})`, color: '#050F0C', border: '1px solid transparent', shadow: `0 8px 24px -6px ${ac}55` },
    secondary: { bg: hover ? T.primaryDim : T.inputBg, color: hover ? ac : T.textSub, border: `1px solid ${hover ? ac + '44' : T.inputBorder}`, shadow: 'none' },
    ghost: { bg: hover ? T.inputBg : 'transparent', color: hover ? T.text : T.textSub, border: `1px solid ${hover ? T.border : 'transparent'}`, shadow: 'none' },
    danger: { bg: hover ? T.redDim : 'transparent', color: T.red, border: `1px solid ${hover ? T.red + '44' : T.border}`, shadow: 'none' },
  }[variant];

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileTap={isDisabled ? {} : { scale: 0.96 }}
      whileHover={isDisabled ? {} : { y: variant === 'primary' ? -1 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        position: 'relative', overflow: 'hidden', cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 10, padding: pd, fontSize: fs, fontWeight: 600, fontFamily: FB,
        background: styles.bg, color: styles.color, border: styles.border,
        boxShadow: variant === 'primary' ? (hover ? styles.shadow : 'none') : 'none',
        opacity: isDisabled ? 0.45 : 1, ...style,
      }}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 size={fs + 2} className="animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,.4)',
            left: r.x, top: r.y, transform: 'translate(-50%,-50%)', animation: 'ripple .7s ease-out forwards', pointerEvents: 'none',
          }}
        />
      ))}
      {variant === 'primary' && hover && !loading && (
        <span
          style={{
            position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
            background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,.4) 50%,transparent 70%)',
            animation: 'glassSwipe .6s ease forwards', pointerEvents: 'none',
          }}
        />
      )}
    </motion.button>
  );
}
