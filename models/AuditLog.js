const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user: { type: DataTypes.STRING(100), allowNull: true },
  action: { type: DataTypes.STRING(50), allowNull: false },
  entity_type: { type: DataTypes.STRING(50), allowNull: false },
  entity_id: { type: DataTypes.STRING(50), allowNull: true },
  details: { type: DataTypes.TEXT, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'audit_logs', timestamps: false });

module.exports = AuditLog;
