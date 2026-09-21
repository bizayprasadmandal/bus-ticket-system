const express = require('express');
const { Op } = require('sequelize');
const { sequelize, User, UserRole, Operator, Bus, Route, Trip, Booking, Payment, UserWallet, WalletTransaction, Review, BookingPassenger } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// All routes here require SUPER_ADMIN
router.use(authenticateToken, requireRole(['SUPER_ADMIN']));

// GET /admin/operators - List all operators
router.get('/operators', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status.toUpperCase();
    if (search) {
      whereClause[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { contact_phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: operators } = await Operator.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: 'Operators retrieved successfully',
      data: {
        operators,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin get operators error:', error);
    res.status(500).json({ success: false, message: 'Failed to get operators', error: error.message });
  }
});

// GET /admin/operators/:id - Get operator details with stats
router.get('/operators/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const operator = await Operator.findByPk(req.params.id, {
      include: [
        { model: Bus, as: 'buses', attributes: ['id'] },
        { model: Route, as: 'routes', attributes: ['id'] },
      ],
    });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Operator not found' });
    }

    const busCount = operator.buses ? operator.buses.length : 0;
    const routeCount = operator.routes ? operator.routes.length : 0;

    // Get total bookings and revenue via trips
    const operatorBusIds = (operator.buses || []).map(b => b.id);
    let totalBookings = 0;
    let totalRevenue = 0;

    if (operatorBusIds.length > 0) {
      const trips = await Trip.findAll({
        where: { bus_id: { [Op.in]: operatorBusIds } },
        attributes: ['id'],
        raw: true,
      });
      const tripIds = trips.map(t => t.id);

      if (tripIds.length > 0) {
        totalBookings = await Booking.count({ where: { trip_id: { [Op.in]: tripIds } } });

        const revenueResult = await Booking.findOne({
          where: { trip_id: { [Op.in]: tripIds } },
          attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total_revenue']],
          raw: true,
        });
        totalRevenue = revenueResult ? parseFloat(revenueResult.total_revenue || 0) : 0;
      }
    }

    const operatorData = operator.toJSON();
    operatorData.buses_count = busCount;
    operatorData.routes_count = routeCount;
    operatorData.total_bookings = totalBookings;
    operatorData.total_revenue = totalRevenue;

    delete operatorData.buses;
    delete operatorData.routes;

    res.json({ success: true, data: { operator: operatorData } });
  } catch (error) {
    console.error('Admin get operator error:', error);
    res.status(500).json({ success: false, message: 'Failed to get operator', error: error.message });
  }
});

// POST /admin/operators - Register a new operator account
router.post('/operators', async (req, res) => {
  try {
    const { company_name, company_name_nepali, contact_person, contact_phone, email, password } = req.body;

    if (!company_name || !contact_person || !contact_phone || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create user account for operator
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone_number: contact_phone,
      email,
      full_name: contact_person,
      password: hashedPassword,
      is_phone_verified: true,
      status: 'ACTIVE',
    });

    const operator = await Operator.create({
      company_name,
      company_name_nepali: company_name_nepali || '',
      contact_person,
      contact_phone,
      email,
      status: 'APPROVED',
    });

    await UserRole.create({
      user_id: user.id,
      role: 'OPERATOR',
      operator_id: operator.id,
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: 'Operator registered successfully',
      data: { operator, user: { id: user.id, email: user.email } },
    });
  } catch (error) {
    console.error('Admin create operator error:', error);
    res.status(500).json({ success: false, message: 'Failed to create operator', error: error.message });
  }
});

// PUT /admin/operators/:id - Update operator
router.put('/operators/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const operator = await Operator.findByPk(req.params.id);
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Operator not found' });
    }

    const { company_name, company_name_nepali, contact_person, contact_phone, email, status } = req.body;
    await operator.update({ company_name, company_name_nepali, contact_person, contact_phone, email, status });

    res.json({ success: true, message: 'Operator updated successfully', data: { operator } });
  } catch (error) {
    console.error('Admin update operator error:', error);
    res.status(500).json({ success: false, message: 'Failed to update operator', error: error.message });
  }
});

// GET /admin/users - List all users
router.get('/users', commonValidation.pagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status.toUpperCase();
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [{ model: UserRole, as: 'roles', where: { is_active: true }, required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users', error: error.message });
  }
});

