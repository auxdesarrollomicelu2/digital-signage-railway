import Modal from './Modal';
import Btn from './Btn';
import Input from '../ui/Input';
import { useTheme } from '../../context/ThemeContext';

/**
 * Modal de Sede — mismo formulario para "Nueva sede" y "Editar sede",
 * portado al lenguaje visual de Modal/Btn/Input (mismo usado en ScreenModal).
 */
export default function SedeModal({ open, onClose, onSubmit, form, setForm, isEdit }) {
  const { T } = useTheme();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar sede' : 'Nueva sede'}
      subtitle={isEdit ? 'Actualiza los datos de la sede' : 'Registra una nueva sede'}
      accent={T.primary}
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="Nombre *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Sede Norte"
          required
          variant="dark"
        />
        <Input
          label="Dirección"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Ej: Calle 10 # 20-30"
          variant="dark"
        />
        <div className="w-full">
          <label className="block text-sm font-medium mb-1.5 sm:mb-2 text-gray-300">Descripción</label>
          <textarea
            value={form.description}
            rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Notas adicionales sobre la sede"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2 bg-card-dark text-white placeholder-gray-500 focus:ring-accent/50 focus:border-accent border-border-dark resize-none"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn variant="secondary" onClick={onClose} type="button" style={{ flex: 1, padding: '11px' }}>Cancelar</Btn>
          <Btn variant="primary" accentColor={T.primary} type="submit" style={{ flex: 1, padding: '11px' }}>
            {isEdit ? 'Guardar cambios' : 'Crear sede'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
