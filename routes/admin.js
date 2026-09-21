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

// GET /admin/operators/:id - Get operator details
router.get('/operators/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const operator = await Operator.findByPk(req.params.id);
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Operator not found' });
    }
    res.json({ success: true, data: { operator } });
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

module.exports = router;
