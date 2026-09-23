const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromoCode = sequelize.define('PromoCode', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(32), unique: true, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false, defaultValue: 'percentage' },
  discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  min_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  max_uses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  used_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  valid_from: { type: DataTypes.DATEONLY, allowNull: false },
  valid_until: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('ACTIVE', 'DISABLED'), allowNull: false, defaultValue: 'ACTIVE' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'promo_codes', timestamps: false });

module.exports = PromoCode;
