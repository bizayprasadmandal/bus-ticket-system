const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const City = sequelize.define('City', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  name_nepali: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  province: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  is_major_city: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'cities',
  timestamps: false,
});

module.exports = City;