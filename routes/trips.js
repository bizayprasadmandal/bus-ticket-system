const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const { Trip, Route, Bus, Operator, Booking, BookingPassenger, BusLocation, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkTripAccess } = require('../middleware/tripAccess');
const { tripValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const cachingService = require('../services/caching');
const { expireStalePendingBookings } = require('../services/booking-cleanup');

const router = express.Router();

function safeParseJSON(val) {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'string') return val;
  try {
    const parsed = JSON.parse(val);
    return safeParseJSON(parsed);
  } catch {
    return val;
  }
}

function normalizeBus(bus) {
  if (!bus) return bus;
  const data = bus.toJSON ? bus.toJSON() : bus;
  data.seat_layout = safeParseJSON(data.seat_layout);
  data.amenities = safeParseJSON(data.amenities);
  data.images = safeParseJSON(data.images);
  return data;
}

/**
 * @swagger
 * /api/trips/search:
 *   get:
 *     summary: Search trips by origin, destination, and date
 *     tags: [Trips]
 *     parameters:
 *       - in: query
 *         name: origin_city
 *         required: true
 *         schema:
 *           type: string
 *         description: Origin city name
 *         example: Kathmandu
 *       - in: query
 *         name: destination_city
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination city name
 *         example: Pokhara
 *       - in: query
 *         name: trip_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Trip date (YYYY-MM-DD)
 *         example: "2026-09-17"
 *       - in: query
 *         name: passengers
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Number of passengers
 *     responses:
 *       200:
 *         description: Trips found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     trips:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Trip'
 *                     total:
 *                       type: integer
 */
// Search trips
router.get('/search', tripValidation.search, handleValidationErrors, async (req, res) => {
  try {
    await expireStalePendingBookings();

    const { origin_city, destination_city, trip_date, passengers = 1 } = req.query;

    const trips = await Trip.findAll({
      where: {
        trip_date,
        available_seats: {
          [Op.gte]: passengers,
        },
        status: ['SCHEDULED', 'BOARDING'],
      },
      include: [
        {
          model: Route,
          as: 'route',
          where: {
            origin_city,
            destination_city,
            is_active: true,
          },
          include: [
            {
              model: Operator,
              as: 'operator',
              where: { status: 'APPROVED' },
            },
          ],
        },
        {
          model: Bus,
          as: 'bus',
          where: { status: 'ACTIVE' },
        },
      ],
      order: [['departure_time', 'ASC']],
    });

    const normalizedTrips = trips.map(trip => ({
      id: trip.id,
      trip_date: trip.trip_date,
      departure_time: trip.departure_time,
      arrival_time: trip.arrival_time,
      current_fare: trip.current_fare,
      available_seats: trip.available_seats,
      status: trip.status,
      route: {
        id: trip.route.id,
        route_name: trip.route.route_name,
        origin_city: trip.route.origin_city,
        destination_city: trip.route.destination_city,
        distance_km: trip.route.distance_km,
        estimated_duration_minutes: trip.route.estimated_duration_minutes,
        stops: trip.route.stops,
      },
      bus: {
        id: trip.bus.id,
        bus_number: trip.bus.bus_number,
        bus_model: trip.bus.bus_model,
        bus_type: trip.bus.bus_type,
        total_seats: trip.bus.total_seats,
        ...normalizeBus(trip.bus),
      },
      operator: {
        id: trip.route.operator.id,
        company_name: trip.route.operator.company_name,
        company_name_nepali: trip.route.operator.company_name_nepali,
        logo_url: trip.route.operator.logo_url,
      },
    }));

    res.json({
      success: true,
      message: 'Trips found successfully',
      data: {
        trips: normalizedTrips,
        total: trips.length,
      },
    });
  } catch (error) {
    console.error('Trip search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search trips',
      error: error.message,
    });
  }
});

