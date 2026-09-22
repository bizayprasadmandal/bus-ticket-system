const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  booking_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id',
    },
  },
  payment_method: {
    type: DataTypes.ENUM('ESEWA', 'KHALTI', 'FONEPAY', 'CONNECTIPS', 'CARD', 'WALLET', 'CASH'),
    allowNull: true,
  },
  gateway_transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'NPR',
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'),
    allowNull: true,
  },
  gateway_response: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'payments',
  timestamps: false,
});

module.exports = Payment;