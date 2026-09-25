const express = require('express');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { Op } = require('sequelize');
const {
  Booking,
  BookingPassenger,
  Trip,
  Bus,
  Route,
  Operator,
  User,
  SeatLock,
  Payment,
  WalletTransaction,
  UserWallet,
} = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkBookingAccess } = require('../middleware/tripAccess');
const { bookingValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const { NotificationService } = require('../services/notifications');
const { expireStalePendingBookings } = require('../services/booking-cleanup');
const { getSystemSettings } = require('../services/settings');

const notificationService = new NotificationService();

const router = express.Router();

const DEFAULT_TAX_RATE = 0.13; // 13% VAT
const SERVICE_FEE_PER_PASSENGER = 50; // NPR 50 per passenger

const calculateBookingAmounts = (farePerPassenger, totalPassengers, settings = null) => {
  const subtotal = farePerPassenger * totalPassengers;
  const taxRate = settings && settings.tax_rate != null
    ? Number(settings.tax_rate) / 100
    : DEFAULT_TAX_RATE;
  const tax_amount = Math.round(subtotal * taxRate * 100) / 100;
  const service_fee = SERVICE_FEE_PER_PASSENGER * totalPassengers;
  const total_amount = Math.round((subtotal + tax_amount + service_fee) * 100) / 100;

  return {
    base_amount: farePerPassenger,
    tax_amount,
    service_fee,
    total_amount,
  };
};

const generatePNR = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 10; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
};

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trip_id, seats, passengers]
 *             properties:
 *               trip_id:
 *                 type: integer
 *                 example: 1
 *               seats:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1A", "1B"]
 *               passengers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Passenger'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid request or seats unavailable
 *       401:
 *         description: Unauthorized
 */
// Create booking
router.post('/', authenticateToken, bookingValidation.create, handleValidationErrors, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { trip_id, passengers } = req.body;
    const userId = req.user.id;

    // Get trip details
    const trip = await Trip.findByPk(trip_id, {
      include: [
        {
          model: Route,
          as: 'route',
        },
        {
          model: Bus,
          as: 'bus',
        },
      ],
      transaction,
    });

    if (!trip) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (trip.status !== 'SCHEDULED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Trip is not available for booking',
      });
    }

    // Check seat availability
    if (trip.available_seats < passengers.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Not enough seats available',
      });
    }

    // Check if seats are already booked or locked
    const seatNumbers = passengers.map(p => p.seat_number);
    const existingBookings = await BookingPassenger.findAll({
      include: [
        {
          model: Booking,
          as: 'booking',
          where: {
            trip_id,
            booking_status: ['CONFIRMED', 'COMPLETED'],
          },
        },
      ],
      where: {
        seat_number: seatNumbers,
      },
      transaction,
    });

    if (existingBookings.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Some seats are already booked',
        booked_seats: existingBookings.map(b => b.seat_number),
      });
    }

    // Calculate amounts
    const systemSettings = await getSystemSettings();
    const amounts = calculateBookingAmounts(trip.current_fare, passengers.length, systemSettings);

    // Enforce max passengers per booking from settings
    const maxPassengers = Number(systemSettings.max_passengers) || 10;
    if (passengers.length > maxPassengers) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `A maximum of ${maxPassengers} passengers is allowed per booking`,
      });
    }

    // Create booking
    const booking = await Booking.create({
      pnr: generatePNR(),
      user_id: userId,
      trip_id,
      total_passengers: passengers.length,
      ...amounts,
      payment_status: 'PENDING',
      booking_status: 'PENDING',
      passenger_name: passengers[0]?.passenger_name || passengers[0]?.name || '',
      passenger_phone: passengers[0]?.phone_number || passengers[0]?.phone || '',
    }, { transaction });

    // Create passengers
    const passengerPromises = passengers.map(passenger =>
      BookingPassenger.create({
        booking_id: booking.id,
        passenger_name: passenger.passenger_name,
        passenger_name_nepali: passenger.passenger_name_nepali,
        age: passenger.age,
        gender: passenger.gender,
        seat_number: passenger.seat_number,
        id_type: passenger.id_type,
        id_number: passenger.id_number,
        phone_number: passenger.phone_number,
      }, { transaction })
    );

    await Promise.all(passengerPromises);

    // Update trip available seats
    await trip.update({
      available_seats: trip.available_seats - passengers.length,
    }, { transaction });

    // Release any seat locks for these seats by this user
    await SeatLock.update(
      { status: 'BOOKED' },
      {
        where: {
          trip_id,
          user_id: userId,
          status: 'LOCKED',
        },
        transaction,
      }
    );

    await transaction.commit();

    // Get complete booking details
    const completeBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: BookingPassenger,
          as: 'passengers',
        },
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Route,
              as: 'route',
            },
            {
              model: Bus,
              as: 'bus',
            },
          ],
        },
      ],
    });

    // Send booking confirmation notifications (non-blocking)
    const user = await User.findByPk(userId);
    if (user) {
      notificationService.sendBookingConfirmation(completeBooking, user).catch(err => {
        console.error('Failed to send booking notification:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: completeBooking,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message,
    });
  }
});

