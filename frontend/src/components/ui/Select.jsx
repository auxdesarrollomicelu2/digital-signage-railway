export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
  required = false,
  variant = 'light',
}) {
  const isDark = variant === 'dark';
  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
          {required && <span className={isDark ? 'text-red-400 ml-1' : 'text-red-500 ml-1'}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={
          isDark
            ? 'w-full px-3 py-2 border border-border-dark rounded-lg bg-card-dark text-white focus:ring-2 focus:ring-accent/50 focus:border-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed'
            : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed'
        }
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
