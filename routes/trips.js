const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const { Trip, Route, Bus, Operator, Booking, BookingPassenger, BusLocation } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { tripValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const cachingService = require('../services/caching');

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
router.get('/search', tripValidation.search, handleValidationErrors, cachingService.cacheMiddleware(300), async (req, res) => {
  try {
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
router.get('/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
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

    res.json({
      success: true,
      message: 'Trip details retrieved successfully',
      data: {
        trip: {
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
        },
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
router.get('/:id/seats', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
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

    // Verify operator owns this trip or is admin
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);

    if (!isAdmin && !operatorRole) {
      return res.status(403).json({
        success: false,
        message: 'Only operators or admins can update trip status',
      });
    }

    // If operator, verify they own this trip
    if (!isAdmin && operatorRole) {
      const tripWithBus = await Trip.findByPk(id, {
        include: [{ model: Bus, as: 'bus', attributes: ['operator_id'] }],
      });
      if (!tripWithBus || tripWithBus.bus.operator_id !== operatorRole.operator_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update status of your own trips',
        });
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

    await trip.update({ status });

    res.json({
      success: true,
      message: `Trip status updated to ${status}`,
      data: {
        trip_id: trip.id,
        previous_status: trip.status,
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

// GET /trips/operator/my-trips - Get trips for logged-in operator
router.get('/operator/my-trips', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const trips = await Trip.findAll({
      include: [
        { model: Bus, as: 'bus', where: { operator_id: operatorRole.operator_id }, required: true },
        { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
      ],
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
    const dispatcherRole = userRoles.find(role => role.role === 'DISPATCHER' && role.is_active);

    if (!dispatcherRole || !dispatcherRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Dispatcher operator information not found' });
    }

    const trips = await Trip.findAll({
      include: [
        { model: Bus, as: 'bus', where: { operator_id: dispatcherRole.operator_id }, required: true },
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

// GET /trips/driver/my-trips - Get trips for logged-in driver
router.get('/driver/my-trips', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const driverRole = userRoles.find(role => role.role === 'DRIVER' && role.is_active);

    if (!driverRole || !driverRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Driver operator information not found' });
    }

    const trips = await Trip.findAll({
      include: [
        { model: Bus, as: 'bus', where: { operator_id: driverRole.operator_id }, required: true },
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

    const trips = await Trip.findAll({
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

module.exports = router;