// PUT /admin/users/:id/status - Update user status
router.put('/users/:id/status', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { is_active } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ status: is_active ? 'ACTIVE' : 'INACTIVE' });

    // Also update all user roles
    await UserRole.update({ is_active }, { where: { user_id: user.id } });

    res.json({ success: true, message: 'User status updated successfully', data: { user: { id: user.id, status: user.status } } });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message });
  }
});

// GET /admin/bookings - List all bookings across all operators
router.get('/bookings', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, booking_status, payment_status, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (booking_status) whereClause.booking_status = booking_status.toUpperCase();
    if (payment_status) whereClause.payment_status = payment_status.toUpperCase();
    if (start_date || end_date) {
      whereClause.booking_date = {};
      if (start_date) whereClause.booking_date[Op.gte] = new Date(start_date);
      if (end_date) whereClause.booking_date[Op.lte] = new Date(end_date + 'T23:59:59');
    }
    if (search) {
      const matchingUsers = await User.findAll({
        where: { full_name: { [Op.like]: `%${search}%` } },
        attributes: ['id'],
        raw: true,
      });
      const matchingUserIds = matchingUsers.map(u => u.id);

      whereClause[Op.or] = [
        { pnr: { [Op.like]: `%${search}%` } },
        ...(matchingUserIds.length > 0 ? [{ user_id: { [Op.in]: matchingUserIds } }] : []),
      ];
    }

    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'phone_number'],
      },
      {
        model: Trip,
        as: 'trip',
        include: [
          { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
          { model: Bus, as: 'bus', attributes: ['bus_number'] },
        ],
      },
    ];

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include,
      order: [['booking_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        items: bookings,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get bookings', error: error.message });
  }
});

// GET /admin/payments - List all payments
router.get('/payments', async (req, res) => {
  try {
    const { page = 1, limit = 20, payment_method, status, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (payment_method) whereClause.payment_method = payment_method.toUpperCase();
    if (status) whereClause.status = status.toUpperCase();
    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
      if (end_date) whereClause.created_at[Op.lte] = new Date(end_date + 'T23:59:59');
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            { model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number'] },
            {
              model: Trip,
              as: 'trip',
              include: [
                { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
              ],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const summary = {
      total: count,
      completed: await Payment.count({ where: { ...whereClause, status: 'SUCCESS' } }),
      pending: await Payment.count({ where: { ...whereClause, status: 'PENDING' } }),
      refunded: await Payment.count({ where: { ...whereClause, status: 'CANCELLED' } }),
    };

    res.json({
      success: true,
      data: {
        items: payments,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
        summary,
      },
    });
  } catch (error) {
    console.error('Admin get payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payments', error: error.message });
  }
});

// GET /admin/buses - List all buses across operators
router.get('/buses', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, bus_type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status.toUpperCase();
    if (bus_type) whereClause.bus_type = bus_type;
    if (search) {
      whereClause.bus_number = { [Op.like]: `%${search}%` };
    }

    const { count, rows: buses } = await Bus.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Operator,
          as: 'operator',
          attributes: ['id', 'company_name'],
        },
      ],
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        items: buses,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin get buses error:', error);
    res.status(500).json({ success: false, message: 'Failed to get buses', error: error.message });
  }
});

