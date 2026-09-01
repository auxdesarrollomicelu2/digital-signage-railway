const { DataTypes } = require('sequelize');
const sequelize = require('../database');

/**
 * MediaRender Model
 * Caché de imágenes optimizadas (renderizadas)
 * 
 * Responsabilidades:
 * - Almacenar metadatos de renders optimizados
 * - Evitar reprocesar la misma combinación (media + resolución + rotación)
 * - Trackear estado de procesamiento (processing, ready, error)
 */
const MediaRender = sequelize.define('MediaRender', {
  media_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: 'ID del Media master original'
  },
  width: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: 'Ancho de resolución objetivo en píxeles'
  },
  height: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: 'Alto de resolución objetivo en píxeles'
  },
  rotation: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0,
    validate: {
      isIn: [[0, 90, 180, 270]]
    },
    comment: 'Rotación aplicada: 0, 90, 180 o 270 grados'
  },
  status: { 
    type: DataTypes.STRING(50), 
    defaultValue: 'processing',
    validate: {
      isIn: [['pending', 'processing', 'ready', 'error']]
    },
    comment: 'Estado del render: pending (encolado), processing (procesando), ready (listo), error (falló)'
  },
  url: { 
    type: DataTypes.STRING(500),
    comment: 'URL pública del render optimizado en Cloudflare R2'
  },
  cloudflare_key: { 
    type: DataTypes.STRING(500),
    comment: 'Key interno del archivo en R2 (para eliminación)'
  },
  mime_type: { 
    type: DataTypes.STRING(100),
    comment: 'Tipo MIME del render (image/jpeg, image/png, etc)'
  },
  file_size_bytes: { 
    type: DataTypes.BIGINT,
    comment: 'Tamaño del archivo renderizado en bytes'
  },
  error_message: { 
    type: DataTypes.TEXT,
    comment: 'Mensaje de error si status=error'
  },
}, {
  schema: 'digital_signage',
  tableName: 'MediaRenders',
  indexes: [
    { 
      unique: true, 
      fields: ['media_id', 'width', 'height', 'rotation'],
      name: 'media_render_unique_combo'
    }
  ]
});

module.exports = MediaRender;
