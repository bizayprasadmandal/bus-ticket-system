const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  firebase_uid: {
    type: DataTypes.STRING(128),
    unique: true,
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  full_name_nepali: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
    allowNull: true,
  },
  profile_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_phone_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'DELETED'),
    defaultValue: 'ACTIVE',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'users',
  timestamps: false,
});

module.exports = User;