// GET /admin/trips - List all trips
router.get('/trips', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, start_date, end_date, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status.toUpperCase();
    if (start_date || end_date) {
      whereClause.trip_date = {};
      if (start_date) whereClause.trip_date[Op.gte] = start_date;
      if (end_date) whereClause.trip_date[Op.lte] = end_date;
    }
    if (search) {
      whereClause[Op.or] = [
        { departure_time: { [Op.like]: `%${search}%` } },
        { '$route.origin_city$': { [Op.like]: `%${search}%` } },
        { '$route.destination_city$': { [Op.like]: `%${search}%` } },
        { '$bus.bus_number$': { [Op.like]: `%${search}%` } },
      ];
    }

    const include = [
      {
        model: Route,
        as: 'route',
        attributes: ['id', 'route_name', 'origin_city', 'destination_city'],
      },
      {
        model: Bus,
        as: 'bus',
        attributes: ['id', 'bus_number', 'bus_type'],
      },
    ];

    const { count, rows: trips } = await Trip.findAndCountAll({
      where: whereClause,
      include,
      order: [['trip_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        items: trips,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin get trips error:', error);
    res.status(500).json({ success: false, message: 'Failed to get trips', error: error.message });
  }
});

// GET /admin/reviews - List all reviews
router.get('/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 20, rating, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = { is_active: true };
    if (rating) whereClause.rating = parseInt(rating);

    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'full_name'],
      },
      {
        model: Trip,
        as: 'trip',
        include: [
          { model: Route, as: 'route', attributes: ['origin_city', 'destination_city'] },
        ],
      },
    ];

    if (search) {
      const matchingUsers = await User.findAll({
        where: { full_name: { [Op.like]: `%${search}%` } },
        attributes: ['id'],
        raw: true,
      });
      const matchingUserIds = matchingUsers.map(u => u.id);

      whereClause[Op.or] = [
        ...(matchingUserIds.length > 0 ? [{ user_id: { [Op.in]: matchingUserIds } }] : []),
        { '$trip.route.origin_city$': { [Op.like]: `%${search}%` } },
        { '$trip.route.destination_city$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: whereClause,
      include,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const avgResult = await Review.findOne({
      where: { is_active: true },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'average_rating']],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        items: reviews,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
        average_rating: avgResult ? parseFloat(parseFloat(avgResult.average_rating).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reviews', error: error.message });
  }
});

// GET /admin/wallets - List all user wallets
router.get('/wallets', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'phone_number'],
      },
      {
        model: WalletTransaction,
        as: 'transactions',
        order: [['created_at', 'DESC']],
        limit: 5,
      },
    ];

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

      if (matchingUserIds.length > 0) {
        whereClause.user_id = { [Op.in]: matchingUserIds };
      } else {
        whereClause.user_id = { [Op.in]: [] };
      }
    }

    const { count, rows: wallets } = await UserWallet.findAndCountAll({
      where: whereClause,
      include,
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const summary = {
      total_wallets: count,
      total_balance: wallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0),
      total_users: count,
    };

    res.json({
      success: true,
      data: {
        items: wallets,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
        summary,
      },
    });
  } catch (error) {
    console.error('Admin get wallets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wallets', error: error.message });
  }
});

// PUT /admin/users/:id/roles - Assign role to user
router.put('/users/:id/roles', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { role, operator_id } = req.body;
    const userId = req.params.id;

    const validRoles = ['CUSTOMER', 'OPERATOR', 'AGENT', 'SUPER_ADMIN', 'DISPATCHER', 'DRIVER', 'CONDUCTOR', 'COUNTER_AGENT'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existingRole = await UserRole.findOne({
      where: { user_id: userId, role },
    });

    if (existingRole) {
      if (!existingRole.is_active) {
        await existingRole.update({ is_active: true, operator_id: operator_id || existingRole.operator_id });
      } else {
        return res.status(400).json({ success: false, message: `User already has role: ${role}` });
      }
    } else {
      await UserRole.create({
        user_id: userId,
        role,
        operator_id: operator_id || null,
        is_active: true,
      });
    }

    const roles = await UserRole.findAll({
      where: { user_id: userId, is_active: true },
      attributes: ['id', 'role', 'operator_id', 'is_active'],
    });

    res.json({ success: true, message: `Role ${role} assigned successfully`, data: { roles } });
  } catch (error) {
    console.error('Admin assign role error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign role', error: error.message });
  }
});

// DELETE /admin/users/:id/roles/:role - Remove role from user
router.delete('/users/:id/roles/:role', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { id, role } = req.params;

    if (role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot remove SUPER_ADMIN role' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userRole = await UserRole.findOne({
      where: { user_id: id, role: role.toUpperCase(), is_active: true },
    });

    if (!userRole) {
      return res.status(404).json({ success: false, message: `User does not have role: ${role}` });
    }

    await userRole.update({ is_active: false });

    const roles = await UserRole.findAll({
      where: { user_id: id, is_active: true },
      attributes: ['id', 'role', 'operator_id', 'is_active'],
    });

    res.json({ success: true, message: `Role ${role} removed successfully`, data: { roles } });
  } catch (error) {
    console.error('Admin remove role error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove role', error: error.message });
  }
});

