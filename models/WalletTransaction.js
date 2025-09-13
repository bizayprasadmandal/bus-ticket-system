const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  wallet_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'user_wallets',
      key: 'id',
    },
  },
  transaction_type: {
    type: DataTypes.ENUM('CREDIT', 'DEBIT'),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  reference_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  reference_type: {
    type: DataTypes.ENUM('BOOKING', 'REFUND', 'TOPUP', 'CASHBACK'),
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'wallet_transactions',
  timestamps: false,
});

module.exports = WalletTransaction;