const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  target: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'ALL' },
  priority: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'MEDIUM' },
  sent_by: { type: DataTypes.STRING(100), allowNull: true },
  sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'announcements', timestamps: false });

module.exports = Announcement;
