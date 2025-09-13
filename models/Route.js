const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  operator_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'operators',
      key: 'id',
    },
  },
  route_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  origin_city: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  destination_city: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  distance_km: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
  estimated_duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  base_fare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },
  stops: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'routes',
  timestamps: false,
});

module.exports = Route;