// Get trip details
router.get('/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findByPk(id, {
      include: [
        {
          model: Route,
          as: 'route',
          include: [
            {
              model: Operator,
              as: 'operator',
            },
          ],
        },
        {
          model: Bus,
          as: 'bus',
        },
        {
          model: Booking,
          as: 'bookings',
          where: { booking_status: ['CONFIRMED', 'COMPLETED'] },
          required: false,
        },
      ],
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    // Staff must own the trip (operator/dispatcher/counter by operator,
    // driver/conductor by assignment); customers may view any trip but
    // never see crew phone numbers.
    const viewerRoles = req.user.roles || [];
    const isStaff = viewerRoles.some(r =>
      ['SUPER_ADMIN', 'OPERATOR', 'DISPATCHER', 'CONDUCTOR', 'DRIVER', 'COUNTER_AGENT'].includes(r.role) && r.is_active
    );

    if (isStaff) {
      const access = await checkTripAccess(req, trip);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }
    }

    // Get booked seats
    const bookedSeats = [];
    if (trip.bookings) {
      for (const booking of trip.bookings) {
        const passengers = await booking.getPassengers();
        passengers.forEach(passenger => {
          if (passenger.seat_number) {
            bookedSeats.push(passenger.seat_number);
          }
        });
      }
    }

    const tripPayload = {
      id: trip.id,
      trip_date: trip.trip_date,
      departure_time: trip.departure_time,
      arrival_time: trip.arrival_time,
      current_fare: trip.current_fare,
      available_seats: trip.available_seats,
      status: trip.status,
      driver_name: trip.driver_name,
      driver_phone: trip.driver_phone,
      conductor_name: trip.conductor_name,
      conductor_phone: trip.conductor_phone,
      route: trip.route,
      bus: normalizeBus(trip.bus),
      operator: trip.route.operator,
      booked_seats: bookedSeats,
    };

    if (!isStaff) {
      delete tripPayload.driver_phone;
      delete tripPayload.conductor_phone;
    }

    res.json({
      success: true,
      message: 'Trip details retrieved successfully',
      data: {
        trip: tripPayload,
      },
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trip details',
      error: error.message,
    });
  }
});

// Get trip seat layout
router.get('/:id/seats', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    await expireStalePendingBookings();

    const { id } = req.params;

    const trip = await Trip.findByPk(id, {
      include: [
        {
          model: Bus,
          as: 'bus',
          attributes: ['seat_layout', 'total_seats'],
        },
        {
          model: Booking,
          as: 'bookings',
          where: { 
            booking_status: ['CONFIRMED', 'COMPLETED'],
          },
          required: false,
          include: [
            {
              model: BookingPassenger,
              as: 'passengers',
              attributes: ['seat_number'],
            },
          ],
        },
      ],
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    // Get all booked seat numbers
    const bookedSeats = [];
    trip.bookings?.forEach(booking => {
      booking.passengers?.forEach(passenger => {
        if (passenger.seat_number) {
          bookedSeats.push(passenger.seat_number);
        }
      });
    });

    res.json({
      success: true,
      message: 'Seat layout retrieved successfully',
      data: {
        seat_layout: normalizeBus(trip.bus).seat_layout,
        total_seats: trip.bus.total_seats,
        available_seats: trip.available_seats,
        booked_seats: bookedSeats,
      },
    });
  } catch (error) {
    console.error('Get seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get seat layout',
      error: error.message,
    });
  }
});

// Get trip location (real-time tracking) - requires booking on this trip or operator/admin role
router.get('/:id/location', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);
    const isOperator = userRoles.some(r => r.role === 'OPERATOR' && r.is_active);

    const trip = await Trip.findByPk(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    // Customers must have a booking on this trip
    if (!isAdmin && !isOperator) {
      const hasBooking = await Booking.findOne({
        where: { trip_id: id, user_id: userId, booking_status: ['CONFIRMED', 'COMPLETED'] },
      });
      if (!hasBooking) {
        return res.status(403).json({
          success: false,
          message: 'You do not have a booking on this trip',
        });
      }
    }

    // Get latest location
    const location = await BusLocation.findOne({
      where: { trip_id: id },
      order: [['timestamp', 'DESC']],
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location data not available',
      });
    }

    res.json({
      success: true,
      message: 'Trip location retrieved successfully',
      data: {
        location: {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          speed: parseFloat(location.speed || 0),
          heading: location.heading,
          timestamp: location.timestamp,
        },
        trip_status: trip.status,
      },
    });
  } catch (error) {
    console.error('Get trip location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trip location',
      error: error.message,
    });
  }
});

