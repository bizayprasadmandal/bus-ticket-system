const express = require('express');
const { Op } = require('sequelize');
const {
  Booking,
  Trip,
  Route,
  Bus,
  Operator,
  User,
  Payment,
  WalletTransaction,
} = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Dashboard overview for customers
router.get('/customer', authenticateToken, requireRole(['CUSTOMER']), async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get customer stats
    const [
      totalBookings,
      recentBookings,
      upcomingTrips,
      completedTrips,
      totalSpent,
    ] = await Promise.all([
      // Total bookings count
      Booking.count({ where: { user_id: userId } }),
      
      // Recent bookings (last 30 days)
      Booking.findAll({
        where: {
          user_id: userId,
          booking_date: { [Op.gte]: thirtyDaysAgo },
        },
        include: [
          {
            model: Trip,
            as: 'trip',
            include: [
              {
                model: Route,
                as: 'route',
              },
            ],
          },
        ],
        order: [['booking_date', 'DESC']],
        limit: 5,
      }),
      
      // Upcoming trips
      Booking.findAll({
        where: {
          user_id: userId,
          booking_status: 'CONFIRMED',
        },
        include: [
          {
            model: Trip,
            as: 'trip',
            where: {
              trip_date: { [Op.gte]: currentDate },
              status: ['SCHEDULED', 'BOARDING'],
            },
            include: [
              {
                model: Route,
                as: 'route',
              },
            ],
          },
        ],
        order: [['trip', 'trip_date', 'ASC']],
        limit: 3,
      }),
      
      // Completed trips count
      Booking.count({
        where: {
          user_id: userId,
          booking_status: 'COMPLETED',
        },
      }),
      
      // Total amount spent
      Booking.sum('total_amount', {
        where: {
          user_id: userId,
          payment_status: 'COMPLETED',
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Customer dashboard data retrieved successfully',
      data: {
        stats: {
          total_bookings: totalBookings,
          completed_trips: completedTrips,
          total_spent: parseFloat(totalSpent || 0),
          upcoming_trips_count: upcomingTrips.length,
        },
        recent_bookings: recentBookings,
        upcoming_trips: upcomingTrips,
      },
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: error.message,
    });
  }
});

// Dashboard overview for operators
router.get('/operator', authenticateToken, requireRole(['OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);
    
    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    const operatorId = operatorRole.operator_id;
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));

    const [
      totalRoutes,
      totalBuses,
      todayTrips,
      monthlyBookings,
      monthlyRevenue,
      recentBookings,
    ] = await Promise.all([
      // Total routes
      Route.count({ where: { operator_id: operatorId, is_active: true } }),
      
      // Total buses
      Bus.count({ where: { operator_id: operatorId, status: 'ACTIVE' } }),
      
      // Today's trips
      Trip.findAll({
        where: {
          trip_date: currentDate.toISOString().split('T')[0],
        },
        include: [
          {
            model: Route,
            as: 'route',
            where: { operator_id: operatorId },
          },
          {
            model: Bus,
            as: 'bus',
          },
        ],
        order: [['departure_time', 'ASC']],
      }),
      
      // Monthly bookings count
      Booking.count({
        where: {
          booking_date: { [Op.gte]: thirtyDaysAgo },
          booking_status: ['CONFIRMED', 'COMPLETED'],
        },
        include: [
          {
            model: Trip,
            as: 'trip',
            include: [
              {
                model: Route,
                as: 'route',
                where: { operator_id: operatorId },
              },
            ],
          },
        ],
      }),
      
      // Monthly revenue
      Booking.sum('total_amount', {
        where: {
          booking_date: { [Op.gte]: thirtyDaysAgo },
          payment_status: 'COMPLETED',
        },
        include: [
          {
            model: Trip,
            as: 'trip',
            include: [
              {
                model: Route,
                as: 'route',
                where: { operator_id: operatorId },
              },
            ],
          },
        ],
      }),
      
      // Recent bookings
      Booking.findAll({
        where: {
          booking_date: { [Op.gte]: thirtyDaysAgo },
        },
        include: [
          {
            model: Trip,
            as: 'trip',
            include: [
              {
                model: Route,
                as: 'route',
                where: { operator_id: operatorId },
              },
            ],
          },
          {
            model: User,
            as: 'user',
            attributes: ['full_name', 'phone_number'],
          },
        ],
        order: [['booking_date', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      message: 'Operator dashboard data retrieved successfully',
      data: {
        stats: {
          total_routes: totalRoutes,
          total_buses: totalBuses,
          today_trips_count: todayTrips.length,
          monthly_bookings: monthlyBookings,
          monthly_revenue: parseFloat(monthlyRevenue || 0),
        },
        today_trips: todayTrips,
        recent_bookings: recentBookings,
      },
    });
  } catch (error) {
    console.error('Operator dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operator dashboard data',
      error: error.message,
    });
  }
});

// Admin dashboard overview
router.get('/admin', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));

    const [
      totalUsers,
      totalOperators,
      totalBookings,
      monthlyRevenue,
      systemStats,
      recentActivity,
    ] = await Promise.all([
      // Total users
      User.count({ where: { status: 'ACTIVE' } }),
      
      // Total operators
      Operator.count({ where: { status: 'APPROVED' } }),
      
      // Total bookings
      Booking.count(),
      
      // Monthly revenue (platform commission)
      Booking.sum('service_fee', {
        where: {
          booking_date: { [Op.gte]: thirtyDaysAgo },
          payment_status: 'COMPLETED',
        },
      }),
      
      // System stats
      Promise.all([
        Trip.count({ where: { trip_date: { [Op.gte]: currentDate } } }),
        Bus.count({ where: { status: 'ACTIVE' } }),
        Route.count({ where: { is_active: true } }),
        Payment.count({ where: { status: 'SUCCESS' } }),
      ]).then(([trips, buses, routes, payments]) => ({
        active_trips: trips,
        active_buses: buses,
        active_routes: routes,
        successful_payments: payments,
      })),
      
      // Recent activity
      Booking.findAll({
        where: {
          booking_date: { [Op.gte]: thirtyDaysAgo },
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['full_name', 'phone_number'],
          },
          {
            model: Trip,
            as: 'trip',
            include: [
              {
                model: Route,
                as: 'route',
                attributes: ['route_name', 'origin_city', 'destination_city'],
              },
            ],
          },
        ],
        order: [['booking_date', 'DESC']],
        limit: 15,
      }),
    ]);

    res.json({
      success: true,
      message: 'Admin dashboard data retrieved successfully',
      data: {
        stats: {
          total_users: totalUsers,
          total_operators: totalOperators,
          total_bookings: totalBookings,
          monthly_commission: parseFloat(monthlyRevenue || 0),
        },
        system_stats: systemStats,
        recent_activity: recentActivity,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin dashboard data',
      error: error.message,
    });
  }
});

