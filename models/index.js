// models/index.js - Central model registry and relationships
const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Operator = require('./Operator');
const City = require('./City');
const Bus = require('./Bus');
const Route = require('./Route');
const Trip = require('./Trip');
const Booking = require('./Booking');
const BookingPassenger = require('./BookingPassenger');
const Payment = require('./Payment');
const BusLocation = require('./BusLocation');
const SeatLock = require('./SeatLock');
const UserAddress = require('./UserAddress');
const UserRole = require('./UserRole');
const UserWallet = require('./UserWallet');
const WalletTransaction = require('./WalletTransaction');
const Review = require('./Review');
const FareRule = require('./FareRule');
const PromoCode = require('./PromoCode');
const Dispute = require('./Dispute');
const SystemSetting = require('./SystemSetting');
const AuditLog = require('./AuditLog');
const Announcement = require('./Announcement');

// Define associations based on SQL foreign key relationships

// User associations
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
User.hasMany(SeatLock, { foreignKey: 'user_id', as: 'seatLocks' });
User.hasMany(UserAddress, { foreignKey: 'user_id', as: 'addresses' });
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'roles' });
User.hasOne(UserWallet, { foreignKey: 'user_id', as: 'wallet' });

// Operator associations
Operator.hasMany(Bus, { foreignKey: 'operator_id', as: 'buses' });
Operator.hasMany(Route, { foreignKey: 'operator_id', as: 'routes' });

// Bus associations
Bus.belongsTo(Operator, { foreignKey: 'operator_id', as: 'operator' });
Bus.hasMany(Trip, { foreignKey: 'bus_id', as: 'trips' });

// Route associations
Route.belongsTo(Operator, { foreignKey: 'operator_id', as: 'operator' });
Route.hasMany(Trip, { foreignKey: 'route_id', as: 'trips' });

// Trip associations
Trip.belongsTo(Route, { foreignKey: 'route_id', as: 'route' });
Trip.belongsTo(Bus, { foreignKey: 'bus_id', as: 'bus' });
Trip.hasMany(Booking, { foreignKey: 'trip_id', as: 'bookings' });
Trip.hasMany(BusLocation, { foreignKey: 'trip_id', as: 'locations' });
Trip.hasMany(SeatLock, { foreignKey: 'trip_id', as: 'seatLocks' });

// Booking associations
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Booking.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Booking.hasMany(BookingPassenger, { foreignKey: 'booking_id', as: 'passengers' });
Booking.hasMany(Payment, { foreignKey: 'booking_id', as: 'payments' });

// BookingPassenger associations
BookingPassenger.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Payment associations
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// BusLocation associations
BusLocation.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });

// SeatLock associations
SeatLock.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
SeatLock.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// UserAddress associations
UserAddress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// UserRole associations
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// UserWallet associations
UserWallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserWallet.hasMany(WalletTransaction, { foreignKey: 'wallet_id', as: 'transactions' });

// WalletTransaction associations
WalletTransaction.belongsTo(UserWallet, { foreignKey: 'wallet_id', as: 'wallet' });

// Review associations
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Trip.hasMany(Review, { foreignKey: 'trip_id', as: 'reviews' });
Operator.hasMany(Review, { foreignKey: 'operator_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Review.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Review.belongsTo(Operator, { foreignKey: 'operator_id', as: 'operator' });

// FareRule associations
Operator.hasMany(FareRule, { foreignKey: 'operator_id', as: 'fareRules' });
Route.hasMany(FareRule, { foreignKey: 'route_id', as: 'fareRules' });
FareRule.belongsTo(Operator, { foreignKey: 'operator_id', as: 'operator' });
FareRule.belongsTo(Route, { foreignKey: 'route_id', as: 'route' });

// Dispute associations
Dispute.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Dispute.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Export all models
module.exports = {
  sequelize,
  User,
  Operator,
  City,
  Bus,
  Route,
  Trip,
  Booking,
  BookingPassenger,
  Payment,
  BusLocation,
  SeatLock,
  UserAddress,
  UserRole,
  UserWallet,
  WalletTransaction,
  Review,
  FareRule,
  PromoCode,
  Dispute,
  SystemSetting,
  AuditLog,
  Announcement,
};