// Update trip status (Operator/Admin only)
const VALID_STATUS_TRANSITIONS = {
  SCHEDULED: ['BOARDING', 'CANCELLED'],
  BOARDING: ['DEPARTED', 'CANCELLED'],
  DEPARTED: ['ARRIVED'],
  ARRIVED: [],
  CANCELLED: [],
};

router.put('/:id/status', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const trip = await Trip.findByPk(id, {
      include: [
        { model: Route, as: 'route' },
        { model: Bus, as: 'bus' },
      ],
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    // Verify operator owns this trip or is admin, dispatcher, or driver
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    const dispatcherRole = userRoles.find(r => r.role === 'DISPATCHER' && r.is_active);
    const driverRole = userRoles.find(r => r.role === 'DRIVER' && r.is_active);

    const conductorRole = userRoles.find(r => r.role === 'CONDUCTOR' && r.is_active);

    if (!isAdmin && !operatorRole && !dispatcherRole && !driverRole && !conductorRole) {
      return res.status(403).json({
        success: false,
        message: 'Only operators, dispatchers, drivers, conductors, or admins can update trip status',
      });
    }

    // If operator, dispatcher, driver, or conductor, verify they own/are assigned to this trip
    if (!isAdmin && (operatorRole || dispatcherRole || driverRole || conductorRole)) {
      const tripWithBus = await Trip.findByPk(id, {
        include: [
          { model: Bus, as: 'bus', attributes: ['operator_id'] },
          { model: Route, as: 'route', attributes: ['operator_id'] },
        ],
      });

      if (driverRole) {
        const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
        const driverName = user?.full_name;
        if (!tripWithBus || tripWithBus.driver_name !== driverName) {
          return res.status(403).json({
            success: false,
            message: 'You can only update status of trips assigned to you',
          });
        }
      } else if (conductorRole) {
        const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
        const conductorName = user?.full_name;
        if (!tripWithBus || tripWithBus.conductor_name !== conductorName) {
          return res.status(403).json({
            success: false,
            message: 'You can only update status of trips assigned to you',
          });
        }
      } else {
        const ownerId = operatorRole ? operatorRole.operator_id : dispatcherRole.operator_id;
        const tripOwners = [tripWithBus?.bus?.operator_id, tripWithBus?.route?.operator_id];
        if (!tripWithBus || !tripOwners.includes(ownerId)) {
          return res.status(403).json({
            success: false,
            message: 'You can only update status of your own trips',
          });
        }
      }
    }

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[trip.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${trip.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      });
    }

    const previousStatus = trip.status;
    await trip.update({ status });

    res.json({
      success: true,
      message: `Trip status updated to ${status}`,
      data: {
        trip_id: trip.id,
        previous_status: previousStatus,
        new_status: status,
      },
    });
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trip status',
      error: error.message,
    });
  }
});

