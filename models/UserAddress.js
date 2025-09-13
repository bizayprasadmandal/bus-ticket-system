const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserAddress = sequelize.define('UserAddress', {
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
  address_type: {
    type: DataTypes.ENUM('HOME', 'OFFICE', 'EMERGENCY'),
    allowNull: true,
  },
  province: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  municipality: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  ward_no: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  street_address: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'user_addresses',
  timestamps: false,
});

module.exports = UserAddress;