// Get booking analytics
router.get('/analytics/bookings', authenticateToken, requireRole(['OPERATOR', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { period = '30', operator_id } = req.query;
    const daysBack = parseInt(period);
    const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

    let whereClause = {
      booking_date: { [Op.gte]: startDate },
    };

    let includeClause = [];

    // If user is operator, filter by their operator_id
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);
    
    if (operatorRole && !userRoles.some(role => role.role === 'SUPER_ADMIN')) {
      includeClause.push({
        model: Trip,
        as: 'trip',
        include: [
          {
            model: Route,
            as: 'route',
            where: { operator_id: operatorRole.operator_id },
          },
        ],
      });
    } else if (operator_id) {
      includeClause.push({
        model: Trip,
        as: 'trip',
        include: [
          {
            model: Route,
            as: 'route',
            where: { operator_id: parseInt(operator_id) },
          },
        ],
      });
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: includeClause,
      attributes: [
        'booking_date',
        'booking_status',
        'payment_status',
        'total_amount',
        'total_passengers',
      ],
      order: [['booking_date', 'ASC']],
    });

    // Group data by date
    const analyticsData = {};
    bookings.forEach(booking => {
      const date = booking.booking_date.toISOString().split('T')[0];
      if (!analyticsData[date]) {
        analyticsData[date] = {
          date,
          bookings: 0,
          revenue: 0,
          passengers: 0,
          confirmed: 0,
          cancelled: 0,
          completed: 0,
        };
      }
      
      analyticsData[date].bookings += 1;
      analyticsData[date].revenue += parseFloat(booking.total_amount || 0);
      analyticsData[date].passengers += booking.total_passengers || 0;
      
      switch (booking.booking_status) {
        case 'CONFIRMED':
          analyticsData[date].confirmed += 1;
          break;
        case 'CANCELLED':
          analyticsData[date].cancelled += 1;
          break;
        case 'COMPLETED':
          analyticsData[date].completed += 1;
          break;
      }
    });

    const analyticsArray = Object.values(analyticsData);

    res.json({
      success: true,
      message: 'Booking analytics retrieved successfully',
      data: {
        period_days: daysBack,
        analytics: analyticsArray,
        summary: {
          total_bookings: bookings.length,
          total_revenue: analyticsArray.reduce((sum, day) => sum + day.revenue, 0),
          total_passengers: analyticsArray.reduce((sum, day) => sum + day.passengers, 0),
          average_daily_bookings: analyticsArray.length > 0 ? (bookings.length / analyticsArray.length).toFixed(2) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Booking analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking analytics',
      error: error.message,
    });
  }
});

module.exports = router;