import { useTheme } from '../../context/ThemeContext';
import SelectDropdown from './SelectDropdown';

// Select de formulario con la misma cáscara (label + caja) que Input, usando el dropdown estilizado SelectDropdown.
export default function FormSelect({ label, value, onChange, options, placeholder = 'Seleccionar…', required = false, visibleLimit }) {
  const { T } = useTheme();
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: T.textSub, marginBottom: 7 }}>
          {label}
          {required && <span style={{ color: T.red, marginLeft: 3 }}>*</span>}
        </label>
      )}
      <SelectDropdown
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        minWidth={200}
        fullWidth
        {...(visibleLimit ? { visibleLimit } : {})}
        triggerStyle={{
          width: '100%', maxWidth: '100%', justifyContent: 'space-between',
          padding: '11px 14px', borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`,
          fontSize: 13.5, fontWeight: 500,
        }}
      />
    </div>
  );
}
