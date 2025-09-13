const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trip = sequelize.define('Trip', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  route_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'routes',
      key: 'id',
    },
  },
  bus_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'buses',
      key: 'id',
    },
  },
  trip_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  departure_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  arrival_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  current_fare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },
  available_seats: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED'),
    allowNull: true,
  },
  driver_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  driver_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  conductor_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  conductor_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'trips',
  timestamps: false,
});

module.exports = Trip;