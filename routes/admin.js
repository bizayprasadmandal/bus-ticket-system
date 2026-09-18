const express = require('express');
const { Op } = require('sequelize');
const { User, UserRole, Operator, Bus, Route, Trip, Booking } = require('../models');
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
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone_number: contact_phone,
      email,
      full_name: contact_person,
      password_hash: hashedPassword,
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

module.exports = router;
