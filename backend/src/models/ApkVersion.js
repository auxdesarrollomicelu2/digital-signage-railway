const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ApkVersion = sequelize.define('ApkVersion', {
  version_code: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    unique: true 
  },
  version_name: { 
    type: DataTypes.STRING(50), 
    allowNull: false 
  },
  r2_key: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  sha256: { 
    type: DataTypes.STRING(64), 
    allowNull: false 
  },
  release_notes: { 
    type: DataTypes.TEXT 
  },
  file_size_bytes: { 
    type: DataTypes.BIGINT 
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Companies',
      key: 'id'
    }
  }
}, {
  schema: 'digital_signage',
  tableName: 'apk_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ApkVersion;
