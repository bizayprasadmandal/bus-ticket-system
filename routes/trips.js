const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const { Trip, Route, Bus, Operator, Booking, BookingPassenger, BusLocation } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { tripValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const cachingService = require('../services/caching');

const router = express.Router();

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

    res.json({
      success: true,
      message: 'Trips found successfully',
      data: {
        trips: trips.map(trip => ({
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
            seat_layout: trip.bus.seat_layout,
            amenities: trip.bus.amenities,
            images: trip.bus.images,
          },
          operator: {
            id: trip.route.operator.id,
            company_name: trip.route.operator.company_name,
            company_name_nepali: trip.route.operator.company_name_nepali,
            logo_url: trip.route.operator.logo_url,
          },
        })),
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
          bus: trip.bus,
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
        seat_layout: trip.bus.seat_layout,
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

// Get trip location (real-time tracking)
router.get('/:id/location', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findByPk(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
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

// Create trip (Operator only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { route_id, bus_id, trip_date, departure_time, arrival_time, current_fare } = req.body;

    // Verify user has operator role
    const userRoles = req.user.roles || [];
    const isOperator = userRoles.some(role => role.role === 'OPERATOR' && role.is_active);
    
    if (!isOperator) {
      return res.status(403).json({
        success: false,
        message: 'Only operators can create trips',
      });
    }

    // Verify route and bus belong to the operator
    const route = await Route.findByPk(route_id);
    const bus = await Bus.findByPk(bus_id);

    if (!route || !bus) {
      return res.status(404).json({
        success: false,
        message: 'Route or bus not found',
      });
    }

    // Create trip
    const trip = await Trip.create({
      route_id,
      bus_id,
      trip_date,
      departure_time,
      arrival_time,
      current_fare,
      available_seats: bus.total_seats,
      status: 'SCHEDULED',
    });

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: { trip },
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create trip',
      error: error.message,
    });
  }
});

module.exports = router;