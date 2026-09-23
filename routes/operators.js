const express = require('express');
const { Op } = require('sequelize');
const { Operator, Bus, Route, UserRole, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { operatorValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');


const router = express.Router();

// Get all operators (public - for display purposes)
router.get('/', async (req, res) => {
  try {
    const { status = 'APPROVED' } = req.query;

    const operators = await Operator.findAll({
      where: { status: status.toUpperCase() },
      attributes: [
        'id',
        'company_name',
        'company_name_nepali',
        'logo_url',
        'commission_rate',
        'created_at',
      ],
      order: [['company_name', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Operators retrieved successfully',
      data: {
        operators,
        total: operators.length,
      },
    });
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operators',
      error: error.message,
    });
  }
});

// Register as operator
router.post('/register', authenticateToken, operatorValidation.register, handleValidationErrors, async (req, res) => {
  try {
    const {
      company_name,
      company_name_nepali,
      license_number,
      pan_number,
      vat_number,
      contact_person,
      phone_number,
      email,
      address,
      logo_url,
    } = req.body;

    // Check if license number already exists
    const existingOperator = await Operator.findOne({
      where: { license_number },
    });

    if (existingOperator) {
      return res.status(409).json({
        success: false,
        message: 'Operator with this license number already exists',
      });
    }

    // Check if user already has a pending or approved operator registration
    const existingUserRole = await UserRole.findOne({
      where: {
        user_id: req.user.id,
        role: 'OPERATOR',
      },
    });

    if (existingUserRole) {
      return res.status(409).json({
        success: false,
        message: 'You already have an operator account',
      });
    }

    const operator = await Operator.create({
      company_name,
      company_name_nepali,
      license_number,
      pan_number,
      vat_number,
      contact_person,
      phone_number,
      email,
      address,
      logo_url,
      status: 'PENDING',
    });

    // Create operator role for the user (to be approved by admin)
    await UserRole.create({
      user_id: req.user.id,
      role: 'OPERATOR',
      operator_id: operator.id,
      is_active: false, // Will be activated when operator is approved
    });

    res.status(201).json({
      success: true,
      message: 'Operator registration submitted successfully. Awaiting approval.',
      data: {
        operator: {
          id: operator.id,
          company_name: operator.company_name,
          status: operator.status,
        },
      },
    });
  } catch (error) {
    console.error('Register operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register operator',
      error: error.message,
    });
  }
});

// Update operator (Operator themselves or Admin)
router.put('/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      company_name_nepali,
      contact_person,
      phone_number,
      email,
      address,
      logo_url,
    } = req.body;

    const operator = await Operator.findByPk(id);

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: 'Operator not found',
      });
    }

    // Check permissions
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.some(role => role.role === 'SUPER_ADMIN' && role.is_active);
    const isOperatorOwner = userRoles.some(role => 
      role.role === 'OPERATOR' && role.operator_id === parseInt(id) && role.is_active
    );

    if (!isAdmin && !isOperatorOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this operator',
      });
    }

    await operator.update({
      company_name,
      company_name_nepali,
      contact_person,
      phone_number,
      email,
      address,
      logo_url,
    });

    res.json({
      success: true,
      message: 'Operator updated successfully',
      data: { operator },
    });
  } catch (error) {
    console.error('Update operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update operator',
      error: error.message,
    });
  }
});

// Approve/Reject operator (Admin only)
router.post('/:id/approval', authenticateToken, requireRole(['SUPER_ADMIN']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be APPROVED or REJECTED',
      });
    }

    const operator = await Operator.findByPk(id);

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: 'Operator not found',
      });
    }

    if (operator.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Operator has already been processed',
      });
    }

    await operator.update({ status });

    // Update user role status
    if (status === 'APPROVED') {
      await UserRole.update(
        { is_active: true },
        { where: { operator_id: id, role: 'OPERATOR' } }
      );
    }

    res.json({
      success: true,
      message: `Operator ${status.toLowerCase()} successfully`,
      data: {
        operator: {
          id: operator.id,
          company_name: operator.company_name,
          status: operator.status,
        },
      },
    });
  } catch (error) {
    console.error('Approve operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process operator approval',
      error: error.message,
    });
  }
});

// Get pending operators (Admin only)
router.get('/admin/pending', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const pendingOperators = await Operator.findAll({
      where: { status: 'PENDING' },
      order: [['created_at', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Pending operators retrieved successfully',
      data: {
        operators: pendingOperators,
        total: pendingOperators.length,
      },
    });
  } catch (error) {
    console.error('Get pending operators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending operators',
      error: error.message,
    });
  }
});

