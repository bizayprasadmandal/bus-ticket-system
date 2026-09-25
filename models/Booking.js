const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  pnr: {
    type: DataTypes.STRING(10),
    unique: true,
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
  trip_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'trips',
      key: 'id',
    },
  },
  booking_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  total_passengers: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  base_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  service_fee: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  payment_status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
    allowNull: true,
  },
  booking_status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'),
    allowNull: true,
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  promo_code: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'bookings',
  timestamps: false,
});

module.exports = Booking;