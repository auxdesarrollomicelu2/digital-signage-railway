import Modal from './Modal';
import Btn from './Btn';
import Input from '../ui/Input';
import FormSelect from './FormSelect';
import { useTheme } from '../../context/ThemeContext';

/**
 * Modal de crear/editar pantalla
 */
export default function ScreenModal({ open, onClose, onSubmit, form, setForm, venues, isEdit }) {
  const { T } = useTheme();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar pantalla' : 'Nueva pantalla'}
      subtitle={isEdit ? 'El Device ID no se puede cambiar' : 'Registra un nuevo dispositivo'}
      accent={T.blue}
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Pantalla Recepción"
          required
          variant="dark"
        />
        <Input
          label="Device ID"
          value={form.device_id}
          onChange={(e) => setForm({ ...form, device_id: e.target.value })}
          placeholder="Ej: screen-005"
          disabled={isEdit}
          required
          variant="dark"
        />
        <FormSelect
          label="Sede"
          required
          value={form.venue_id}
          onChange={(v) => setForm({ ...form, venue_id: v })}
          options={venues.map((v) => ({ value: String(v.id), label: v.name }))}
          placeholder="Seleccionar sede"
        />
        <FormSelect
          label="Orientación"
          value={form.orientation}
          onChange={(v) => setForm({ ...form, orientation: v })}
          options={[
            { value: 'landscape', label: 'Horizontal (Landscape)' },
            { value: 'portrait', label: 'Vertical (Portrait)' },
          ]}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn variant="secondary" onClick={onClose} type="button" style={{ flex: 1, padding: '11px' }}>Cancelar</Btn>
          <Btn variant="primary" accentColor={T.blue} type="submit" style={{ flex: 1, padding: '11px' }}>
            {isEdit ? 'Guardar cambios' : 'Registrar pantalla'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
