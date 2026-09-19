const express = require('express');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const {
  Booking,
  BookingPassenger,
  Trip,
  Bus,
  Route,
  User,
  SeatLock,
  Payment,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { bookingValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const { NotificationService } = require('../services/notifications');

const notificationService = new NotificationService();

const router = express.Router();

const TAX_RATE = 0.13; // 13% VAT
const SERVICE_FEE_PER_PASSENGER = 50; // NPR 50 per passenger

const calculateBookingAmounts = (farePerPassenger, totalPassengers) => {
  const subtotal = farePerPassenger * totalPassengers;
  const tax_amount = Math.round(subtotal * TAX_RATE * 100) / 100;
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
    const amounts = calculateBookingAmounts(trip.current_fare, passengers.length);

    // Create booking
    const booking = await Booking.create({
      pnr: generatePNR(),
      user_id: userId,
      trip_id,
      total_passengers: passengers.length,
      ...amounts,
      payment_status: 'PENDING',
      booking_status: 'PENDING',
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

// Get user bookings
router.get('/', authenticateToken, commonValidation.pagination, handleValidationErrors, async (req, res) => {
  try {
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

// Cancel booking
router.post('/:id/cancel', authenticateToken, bookingValidation.cancel, handleValidationErrors, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findOne({
      where: { 
        id,
        user_id: userId,
      },
      include: [
        {
          model: Trip,
          as: 'trip',
        },
      ],
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.booking_status === 'CANCELLED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
    }

    // Check if cancellation is allowed (e.g., not too close to departure)
    const tripDateTime = moment(`${booking.trip.trip_date} ${booking.trip.departure_time}`);
    const now = moment();
    const hoursUntilDeparture = tripDateTime.diff(now, 'hours');

    if (hoursUntilDeparture < 2) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking less than 2 hours before departure',
      });
    }

    // Calculate refund amount (could be based on cancellation policy)
    const refundPercentage = hoursUntilDeparture >= 24 ? 0.9 : 0.75; // 90% if >24h, 75% if 2-24h
    const refundAmount = booking.total_amount * refundPercentage;

    // Update booking
    await booking.update({
      booking_status: 'CANCELLED',
      cancellation_reason,
      refund_amount: refundAmount,
    }, { transaction });

    // Update trip available seats
    await booking.trip.update({
      available_seats: booking.trip.available_seats + booking.total_passengers,
    }, { transaction });

    await transaction.commit();

    // Send cancellation notification (non-blocking)
    const cancelUser = await User.findByPk(userId);
    if (cancelUser) {
      notificationService.sendBookingCancellation(booking, cancelUser, refundAmount).catch(err => {
        console.error('Failed to send cancellation notification:', err.message);
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        refund_amount: refundAmount,
        booking_status: 'CANCELLED',
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message,
    });
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

    const whereClause = { pnr: pnr.toUpperCase() };
    if (!isAdmin && !isOperator) {
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

    const bookings = await Booking.findAll({
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [{ model: Bus, as: 'bus', where: { operator_id: operatorRole.operator_id }, required: true }],
        },
        { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number', 'email'] },
      ],
      order: [['created_at', 'DESC']],
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

module.exports = router;