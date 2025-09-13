const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SeatLock = sequelize.define('SeatLock', {
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
  seat_numbers: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  locked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('LOCKED', 'RELEASED', 'BOOKED'),
    allowNull: true,
  },
}, {
  tableName: 'seat_locks',
  timestamps: false,
});

module.exports = SeatLock;