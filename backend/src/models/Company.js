const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Company = sequelize.define('Company', {
  name: { type: DataTypes.STRING, allowNull: false },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'owner' },
  document_type: { type: DataTypes.STRING },
  document: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  logo_url: { type: DataTypes.STRING },
}, {
  schema: 'digital_signage',
  tableName: 'Companies'
});

module.exports = Company;