// GET /operators/staff - Get staff members for the operator
router.get('/staff', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    let operatorId = operatorRole?.operator_id || null;
    if (isAdmin && req.query.operator_id) operatorId = parseInt(req.query.operator_id);
    if (!operatorId) {
      return res.status(403).json({ success: false, message: 'Operator not found' });
    }

    const staffRoles = await UserRole.findAll({
      where: { operator_id: operatorId, role: { [Op.in]: ['DISPATCHER', 'DRIVER', 'CONDUCTOR', 'COUNTER_AGENT'] } },
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number', 'email'] }],
    });

    const staff = staffRoles.map(r => ({
      id: r.id,
      full_name: r.user?.full_name || '',
      phone_number: r.user?.phone_number || '',
      email: r.user?.email || '',
      role: r.role,
      is_active: r.is_active,
      user_id: r.user_id,
    }));

    res.json({ success: true, data: { staff } });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ success: false, message: 'Failed to get staff' });
  }
});

// POST /operators/staff - Add staff member
router.post('/staff', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator not found' });
    }

    const { phone_number, full_name, role } = req.body;
    if (!phone_number || !role) {
      return res.status(400).json({ success: false, message: 'Phone and role are required' });
    }
    if (!['DISPATCHER', 'DRIVER', 'CONDUCTOR', 'COUNTER_AGENT'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Find or create user
    let user = await User.findOne({ where: { phone_number } });
    if (!user) {
      user = await User.create({
        phone_number,
        full_name: full_name || phone_number,
        password: '$2b$10$default', // Will need password reset
        status: 'ACTIVE',
        is_phone_verified: false,
      });
    }

    // Check if role already assigned
    const existing = await UserRole.findOne({ where: { user_id: user.id, role, operator_id: operatorRole.operator_id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Staff member already has this role' });
    }

    const staffRole = await UserRole.create({
      user_id: user.id,
      role,
      operator_id: operatorRole.operator_id,
      is_active: true,
    });

    res.json({ success: true, data: { staff: staffRole, user } });
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ success: false, message: 'Failed to add staff' });
  }
});

// DELETE /operators/staff/:id - Remove staff member
router.delete('/staff/:id', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    if (!operatorRole) return res.status(403).json({ success: false, message: 'Operator not found' });

    const staffRole = await UserRole.findOne({ where: { id: req.params.id, operator_id: operatorRole.operator_id } });
    if (!staffRole) return res.status(404).json({ success: false, message: 'Staff not found' });

    await staffRole.update({ is_active: false });
    res.json({ success: true, message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove staff' });
  }
});

// GET /profile - Get operator profile
router.get('/profile', authenticateToken, requireRole(['OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    const operator = await Operator.findByPk(operatorRole.operator_id, {
      include: [
        {
          model: Bus,
          as: 'buses',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: ['id', 'bus_number', 'bus_type', 'total_seats', 'status'],
        },
        {
          model: Route,
          as: 'routes',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'route_name', 'origin_city', 'destination_city'],
        },
      ],
    });

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: 'Operator profile not found',
      });
    }

    res.json({
      success: true,
      message: 'Operator profile retrieved successfully',
      data: { operator },
    });
  } catch (error) {
    console.error('Get operator profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operator profile',
      error: error.message,
    });
  }
});

// PUT /profile - Update operator profile
router.put('/profile', authenticateToken, requireRole(['OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    const operator = await Operator.findByPk(operatorRole.operator_id);

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: 'Operator profile not found',
      });
    }

    const {
      company_name,
      company_name_nepali,
      contact_person,
      phone_number,
      email,
      address,
      logo_url,
      pan_number,
      vat_number,
    } = req.body;

    await operator.update({
      company_name,
      company_name_nepali,
      contact_person,
      phone_number,
      email,
      address,
      logo_url,
      pan_number,
      vat_number,
    });

    res.json({
      success: true,
      message: 'Operator profile updated successfully',
      data: { operator },
    });
  } catch (error) {
    console.error('Update operator profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update operator profile',
      error: error.message,
    });
  }
});

// Get operator details (MUST be after all named routes to avoid conflicts)
router.get('/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const operator = await Operator.findByPk(id, {
      include: [
        {
          model: Bus,
          as: 'buses',
          where: { status: 'ACTIVE' },
          required: false,
        },
        {
          model: Route,
          as: 'routes',
          where: { is_active: true },
          required: false,
        },
      ],
    });

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: 'Operator not found',
      });
    }

    res.json({
      success: true,
      message: 'Operator details retrieved successfully',
      data: { operator },
    });
  } catch (error) {
    console.error('Get operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operator details',
      error: error.message,
    });
  }
});

module.exports = router;