// Create booking with cash payment (counter agent)
router.post('/cash-payment', authenticateToken, requireRole(['COUNTER_AGENT', 'OPERATOR', 'SUPER_ADMIN']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { trip_id, passengers, passenger_name, passenger_phone } = req.body;

    if (!trip_id || !passengers || passengers.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Trip ID and passengers required' });
    }

    const trip = await Trip.findByPk(trip_id, {
      include: [
        { model: Route, as: 'route' },
        { model: Bus, as: 'bus' },
      ],
      transaction,
    });

    if (!trip) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.available_seats < passengers.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Not enough seats available' });
    }

    // Calculate fare
    const amounts = calculateBookingAmounts(trip.current_fare, passengers.length, await getSystemSettings());

    // Generate PNR
    const pnr = generatePNR();

    // Create booking
    const booking = await Booking.create({
      user_id: req.user.id,
      trip_id,
      pnr,
      booking_status: 'CONFIRMED',
      payment_status: 'COMPLETED',
      total_passengers: passengers.length,
      ...amounts,
      booking_date: new Date(),
      passenger_name: passengers[0]?.passenger_name || passengers[0]?.name || passenger_name || '',
      passenger_phone: passengers[0]?.phone_number || passengers[0]?.phone || passenger_phone || '',
    }, { transaction });

    // Create passengers
    for (const p of passengers) {
      await BookingPassenger.create({
        booking_id: booking.id,
        passenger_name: p.passenger_name || p.name,
        seat_number: p.seat_number,
        age: p.age,
        gender: p.gender,
        id_type: p.id_type,
        id_number: p.id_number,
        phone_number: p.phone_number || p.phone,
      }, { transaction });
    }

    // Create cash payment record
    await Payment.create({
      booking_id: booking.id,
      amount: amounts.total_amount,
      payment_method: 'CASH',
      status: 'SUCCESS',
      gateway_transaction_id: `CASH-${Date.now()}`,
    }, { transaction });

    // Update available seats
    trip.available_seats -= passengers.length;
    await trip.save({ transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Booking created with cash payment',
      data: { booking, pnr },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cash payment booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
  }
});

// Counter agent daily reconciliation
router.get('/counter/reconciliation', authenticateToken, requireRole(['COUNTER_AGENT', 'OPERATOR', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(targetDate + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDate + 'T23:59:59.999Z');

    const cashPayments = await Payment.findAll({
      where: {
        payment_method: 'CASH',
        status: 'SUCCESS',
        created_at: { [Op.between]: [startOfDay, endOfDay] },
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { user_id: req.user.id },
          include: [
            { model: Trip, as: 'trip', include: [{ model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] }] },
          ],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    const totalCollected = cashPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalBookings = cashPayments.length;

    const cancelledBookings = await Booking.findAll({
      where: {
        user_id: req.user.id,
        booking_status: 'CANCELLED',
      },
      include: [
        {
          model: Payment,
          as: 'payments',
          where: {
            payment_method: 'CASH',
            status: 'SUCCESS',
          },
          required: true,
        },
      ],
    });

    const totalRefunds = cancelledBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

    res.json({
      success: true,
      data: {
        date: targetDate,
        agent_id: req.user.id,
        summary: {
          total_collected: totalCollected,
          total_bookings: totalBookings,
          total_refunds: totalRefunds,
          net_collection: totalCollected - totalRefunds,
        },
        payments: cashPayments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount),
          pnr: p.booking?.pnr,
          route: p.booking?.trip?.route,
          passengers: p.booking?.total_passengers,
          time: p.created_at,
        })),
        cancellations: cancelledBookings.map(b => ({
          id: b.id,
          pnr: b.pnr,
          amount: parseFloat(b.total_amount),
          time: b.booking_date,
        })),
      },
    });
  } catch (error) {
    console.error('Counter reconciliation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reconciliation', error: error.message });
  }
});

