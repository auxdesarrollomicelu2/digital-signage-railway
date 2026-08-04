export default function Input({ 
  label, 
  value, 
  onChange, 
  placeholder = '', 
  type = 'text',
  className = '',
  disabled = false,
  required = false,
  icon: Icon = null,
  error = '',
  variant = 'light',
  ...props
}) {
  const isDark = variant === 'dark';
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {label}
          {required && <span className={isDark ? 'text-red-400 ml-1' : 'text-red-500 ml-1'}>*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 sm:left-4 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <Icon size={18} className="sm:w-5 sm:h-5" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 pr-3 sm:pr-4
            border rounded-xl
            text-sm sm:text-base
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-10 sm:pl-12' : 'pl-3 sm:pl-4'}
            ${isDark 
              ? `bg-card-dark text-white placeholder-gray-500 focus:ring-accent/50 focus:border-accent ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : 'border-border-dark'}` 
              : `bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`
            }
          `}
          {...props}
        />
      </div>
      {error && (
        <p className={`mt-1.5 text-xs sm:text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</p>
      )}
    </div>
  );
}
