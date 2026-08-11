// Traducciones compartidas entre AuditLogs.jsx y AuditLogDrawer.jsx —
// mismo mapeo de acciones y tipos de recurso en ambos lugares.
export const ACTION_MAP = {
  create: { label: 'Crear', key: 'green' },
  update: { label: 'Actualizar', key: 'blue' },
  delete: { label: 'Eliminar', key: 'red' },
};

export const RESOURCE_TYPE_MAP = {
  Company: 'Empresa',
  Venue: 'Sede',
  Screen: 'Pantalla',
  Media: 'Media',
  Playlist: 'Playlist',
  User: 'Usuario',
};
