const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Operator = sequelize.define('Operator', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  company_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  company_name_nepali: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  license_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true,
  },
  pan_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  vat_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  logo_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 10.00,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'operators',
  timestamps: false,
});

module.exports = Operator;