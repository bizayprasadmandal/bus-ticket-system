const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingPassenger = sequelize.define('BookingPassenger', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  booking_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id',
    },
  },
  passenger_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  passenger_name_nepali: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
    allowNull: true,
  },
  seat_number: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  id_type: {
    type: DataTypes.ENUM('CITIZENSHIP', 'PASSPORT', 'DRIVING_LICENSE'),
    allowNull: true,
  },
  id_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'booking_passengers',
  timestamps: false,
});

module.exports = BookingPassenger;