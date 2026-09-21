const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FareRule = sequelize.define('FareRule', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  operator_id: { type: DataTypes.BIGINT },
  route_id: { type: DataTypes.BIGINT },
  name: { type: DataTypes.STRING(100), allowNull: false },
  type: { type: DataTypes.ENUM('PEAK_HOURS', 'WEEKEND', 'HOLIDAY', 'SEASONAL', 'DISCOUNT'), allowNull: false },
  multiplier: { type: DataTypes.DECIMAL(4, 2), defaultValue: 1.00 },
  discount_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  start_date: { type: DataTypes.DATEONLY },
  end_date: { type: DataTypes.DATEONLY },
  start_time: { type: DataTypes.TIME },
  end_time: { type: DataTypes.TIME },
  days_of_week: { type: DataTypes.JSON },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'fare_rules', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = FareRule;
