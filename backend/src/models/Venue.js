const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Venue = sequelize.define('Venue', {
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, defaultValue: '' },
  description: { type: DataTypes.TEXT, defaultValue: '' },
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
  tableName: 'Venues'
});

module.exports = Venue;
