const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BusLocation = sequelize.define('BusLocation', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  trip_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'trips',
      key: 'id',
    },
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  speed: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  heading: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'bus_locations',
  timestamps: false,
});

module.exports = BusLocation;