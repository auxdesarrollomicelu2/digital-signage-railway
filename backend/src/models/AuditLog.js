const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AuditLog = sequelize.define('AuditLog', {
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  user_name: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING(50), allowNull: false },
  resource_type: { type: DataTypes.STRING(50), allowNull: false },
  resource_id: { type: DataTypes.INTEGER },
  resource_name: { type: DataTypes.STRING },
  old_values: { type: DataTypes.JSONB },
  new_values: { type: DataTypes.JSONB },
  company_id: { type: DataTypes.INTEGER },
}, {
  schema: 'digital_signage',
  tableName: 'AuditLogs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = AuditLog;
