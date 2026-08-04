import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <motion.div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-all duration-200
            ${checked ? 'bg-accent border-accent' : 'bg-transparent border-border-dark'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'group-hover:border-accent'}
          `}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Check size={14} className="text-black" strokeWidth={3} />
            </motion.div>
          )}
        </motion.div>
      </div>
      {label && (
        <span className="text-sm text-gray-300 select-none">{label}</span>
      )}
    </label>
  );
}
