import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onClick,
  icon: Icon,
  fullWidth,
  ...props
}) {
  const variants = {
    primary: 'bg-accent hover:bg-accent/90 text-black font-semibold shadow-lg shadow-accent/20',
    secondary: 'bg-transparent border-2 border-accent text-accent hover:bg-accent/10',
    ghost: 'bg-transparent text-gray-300 hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base',
    lg: 'px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl font-body
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Cargando...
        </>
      ) : (
        <>
          {Icon && <Icon size={20} />}
          {children}
        </>
      )}
    </motion.button>
  );
}