// Assign crew (driver/conductor) to a trip
router.put('/:id/assign-crew', authenticateToken, requireRole(['OPERATOR', 'SUPER_ADMIN', 'DISPATCHER']), async (req, res) => {
  try {
    const { id } = req.params;
    const driver_name = typeof req.body.driver_name === 'string' ? req.body.driver_name.trim() : undefined;
    const driver_phone = typeof req.body.driver_phone === 'string' ? req.body.driver_phone.trim() : undefined;
    const conductor_name = typeof req.body.conductor_name === 'string' ? req.body.conductor_name.trim() : undefined;
    const conductor_phone = typeof req.body.conductor_phone === 'string' ? req.body.conductor_phone.trim() : undefined;

    const trip = await Trip.findByPk(id, {
      include: [
        { model: Bus, as: 'bus', attributes: ['operator_id'] },
        { model: Route, as: 'route', attributes: ['operator_id'] },
      ],
    });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const access = await checkTripAccess(req, trip);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (trip.status === 'ARRIVED' || trip.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: trip.status === 'CANCELLED'
          ? 'Cannot assign crew to a cancelled trip'
          : 'Cannot assign crew to a trip that has already arrived',
      });
    }

    // Update crew fields (empty/whitespace values are ignored so they cannot wipe existing crew)
    const updates = {};
    if (driver_name) updates.driver_name = driver_name;
    if (driver_phone) updates.driver_phone = driver_phone;
    if (conductor_name) updates.conductor_name = conductor_name;
    if (conductor_phone) updates.conductor_phone = conductor_phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No crew details provided' });
    }

    await trip.update(updates);

    res.json({
      success: true,
      message: 'Crew assigned successfully',
      data: { trip },
    });
  } catch (error) {
    console.error('Assign crew error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign crew', error: error.message });
  }
});

// Get passenger manifest for a trip
router.get('/:id/passengers', authenticateToken, requireRole(['OPERATOR', 'SUPER_ADMIN', 'DISPATCHER', 'CONDUCTOR', 'DRIVER']), async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findByPk(id, {
      include: [
        { model: Route, as: 'route', attributes: ['route_name', 'origin_city', 'destination_city', 'operator_id'] },
        { model: Bus, as: 'bus', attributes: ['bus_number', 'bus_type', 'operator_id'] },
      ],
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const access = await checkTripAccess(req, trip);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    // Get all bookings for this trip (include COMPLETED — set when passengers board — and NO_SHOW)
    const bookings = await Booking.findAll({
      where: { trip_id: id, booking_status: { [Op.in]: ['CONFIRMED', 'PENDING', 'COMPLETED', 'NO_SHOW'] } },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number'] },
        { model: BookingPassenger, as: 'passengers' },
      ],
      order: [['booking_date', 'ASC']],
    });

    // Flatten passengers
    const passengers = [];
    for (const booking of bookings) {
      for (const p of (booking.passengers || [])) {
        const phone = p.phone_number || booking.user?.phone_number || '';
        passengers.push({
          booking_id: booking.id,
          pnr: booking.pnr,
          passenger_name: p.passenger_name || p.name,
          seat_number: p.seat_number,
          phone,
          phone_number: phone,
          booking_status: booking.booking_status,
          payment_status: booking.payment_status,
        });
      }
    }

    res.json({
      success: true,
      message: 'Passengers retrieved successfully',
      data: {
        trip: {
          id: trip.id,
          route: trip.route,
          bus: trip.bus,
          trip_date: trip.trip_date,
          departure_time: trip.departure_time,
          status: trip.status,
        },
        passengers,
        total_passengers: passengers.length,
        total_bookings: bookings.length,
      },
    });
  } catch (error) {
    console.error('Get passengers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get passengers', error: error.message });
  }
});

