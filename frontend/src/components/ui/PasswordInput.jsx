import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function PasswordInput({ 
  label, 
  placeholder, 
  error, 
  disabled,
  value,
  onChange,
  variant = 'light',
  ...props 
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isDark = variant === 'dark';

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-3 sm:left-4 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          <Lock size={18} className="sm:w-5 sm:h-5" />
        </div>

        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 pl-10 sm:pl-12 pr-10 sm:pr-12
            border rounded-xl
            text-sm sm:text-base
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isDark 
              ? `bg-card-dark text-white placeholder-gray-500 focus:ring-accent/50 focus:border-accent ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : 'border-border-dark'}` 
              : `bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`
            }
          `}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={`absolute right-3 sm:right-4 md:right-4 top-1/2 -translate-y-1/2 transition-colors z-10 focus:outline-none p-1 ${
            isDark ? 'text-gray-400 hover:text-accent' : 'text-gray-500 hover:text-indigo-600'
          }`}
          tabIndex={-1}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? (
            <EyeOff size={18} className="sm:w-5 sm:h-5" />
          ) : (
            <Eye size={18} className="sm:w-5 sm:h-5" />
          )}
        </button>
      </div>

      {error && (
        <p className={`mt-1.5 text-xs sm:text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</p>
      )}
    </div>
  );
}
