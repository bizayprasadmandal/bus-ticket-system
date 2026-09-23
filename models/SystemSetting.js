const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(64), unique: true, allowNull: false },
  value: { type: DataTypes.TEXT('long'), allowNull: false },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'system_settings', timestamps: false });

module.exports = SystemSetting;