// GET /trips/operator/my-trips - Get trips for logged-in operator
router.get('/operator/my-trips', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const { page, limit, status, search } = req.query;
    const dateFrom = req.query.date_from || req.query.start_date;
    const dateTo = req.query.date_to || req.query.end_date;

    const whereClause = {};
    if (status) whereClause.status = status.toUpperCase();
    if (dateFrom || dateTo) {
      whereClause.trip_date = {};
      if (dateFrom) whereClause.trip_date[Op.gte] = dateFrom;
      if (dateTo) whereClause.trip_date[Op.lte] = dateTo;
    }
    if (search) {
      whereClause[Op.or] = [
        { departure_time: { [Op.like]: `%${search}%` } },
        { trip_date: { [Op.like]: `%${search}%` } },
        { '$route.origin_city$': { [Op.like]: `%${search}%` } },
        { '$route.destination_city$': { [Op.like]: `%${search}%` } },
        { '$bus.bus_number$': { [Op.like]: `%${search}%` } },
      ];
    }

    const include = [
      { model: Bus, as: 'bus', where: { operator_id: operatorRole.operator_id }, required: true },
      { model: Route, as: 'route', attributes: ['id', 'route_name', 'origin_city', 'destination_city'] },
    ];

    if (page !== undefined || limit !== undefined) {
      const p = parseInt(page) || 1;
      const l = parseInt(limit) || 20;
      const { count, rows: trips } = await Trip.findAndCountAll({
        where: whereClause,
        include,
        order: [['trip_date', 'DESC']],
        limit: l,
        offset: (p - 1) * l,
        distinct: true,
      });

      const [totalAll, scheduled, boarding, arrived, cancelled] = await Promise.all([
        Trip.count({ include }),
        Trip.count({ where: { status: 'SCHEDULED' }, include }),
        Trip.count({ where: { status: 'BOARDING' }, include }),
        Trip.count({ where: { status: 'ARRIVED' }, include }),
        Trip.count({ where: { status: 'CANCELLED' }, include }),
      ]);

      return res.json({
        success: true,
        message: 'Operator trips retrieved successfully',
        data: {
          trips,
          summary: { total: totalAll, scheduled, boarding, arrived, cancelled },
          pagination: {
            current_page: p,
            total_pages: Math.ceil(count / l),
            total_items: count,
            items_per_page: l,
          },
        },
      });
    }

    const trips = await Trip.findAll({
      where: whereClause,
      include,
      order: [['trip_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Operator trips retrieved successfully',
      data: { trips, total: trips.length },
    });
  } catch (error) {
    console.error('Get operator trips error:', error);
    res.status(500).json({ success: false, message: 'Failed to get operator trips', error: error.message });
  }
});

// GET /trips/dispatcher/my-trips - Get trips for logged-in dispatcher
router.get('/dispatcher/my-trips', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const scopedRole =
      userRoles.find(r => r.role === 'DISPATCHER' && r.is_active && r.operator_id) ||
      userRoles.find(r => r.role === 'OPERATOR' && r.is_active && r.operator_id);

    if (!scopedRole) {
      return res.status(403).json({ success: false, message: 'Dispatcher operator information not found' });
    }

    const whereClause = {};
    if (req.query.trip_date) whereClause.trip_date = req.query.trip_date;
    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();
      const validStatuses = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED'];
      if (validStatuses.includes(status)) whereClause.status = status;
    }

    const trips = await Trip.findAll({
      where: whereClause,
      include: [
        { model: Bus, as: 'bus', where: { operator_id: scopedRole.operator_id }, required: true },
        { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
      ],
      order: [['trip_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Dispatcher trips retrieved successfully',
      data: { trips, total: trips.length },
    });
  } catch (error) {
    console.error('Get dispatcher trips error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dispatcher trips', error: error.message });
  }
});

// GET /trips/driver/my-trips - Get trips for logged-in driver (operators see their fleet)
router.get('/driver/my-trips', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const driverRole = userRoles.find(role => role.role === 'DRIVER' && role.is_active);
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);
    const scopedRole = driverRole || operatorRole;

    if (!scopedRole || !scopedRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Driver or operator information not found' });
    }

    const whereClause = {};
    if (driverRole) {
      // With an active driver role, scope to this driver's assigned trips
      const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
      if (!user?.full_name) {
        return res.status(403).json({ success: false, message: 'Driver name not found' });
      }
      whereClause.driver_name = user.full_name;
    }

    const trips = await Trip.findAll({
      where: whereClause,
      include: [
        { model: Bus, as: 'bus', where: { operator_id: scopedRole.operator_id }, required: true },
        { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
      ],
      order: [['trip_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Driver trips retrieved successfully',
      data: { trips, total: trips.length },
    });
  } catch (error) {
    console.error('Get driver trips error:', error);
    res.status(500).json({ success: false, message: 'Failed to get driver trips', error: error.message });
  }
});

