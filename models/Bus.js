const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bus = sequelize.define('Bus', {
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
  bus_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: true,
  },
  bus_model: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  bus_type: {
    type: DataTypes.ENUM('DELUXE', 'SUPER_DELUXE', 'AC', 'NON_AC', 'SLEEPER', 'SEMI_SLEEPER', 'TOURIST'),
    allowNull: true,
  },
  total_seats: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  seat_layout: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  amenities: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  registration_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  insurance_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  fitness_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'MAINTENANCE', 'RETIRED'),
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'buses',
  timestamps: false,
});

module.exports = Bus;