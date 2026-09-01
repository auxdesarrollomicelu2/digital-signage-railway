const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Media = sequelize.define('Media', {
  filename: { type: DataTypes.STRING, allowNull: false },
  original_name: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  cloudflare_key: { type: DataTypes.STRING },
  mime_type: { type: DataTypes.STRING },
  size: { type: DataTypes.BIGINT },
  width: { type: DataTypes.INTEGER },
  height: { type: DataTypes.INTEGER },
  duration: { type: DataTypes.DOUBLE },
  company_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    }
  },
}, {
  schema: 'digital_signage',
  tableName: 'Media'
});

module.exports = Media;
