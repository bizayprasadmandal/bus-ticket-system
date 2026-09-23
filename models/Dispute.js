const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Dispute = sequelize.define('Dispute', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'users', key: 'id' } },
  booking_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'bookings', key: 'id' } },
  customer_name: { type: DataTypes.STRING(100), allowNull: true },
  customer_phone: { type: DataTypes.STRING(20), allowNull: true },
  booking_pnr: { type: DataTypes.STRING(20), allowNull: true },
  type: { type: DataTypes.ENUM('complaint', 'refund_request', 'service_issue'), allowNull: false, defaultValue: 'complaint' },
  subject: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('OPEN', 'INVESTIGATING', 'RESOLVED'), allowNull: false, defaultValue: 'OPEN' },
  resolution_notes: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'disputes', timestamps: false });

module.exports = Dispute;
