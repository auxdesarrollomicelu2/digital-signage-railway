const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ScreenLog = sequelize.define('ScreenLog', {
  screen_id: { type: DataTypes.INTEGER, allowNull: false },
  screen_name: { type: DataTypes.STRING, allowNull: false },
  device_id: { type: DataTypes.STRING(100), allowNull: false },
  event_type: { type: DataTypes.STRING(50), allowNull: false },
  status: { type: DataTypes.STRING(20) },
  playlist_items: { type: DataTypes.INTEGER },
  error_message: { type: DataTypes.TEXT },
  company_id: { type: DataTypes.INTEGER },
}, {
  schema: 'digital_signage',
  tableName: 'ScreenLogs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = ScreenLog;