// Get counter agent's own bookings
router.get('/counter/my-bookings', authenticateToken, requireRole(['COUNTER_AGENT', 'OPERATOR', 'SUPER_ADMIN']), async (req, res) => {
  try {
    await expireStalePendingBookings();

    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = { user_id: req.user.id };
    let passengerWhere = null;
    if (search) {
      passengerWhere = { passenger_name: { [Op.like]: `%${search}%` } };
      whereClause[Op.or] = [
        { pnr: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
            { model: Bus, as: 'bus', attributes: ['bus_number'] },
          ],
        },
        {
          model: BookingPassenger,
          as: 'passengers',
          required: passengerWhere ? true : false,
          ...(passengerWhere ? { where: passengerWhere } : {}),
        },
      ],
      order: [['booking_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const items = bookings.map(b => {
      const plain = b.toJSON();
      const firstPassenger = plain.passengers?.[0];
      return {
        ...plain,
        passenger_name: firstPassenger?.passenger_name || '',
        passenger_phone: firstPassenger?.phone_number || '',
      };
    });

    const [statsResult] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN booking_status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN booking_status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN booking_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(CASE WHEN booking_status = 'CONFIRMED' THEN total_amount ELSE 0 END), 0) as total_revenue
      FROM bookings WHERE user_id = ?
    `, { replacements: [req.user.id] });

    const stats = {
      total: parseInt(statsResult[0]?.total) || 0,
      confirmed: parseInt(statsResult[0]?.confirmed) || 0,
      pending: parseInt(statsResult[0]?.pending) || 0,
      cancelled: parseInt(statsResult[0]?.cancelled) || 0,
      totalRevenue: parseFloat(statsResult[0]?.total_revenue) || 0,
    };

    res.json({
      success: true,
      data: {
        items,
        stats,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Counter my bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get bookings', error: error.message });
  }
});

// Get user bookings
router.get('/', authenticateToken, commonValidation.pagination, handleValidationErrors, async (req, res) => {
  try {
    await expireStalePendingBookings();

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: BookingPassenger,
          as: 'passengers',
        },
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Route,
              as: 'route',
            },
            {
              model: Bus,
              as: 'bus',
            },
          ],
        },
        {
          model: Payment,
          as: 'payments',
          order: [['created_at', 'DESC']],
          limit: 1,
        },
      ],
      order: [['booking_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: error.message,
    });
  }
});

// Get specific booking
router.get('/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findOne({
      where: { 
        id,
        user_id: userId, // Ensure user can only see their own bookings
      },
      include: [
        {
          model: BookingPassenger,
          as: 'passengers',
        },
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Route,
              as: 'route',
              include: [
                { model: Operator, as: 'operator', attributes: ['id', 'company_name', 'company_name_nepali'] },
              ],
            },
            {
              model: Bus,
              as: 'bus',
            },
          ],
        },
        {
          model: Payment,
          as: 'payments',
          order: [['created_at', 'DESC']],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      message: 'Booking details retrieved successfully',
      data: {
        booking,
      },
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking details',
      error: error.message,
    });
  }
});

// POST /bookings/:id/cancel - Cancel a booking and process refund
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Allow counter agents, operators, and admins to cancel any booking
    const userRoles = req.user.roles || [];
    const canCancelAny = userRoles.some(r => 
      ['SUPER_ADMIN', 'OPERATOR', 'COUNTER_AGENT'].includes(r.role) && r.is_active
    );

    let booking;
    if (canCancelAny) {
      booking = await Booking.findOne({
        where: { id },
        include: [{ model: Trip, as: 'trip', include: [{ model: Route, as: 'route' }] }],
        transaction,
      });
    } else {
      booking = await Booking.findOne({
        where: { id, user_id: userId },
        include: [{ model: Trip, as: 'trip', include: [{ model: Route, as: 'route' }] }],
        transaction,
      });
    }

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.booking_status === 'CANCELLED') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    if (booking.booking_status === 'COMPLETED') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot cancel completed booking' });
    }

    // Calculate refund (80% if cancelled 24+ hours before departure, 50% if <24 hours, 0% if departed)
    // Refunds only apply to bookings that were actually paid
    const isPaid = booking.payment_status === 'COMPLETED';
    const tripDate = new Date(booking.trip.trip_date);
    const departureTime = booking.trip.departure_time ? booking.trip.departure_time.split(':').slice(0, 2).join(':') : '00:00';
    const departureDateTime = new Date(`${tripDate.toISOString().split('T')[0]}T${departureTime}:00`);
    const hoursUntilDeparture = (departureDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    let refundPercentage = 0;
    if (isPaid) {
      if (hoursUntilDeparture >= 24) refundPercentage = 0.80;
      else if (hoursUntilDeparture > 0) refundPercentage = 0.50;
    }
    
    const refundAmount = isPaid ? parseFloat(booking.total_amount) * refundPercentage : 0;

    // Update booking
    await booking.update({
      booking_status: 'CANCELLED',
      cancellation_reason: reason || 'Customer request',
      refund_amount: refundAmount,
      payment_status: isPaid && refundAmount > 0 ? 'REFUNDED' : booking.payment_status,
    }, { transaction });

    // Release seats
    const trip = await Trip.findByPk(booking.trip_id, { transaction });
    if (trip) {
      await trip.update({
        available_seats: trip.available_seats + booking.total_passengers,
      }, { transaction });
    }

    // Refund to wallet if applicable
    if (refundAmount > 0) {
      const wallet = await UserWallet.findOne({ where: { user_id: userId }, transaction });
      if (wallet) {
        await wallet.update({
          balance: parseFloat(wallet.balance) + refundAmount,
          total_earned: parseFloat(wallet.total_earned) + refundAmount,
        }, { transaction });

        await WalletTransaction.create({
          wallet_id: wallet.id,
          transaction_type: 'CREDIT',
          amount: refundAmount,
          description: `Refund for cancelled booking PNR: ${booking.pnr}`,
          reference_id: booking.id,
          reference_type: 'REFUND',
        }, { transaction });
      }
    }

    // Update seat locks
    await SeatLock.update(
      { status: 'RELEASED' },
      { where: { trip_id: booking.trip_id, user_id: userId, status: { [Op.in]: ['LOCKED', 'BOOKED'] } }, transaction }
    );

    await transaction.commit();

    // Send cancellation notification (non-blocking)
    const user = await User.findByPk(userId);
    if (user) {
      notificationService.sendBookingCancellation(booking, user, refundAmount).catch(err => {
        console.error('Failed to send cancellation notification:', err.message);
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking_id: booking.id,
        refund_amount: refundAmount,
        refund_percentage: refundPercentage * 100,
        booking_status: 'CANCELLED',
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking', error: error.message });
  }
});

// Get booking by PNR - scoped to authenticated user (prevents IDOR)
router.get('/pnr/:pnr', authenticateToken, async (req, res) => {
  try {
    const { pnr } = req.params;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);
    const isOperator = userRoles.some(r => r.role === 'OPERATOR' && r.is_active);
    const isCounterAgent = userRoles.some(r => r.role === 'COUNTER_AGENT' && r.is_active);

    const whereClause = { pnr: pnr.toUpperCase() };
    if (!isAdmin && !isOperator && !isCounterAgent) {
      whereClause.user_id = userId;
    }

    const booking = await Booking.findOne({
      where: whereClause,
      include: [
        {
          model: BookingPassenger,
          as: 'passengers',
        },
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Route, as: 'route' },
            { model: Bus, as: 'bus' },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'phone_number', 'email'],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      message: 'Booking found',
      data: {
        booking,
      },
    });
  } catch (error) {
    console.error('Get booking by PNR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking',
      error: error.message,
    });
  }
});

// GET /bookings/operator/my-bookings - Get bookings for operator's trips
router.get('/operator/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const { page, limit, search, booking_status, payment_status } = req.query;

    const whereClause = {};
    if (booking_status) whereClause.booking_status = booking_status.toUpperCase();
    if (payment_status) whereClause.payment_status = payment_status.toUpperCase();
    if (search) {
      const matchingUsers = await User.findAll({
        where: {
          [Op.or]: [
            { full_name: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
          ],
        },
        attributes: ['id'],
        raw: true,
      });
      const matchingUserIds = matchingUsers.map(u => u.id);
      whereClause[Op.or] = [
        { pnr: { [Op.like]: `%${search}%` } },
        { '$trip.route.origin_city$': { [Op.like]: `%${search}%` } },
        { '$trip.route.destination_city$': { [Op.like]: `%${search}%` } },
        ...(matchingUserIds.length > 0 ? [{ user_id: { [Op.in]: matchingUserIds } }] : []),
      ];
    }

    const baseInclude = [
      {
        model: Trip,
        as: 'trip',
        include: [
          { model: Bus, as: 'bus', where: { operator_id: operatorRole.operator_id }, required: true },
          { model: Route, as: 'route', attributes: ['id', 'route_name', 'origin_city', 'destination_city'] },
        ],
      },
      { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number', 'email'] },
    ];
    const include = [...baseInclude, { model: BookingPassenger, as: 'passengers' }];

    if (page !== undefined || limit !== undefined) {
      const p = parseInt(page) || 1;
      const l = parseInt(limit) || 20;
      const { count, rows: bookings } = await Booking.findAndCountAll({
        where: whereClause,
        include,
        order: [['booking_date', 'DESC']],
        limit: l,
        offset: (p - 1) * l,
        distinct: true,
      });

      const summaryWhere = { ...whereClause };
      delete summaryWhere.booking_status;
      delete summaryWhere.payment_status;
      const [totalAll, confirmed, pending, cancelled, revenue] = await Promise.all([
        Booking.count({ where: summaryWhere, include: baseInclude, distinct: true }),
        Booking.count({ where: { ...summaryWhere, booking_status: 'CONFIRMED' }, include: baseInclude, distinct: true }),
        Booking.count({ where: { ...summaryWhere, booking_status: 'PENDING' }, include: baseInclude, distinct: true }),
        Booking.count({ where: { ...summaryWhere, booking_status: 'CANCELLED' }, include: baseInclude, distinct: true }),
        Booking.sum('total_amount', {
          where: { ...summaryWhere, booking_status: { [Op.in]: ['CONFIRMED', 'COMPLETED'] } },
          include: baseInclude,
        }),
      ]);

      return res.json({
        success: true,
        message: 'Operator bookings retrieved successfully',
        data: {
          bookings,
          summary: {
            total: totalAll,
            confirmed,
            pending,
            cancelled,
            revenue: parseFloat(revenue || 0),
          },
          pagination: {
            current_page: p,
            total_pages: Math.ceil(count / l),
            total_items: count,
            items_per_page: l,
          },
        },
      });
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include,
      order: [['booking_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Operator bookings retrieved successfully',
      data: { bookings, total: bookings.length },
    });
  } catch (error) {
    console.error('Get operator bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get operator bookings', error: error.message });
  }
});

// GET /bookings/conductor/my-bookings - Conductor's own trips (or operator fallback: whole operator)
router.get('/conductor/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const conductorRole = userRoles.find(role => role.role === 'CONDUCTOR' && role.is_active);
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);
    const scopedRole = conductorRole || operatorRole;

    if (!scopedRole || !scopedRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Conductor or operator information not found' });
    }

    const tripWhere = {};
    if (conductorRole) {
      const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
      if (!user?.full_name) {
        return res.status(403).json({ success: false, message: 'Conductor name not found' });
      }
      tripWhere.conductor_name = user.full_name;
    }

    if (req.query.trip_id) {
      const tripId = parseInt(req.query.trip_id, 10);
      if (tripId) tripWhere.id = tripId;
    }

    const include = [
      {
        model: Trip,
        as: 'trip',
        where: tripWhere,
        required: true,
        include: [
          { model: Bus, as: 'bus', attributes: ['bus_number', 'bus_type', 'operator_id'], where: { operator_id: scopedRole.operator_id }, required: true },
          { model: Route, as: 'route', attributes: ['route_name', 'origin_city', 'destination_city'] },
        ],
      },
      { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number', 'email'] },
      { model: BookingPassenger, as: 'passengers' },
    ];

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    if (page || limit) {
      const itemsPerPage = limit || 20;
      const currentPage = page || 1;
      const { count, rows } = await Booking.findAndCountAll({
        include,
        distinct: true,
        order: [['booking_date', 'DESC']],
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      return res.json({
        success: true,
        message: 'Conductor bookings retrieved successfully',
        data: {
          bookings: rows,
          total: count,
          current_page: currentPage,
          total_pages: Math.ceil(count / itemsPerPage),
          total_items: count,
          items_per_page: itemsPerPage,
        },
      });
    }

    const bookings = await Booking.findAll({
      include,
      order: [['booking_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Conductor bookings retrieved successfully',
      data: { bookings, total: bookings.length },
    });
  } catch (error) {
    console.error('Get conductor bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conductor bookings', error: error.message });
  }
});

// GET /bookings/counter-agent/my-bookings - Get bookings for counter agent's operator
router.get('/counter-agent/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const counterAgentRole = userRoles.find(role => role.role === 'COUNTER_AGENT' && role.is_active);

    if (!counterAgentRole || !counterAgentRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Counter agent operator information not found' });
    }

    const bookings = await Booking.findAll({
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [{ model: Bus, as: 'bus', where: { operator_id: counterAgentRole.operator_id }, required: true }],
        },
        { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number', 'email'] },
      ],
      order: [['booking_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Counter agent bookings retrieved successfully',
      data: { bookings, total: bookings.length },
    });
  } catch (error) {
    console.error('Get counter agent bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get counter agent bookings', error: error.message });
  }
});

// Verify a ticket by PNR (for conductor/driver verification)
// Search bookings by phone (counter agent)
router.get('/counter/search-by-phone', authenticateToken, requireRole(['COUNTER_AGENT', 'OPERATOR', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const bookings = await Booking.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number'] },
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Route, as: 'route', attributes: ['route_name', 'origin_city', 'destination_city'] },
            { model: Bus, as: 'bus', attributes: ['bus_number', 'bus_type'] },
          ],
        },
        {
          model: BookingPassenger,
          as: 'passengers',
          where: { phone_number: { [Op.like]: `%${phone}%` } },
          required: false,
        },
      ],
      order: [['booking_date', 'DESC']],
      distinct: true,
    });

    const matched = bookings.filter(b =>
      b.user?.phone_number?.includes(phone) ||
      b.passengers?.some(p => p.phone_number?.includes(phone))
    );

    res.json({
      success: true,
      data: {
        bookings: matched,
        count: matched.length,
      },
    });
  } catch (error) {
    console.error('Phone search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search bookings', error: error.message });
  }
});

router.get('/verify-pnr/:pnr', authenticateToken, requireRole(['COUNTER_AGENT', 'CONDUCTOR', 'DRIVER', 'OPERATOR', 'DISPATCHER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { pnr } = req.params;

    const booking = await Booking.findOne({
      where: { pnr },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number'] },
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Route, as: 'route', attributes: ['route_name', 'origin_city', 'destination_city'] },
            { model: Bus, as: 'bus', attributes: ['bus_number', 'bus_type'] },
          ],
        },
        { model: BookingPassenger, as: 'passengers' },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found for this PNR' });
    }

    const access = await checkBookingAccess(req, booking);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    res.json({
      success: true,
      data: {
        booking: booking.toJSON(),
      },
    });
  } catch (error) {
    console.error('Verify PNR error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify ticket', error: error.message });
  }
});

// Mark a booking as boarded
router.post('/:id/board', authenticateToken, requireRole(['CONDUCTOR', 'DRIVER', 'OPERATOR', 'DISPATCHER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const access = await checkBookingAccess(req, booking);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (booking.booking_status === 'COMPLETED') {
      return res.json({
        success: true,
        message: 'Passenger already boarded',
        data: { booking_id: booking.id, status: booking.booking_status },
      });
    }

    if (booking.booking_status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Cannot board a booking with status ${booking.booking_status}`,
      });
    }

    // Update status to COMPLETED (boarded)
    booking.booking_status = 'COMPLETED';
    await booking.save();

    res.json({
      success: true,
      message: 'Passenger marked as boarded',
      data: { booking_id: booking.id, status: booking.booking_status },
    });
  } catch (error) {
    console.error('Board passenger error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as boarded', error: error.message });
  }
});

// Mark a booking as no-show
router.post('/:id/no-show', authenticateToken, requireRole(['CONDUCTOR', 'DRIVER', 'OPERATOR', 'DISPATCHER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const access = await checkBookingAccess(req, booking);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (booking.booking_status === 'NO_SHOW') {
      return res.json({
        success: true,
        message: 'Passenger already marked as no-show',
        data: { booking_id: booking.id, status: booking.booking_status },
      });
    }

    if (booking.booking_status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot mark a boarded passenger as no-show' });
    }

    if (booking.booking_status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot mark cancelled booking as no-show' });
    }

    // Mark as no-show
    booking.booking_status = 'NO_SHOW';
    booking.cancellation_reason = 'No-show';
    await booking.save();

    // Release seats back to the trip
    const trip = await Trip.findByPk(booking.trip_id);
    if (trip) {
      trip.available_seats = (trip.available_seats || 0) + (booking.total_passengers || 1);
      await trip.save();
    }

    res.json({
      success: true,
      message: 'Passenger marked as no-show',
      data: { booking_id: booking.id, status: booking.booking_status },
    });
  } catch (error) {
    console.error('No-show error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as no-show', error: error.message });
  }
});

module.exports = router;