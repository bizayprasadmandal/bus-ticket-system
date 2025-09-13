const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserWallet = sequelize.define('UserWallet', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    unique: true,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  total_earned: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  total_spent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_wallets',
  timestamps: false,
});

module.exports = UserWallet;