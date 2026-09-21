const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  role: {
    type: DataTypes.ENUM('CUSTOMER', 'OPERATOR', 'AGENT', 'SUPER_ADMIN', 'DISPATCHER', 'DRIVER', 'CONDUCTOR', 'COUNTER_AGENT'),
    allowNull: true,
  },
  operator_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'user_roles',
  timestamps: false,
});

module.exports = UserRole;