// GET /trips/conductor/my-trips - Get trips for logged-in conductor
router.get('/conductor/my-trips', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const conductorRole = userRoles.find(role => role.role === 'CONDUCTOR' && role.is_active);

    if (!conductorRole || !conductorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Conductor operator information not found' });
    }

    const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
    const conductorName = user?.full_name;

    const whereClause = {};
    if (conductorName) {
      whereClause.conductor_name = conductorName;
    }

    const trips = await Trip.findAll({
      where: whereClause,
      include: [
        { model: Bus, as: 'bus', where: { operator_id: conductorRole.operator_id }, required: true },
        { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
      ],
      order: [['trip_date', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Conductor trips retrieved successfully',
      data: { trips, total: trips.length },
    });
  } catch (error) {
    console.error('Get conductor trips error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conductor trips', error: error.message });
  }
});

// POST /trips - Create a new trip (Operator only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const { bus_id, route_id, trip_date, departure_time, current_fare, available_seats } = req.body;

    if (!bus_id || !route_id || !trip_date || !departure_time || !current_fare) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify bus belongs to operator
    const bus = await Bus.findOne({ where: { id: bus_id, operator_id: operatorRole.operator_id } });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found or not authorized' });
    }

    const trip = await Trip.create({
      bus_id, route_id, trip_date, departure_time, current_fare,
      available_seats: available_seats || bus.total_seats,
      status: 'SCHEDULED',
    });

    res.status(201).json({ success: true, message: 'Trip created successfully', data: { trip } });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ success: false, message: 'Failed to create trip', error: error.message });
  }
});

// PUT /trips/:id - Update trip (Operator only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [{ model: Bus, as: 'bus' }] });
    if (!trip || trip.bus.operator_id !== operatorRole.operator_id) {
      return res.status(404).json({ success: false, message: 'Trip not found or not authorized' });
    }

    const { trip_date, departure_time, current_fare, available_seats } = req.body;
    await trip.update({ trip_date, departure_time, current_fare, available_seats });

    res.json({ success: true, message: 'Trip updated successfully', data: { trip } });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ success: false, message: 'Failed to update trip', error: error.message });
  }
});

// DELETE /trips/:id - Delete trip (Operator only, if not started)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [{ model: Bus, as: 'bus' }] });
    if (!trip || trip.bus.operator_id !== operatorRole.operator_id) {
      return res.status(404).json({ success: false, message: 'Trip not found or not authorized' });
    }

    if (!['SCHEDULED'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Can only delete trips with SCHEDULED status' });
    }

    await trip.update({ status: 'CANCELLED' });

    res.json({ success: true, message: 'Trip cancelled successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete trip', error: error.message });
  }
});

// Get driver's weekly schedule
router.get('/driver/schedule', authenticateToken, requireRole(['DRIVER', 'OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const driverRole = userRoles.find(r => r.role === 'DRIVER' && r.is_active && r.operator_id);
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active && r.operator_id);
    const scopedRole = driverRole || operatorRole;

    if (!scopedRole) {
      return res.status(403).json({ success: false, message: 'Driver or operator information not found' });
    }

    const where = {};

    if (driverRole) {
      const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
      if (!user?.full_name) {
        return res.status(400).json({ success: false, message: 'Driver name not found' });
      }
      where.driver_name = user.full_name;
    }

    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const { start_date, end_date } = req.query;
    const today = new Date();
    const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const weekStart = start_date || fmt(sunday);
    const weekEnd = end_date || fmt(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6));

    where.trip_date = { [Op.between]: [weekStart, weekEnd] };

    const trips = await Trip.findAll({
      where,
      include: [
        { model: Route, as: 'route', attributes: ['id', 'route_name', 'origin_city', 'destination_city'] },
        {
          model: Bus,
          as: 'bus',
          attributes: ['id', 'bus_number', 'bus_type', 'operator_id'],
          where: { operator_id: scopedRole.operator_id },
          required: true,
        },
      ],
      order: [['trip_date', 'ASC'], ['departure_time', 'ASC']],
    });

    res.json({
      success: true,
      data: { trips, start_date: weekStart, end_date: weekEnd },
    });
  } catch (error) {
    console.error('Driver schedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to get schedule', error: error.message });
  }
});

