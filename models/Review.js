const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false },
  trip_id: { type: DataTypes.BIGINT, allowNull: false },
  operator_id: { type: DataTypes.BIGINT },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  title: { type: DataTypes.STRING(200) },
  comment: { type: DataTypes.TEXT },
  is_anonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'reviews', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Review;
