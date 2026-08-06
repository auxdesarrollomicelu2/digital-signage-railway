import { useTheme } from '../../context/ThemeContext';
import SelectDropdown from './SelectDropdown';

/**
 * Select de formulario — misma cáscara (label + caja con borde) que Input,
 * pero con el dropdown estilizado global (SelectDropdown) en vez del <select>
 * nativo del navegador, que no hereda ningún CSS propio del proyecto.
 */
export default function FormSelect({ label, value, onChange, options, placeholder = 'Seleccionar…', required = false }) {
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
        triggerStyle={{
          width: '100%', maxWidth: '100%', justifyContent: 'space-between',
          padding: '11px 14px', borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`,
          fontSize: 13.5, fontWeight: 500,
        }}
      />
    </div>
  );
}