// GET /admin/dashboard/analytics - Enhanced analytics data
router.get('/dashboard/analytics', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Daily new users (last 30 days)
    const dailyUsersRaw = await User.findAll({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });
    const daily_new_users = dailyUsersRaw.map(r => ({ date: r.date, count: parseInt(r.count) }));

    // Popular routes (top 10 by bookings)
    const popularRoutesRaw = await Booking.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'bookings'],
        [sequelize.fn('SUM', sequelize.col('Booking.total_amount')), 'revenue'],
      ],
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: [],
          include: [
            {
              model: Route,
              as: 'route',
              attributes: ['origin_city', 'destination_city'],
            },
          ],
        },
      ],
      group: ['trip.route.id', 'trip.route.origin_city', 'trip.route.destination_city'],
      order: [[sequelize.fn('COUNT', sequelize.col('Booking.id')), 'DESC']],
      limit: 10,
      raw: true,
      nest: true,
    });
    const popular_routes = popularRoutesRaw.map(r => ({
      origin: r.trip.route.origin_city,
      destination: r.trip.route.destination_city,
      bookings: parseInt(r.bookings),
      revenue: parseFloat(r.revenue || 0),
    }));

    // Peak hours (bookings by hour)
    const peakHoursRaw = await Booking.findAll({
      where: { booking_date: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('booking_date')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('HOUR', sequelize.col('booking_date'))],
      order: [[sequelize.fn('HOUR', sequelize.col('booking_date')), 'ASC']],
      raw: true,
    });
    const peak_hours = peakHoursRaw.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) }));

    // Conversion metrics
    const searches = 0; // Placeholder - would require search tracking
    const totalBookings = await Booking.count();
    const completedPayments = await Payment.count({ where: { status: 'SUCCESS' } });
    const conversion = { searches, bookings: totalBookings, completed_payments: completedPayments };

    // Growth metrics
    const usersThisMonth = await User.count({ where: { created_at: { [Op.gte]: startOfMonth } } });
    const operatorsThisMonth = await Operator.count({ where: { created_at: { [Op.gte]: startOfMonth } } });

    const bookingsThisMonth = await Booking.count({ where: { booking_date: { [Op.gte]: startOfMonth } } });
    const bookingsLastMonth = await Booking.count({
      where: { booking_date: { [Op.gte]: startOfLastMonth, [Op.lte]: endOfLastMonth } },
    });
    const bookings_growth_pct = bookingsLastMonth > 0
      ? Math.round(((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100)
      : 0;

    const revenueThisMonthResult = await Booking.findOne({
      where: { booking_date: { [Op.gte]: startOfMonth } },
      attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
      raw: true,
    });
    const revenueLastMonthResult = await Booking.findOne({
      where: { booking_date: { [Op.gte]: startOfLastMonth, [Op.lte]: endOfLastMonth } },
      attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'total']],
      raw: true,
    });
    const revenueThisMonth = parseFloat(revenueThisMonthResult?.total || 0);
    const revenueLastMonth = parseFloat(revenueLastMonthResult?.total || 0);
    const revenue_growth_pct = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

    const growth = {
      users_this_month: usersThisMonth,
      operators_this_month: operatorsThisMonth,
      bookings_growth_pct,
      revenue_growth_pct,
    };

    res.json({
      success: true,
      data: {
        daily_new_users,
        popular_routes,
        peak_hours,
        conversion,
        growth,
      },
    });
  } catch (error) {
    console.error('Admin dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get analytics', error: error.message });
  }
});