// Get conductor's weekly schedule
router.get('/conductor/schedule', authenticateToken, requireRole(['CONDUCTOR', 'OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const conductorRole = userRoles.find(r => r.role === 'CONDUCTOR' && r.is_active && r.operator_id);
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active && r.operator_id);
    const scopedRole = conductorRole || operatorRole;

    if (!scopedRole) {
      return res.status(403).json({ success: false, message: 'Conductor or operator information not found' });
    }

    const where = {};

    if (conductorRole) {
      const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
      if (!user?.full_name) {
        return res.status(400).json({ success: false, message: 'Conductor name not found' });
      }
      where.conductor_name = user.full_name;
    }

    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const { start_date, end_date } = req.query;
    const today = new Date();
    const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const weekStart = start_date || fmt(sunday);
    const weekEnd = end_date || fmt(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6));

    where.trip_date = { [Op.between]: [weekStart, weekEnd] };

    const trips = await Trip.findAll({
      where,
      include: [
        { model: Route, as: 'route', attributes: ['id', 'route_name', 'origin_city', 'destination_city'] },
        {
          model: Bus,
          as: 'bus',
          attributes: ['id', 'bus_number', 'bus_type', 'operator_id'],
          where: { operator_id: scopedRole.operator_id },
          required: true,
        },
      ],
      order: [['trip_date', 'ASC'], ['departure_time', 'ASC']],
    });

    res.json({
      success: true,
      data: { trips, start_date: weekStart, end_date: weekEnd },
    });
  } catch (error) {
    console.error('Conductor schedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to get schedule', error: error.message });
  }
});

// Report GPS location (driver or conductor on the trip)
router.post('/:id/location', authenticateToken, requireRole(['DRIVER', 'CONDUCTOR', 'OPERATOR', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, message: 'Latitude/longitude must be valid coordinates' });
    }

    const trip = await Trip.findByPk(id, {
      include: [
        { model: Route, as: 'route', attributes: ['id', 'operator_id'] },
        { model: Bus, as: 'bus', attributes: ['id', 'operator_id'] },
      ],
    });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const access = await checkTripAccess(req, trip);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const now = new Date();
    const parsedSpeed = Number.isFinite(Number(speed)) ? Number(speed) : 0;
    const parsedHeading = Number.isFinite(Number(heading)) ? Number(heading) : 0;

    // Upsert location
    const [location, created] = await BusLocation.findOrCreate({
      where: { trip_id: id },
      defaults: {
        bus_id: trip.bus_id,
        latitude: lat,
        longitude: lng,
        speed: parsedSpeed,
        heading: parsedHeading,
        timestamp: now,
      },
    });

    if (!created) {
      location.latitude = lat;
      location.longitude = lng;
      location.speed = parsedSpeed || location.speed;
      location.heading = parsedHeading || location.heading;
      location.timestamp = now;
      await location.save();
    }

    // Push to trip subscribers (customer tracking page listens on this event)
    const websocketService = req.app.get('websocket');
    if (websocketService && websocketService.io) {
      websocketService.io.to(`trip_${trip.id}`).emit('bus_location_updated', {
        trip_id: trip.id,
        location: {
          latitude: lat,
          longitude: lng,
          speed: parsedSpeed,
          heading: parsedHeading,
          timestamp: now,
        },
      });
    }

    res.json({
      success: true,
      message: 'Location updated',
      data: { latitude: lat, longitude: lng, timestamp: now, recorded_at: now },
    });
  } catch (error) {
    console.error('Report location error:', error);
    res.status(500).json({ success: false, message: 'Failed to report location', error: error.message });
  }
});

module.exports = router;