// GET /admin/audit-log - Get audit log entries (placeholder)
router.get('/audit-log', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { page = 1, limit = 20, action, entity_type } = req.query;

    const sampleAuditLog = [
      { id: 1, timestamp: '2026-09-22T10:00:00Z', user: 'admin@samaya.com', action: 'USER_LOGIN', entity_type: 'USER', entity_id: 1, details: 'Successful login', ip_address: '192.168.1.1' },
      { id: 2, timestamp: '2026-09-22T10:15:00Z', user: 'admin@samaya.com', action: 'OPERATOR_CREATED', entity_type: 'OPERATOR', entity_id: 5, details: 'Created operator: Nepal Express', ip_address: '192.168.1.1' },
      { id: 3, timestamp: '2026-09-22T10:30:00Z', user: 'operator@nepal.com', action: 'BUS_ADDED', entity_type: 'BUS', entity_id: 12, details: 'Added bus: NA 1234', ip_address: '192.168.1.2' },
      { id: 4, timestamp: '2026-09-22T11:00:00Z', user: 'admin@samaya.com', action: 'ROLE_ASSIGNED', entity_type: 'USER_ROLE', entity_id: 3, details: 'Assigned OPERATOR role to user 3', ip_address: '192.168.1.1' },
      { id: 5, timestamp: '2026-09-22T11:30:00Z', user: 'system', action: 'BOOKING_CONFIRMED', entity_type: 'BOOKING', entity_id: 45, details: 'PNR: ABC123, Amount: Rs. 1500', ip_address: '127.0.0.1' },
      { id: 6, timestamp: '2026-09-22T12:00:00Z', user: 'admin@samaya.com', action: 'SETTINGS_UPDATED', entity_type: 'SYSTEM', entity_id: null, details: 'Updated tax_rate from 12 to 13', ip_address: '192.168.1.1' },
      { id: 7, timestamp: '2026-09-22T12:30:00Z', user: 'driver@nepal.com', action: 'TRIP_STARTED', entity_type: 'TRIP', entity_id: 8, details: 'Trip started: Kathmandu to Pokhara', ip_address: '192.168.1.3' },
      { id: 8, timestamp: '2026-09-22T13:00:00Z', user: 'customer@samaya.com', action: 'PAYMENT_RECEIVED', entity_type: 'PAYMENT', entity_id: 22, details: 'Khalti payment of Rs. 1800', ip_address: '192.168.1.4' },
      { id: 9, timestamp: '2026-09-22T13:30:00Z', user: 'admin@samaya.com', action: 'USER_SUSPENDED', entity_type: 'USER', entity_id: 15, details: 'Suspended user for policy violation', ip_address: '192.168.1.1' },
      { id: 10, timestamp: '2026-09-22T14:00:00Z', user: 'system', action: 'SEAT_LOCK_CLEANUP', entity_type: 'SEAT_LOCK', entity_id: null, details: 'Cleaned up 5 expired locks', ip_address: '127.0.0.1' },
    ];

    let filtered = [...sampleAuditLog];
    if (action) filtered = filtered.filter(e => e.action === action.toUpperCase());
    if (entity_type) filtered = filtered.filter(e => e.entity_type === entity_type.toUpperCase());

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: {
        items: paginated,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(filtered.length / limit),
          total_items: filtered.length,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin audit log error:', error);
    res.status(500).json({ success: false, message: 'Failed to get audit log', error: error.message });
  }
});

// POST /admin/notifications/announce - Send platform-wide notification (placeholder)
router.post('/notifications/announce', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { title, message, target, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const validTargets = ['ALL', 'CUSTOMERS', 'OPERATORS', 'DRIVERS', 'DISPATCHERS'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    const announcement = {
      id: Date.now(),
      title,
      message,
      target: target && validTargets.includes(target.toUpperCase()) ? target.toUpperCase() : 'ALL',
      priority: priority && validPriorities.includes(priority.toUpperCase()) ? priority.toUpperCase() : 'MEDIUM',
      sent_by: req.user.email || req.user.id,
      sent_at: new Date().toISOString(),
    };

    console.log('📢 Platform announcement:', JSON.stringify(announcement, null, 2));

    res.status(201).json({
      success: true,
      message: 'Announcement sent successfully',
      data: { announcement },
    });
  } catch (error) {
    console.error('Admin announce error:', error);
    res.status(500).json({ success: false, message: 'Failed to send announcement', error: error.message });
  }
});

// GET /admin/settings - Get system settings (placeholder)
router.get('/settings', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const settings = {
      service_fee: 5,
      tax_rate: 13,
      currency: 'NPR',
      platform_name: 'Samaya Deluxe',
      seat_lock_timeout: 10,
      max_passengers: 10,
      auto_cancel_timeout: 30,
      payment_methods: {
        khalti: true,
        esewa: true,
        cash: true,
      },
      default_payment: 'khalti',
      notifications: {
        email: true,
        sms: true,
        push: true,
      },
    };

    res.json({ success: true, data: { settings } });
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get settings', error: error.message });
  }
});

// PUT /admin/settings - Update system settings (placeholder)
router.put('/settings', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const allowedFields = ['service_fee', 'tax_rate', 'currency', 'platform_name', 'seat_lock_timeout', 'max_passengers', 'auto_cancel_timeout', 'payment_methods', 'default_payment', 'notifications'];

    const currentSettings = {
      service_fee: 5,
      tax_rate: 13,
      currency: 'NPR',
      platform_name: 'Samaya Deluxe',
      seat_lock_timeout: 10,
      max_passengers: 10,
      auto_cancel_timeout: 30,
      payment_methods: { khalti: true, esewa: true, cash: true },
      default_payment: 'khalti',
      notifications: { email: true, sms: true, push: true },
    };

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updatedSettings = { ...currentSettings, ...updates };

    console.log('⚙️ Settings updated by:', req.user.email || req.user.id, '| Changes:', JSON.stringify(updates, null, 2));

    res.json({ success: true, message: 'Settings updated successfully', data: { settings: updatedSettings } });
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
});

module.exports = router;
