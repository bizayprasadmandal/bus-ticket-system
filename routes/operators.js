const express = require('express');
const bcrypt = require('bcryptjs');
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

    if (company_name !== undefined && String(company_name).trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Company name must be at least 2 characters' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (phone_number && String(phone_number).trim()) {
      const digits = String(phone_number).replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        return res.status(400).json({ success: false, message: 'Please provide a valid phone number' });
      }
    }

    await operator.update({
      company_name: company_name !== undefined ? String(company_name).trim() : undefined,
      company_name_nepali,
      contact_person: contact_person !== undefined ? String(contact_person).trim() : undefined,
      phone_number: phone_number !== undefined ? String(phone_number).trim() : undefined,
      email: email !== undefined ? String(email).trim() : undefined,
      address: address !== undefined ? String(address).trim() : undefined,
      logo_url,
      pan_number: pan_number !== undefined ? String(pan_number).trim() : undefined,
      vat_number: vat_number !== undefined ? String(vat_number).trim() : undefined,
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

// NOTE: /profile must be registered BEFORE /:id, otherwise Express matches
// PUT /profile against PUT /:id and idParam rejects 'profile' with a 400.
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

    // Same normalization as login so the new staff member can actually sign in
    const phone = String(phone_number).trim().replace(/[\s\-()]/g, '').replace(/^\+977/, '').replace(/^0/, '');
    if (!/^9[6-8]\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Nepali mobile number (e.g. 9800000000)' });
    }

    // Find or create user
    let user = await User.findOne({ where: { phone_number: phone } });
    let createdUser = false;
    if (!user) {
      // Same convention as seed users so staff accounts can actually sign in
      user = await User.create({
        phone_number: phone,
        full_name: full_name || phone,
        password: await bcrypt.hash('password123', 10),
        status: 'ACTIVE',
        is_phone_verified: false,
      });
      createdUser = true;
    }

    // Check if role already assigned
    const existing = await UserRole.findOne({ where: { user_id: user.id, role, operator_id: operatorRole.operator_id } });
    if (existing) {
      if (!existing.is_active) {
        // Restore a previously removed staff member instead of erroring
        await existing.update({ is_active: true });
        return res.json({ success: true, message: 'Staff member restored', data: { staff: existing, user } });
      }
      return res.status(400).json({ success: false, message: 'Staff member already has this role' });
    }

    const staffRole = await UserRole.create({
      user_id: user.id,
      role,
      operator_id: operatorRole.operator_id,
      is_active: true,
    });

    const message = createdUser
      ? `Staff member added. They can sign in with phone ${phone} and password password123.`
      : 'Staff member added to the existing user account.';
    res.json({ success: true, message, data: { staff: staffRole, user } });
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

// GET /my-company - Company name for any staff role tied to an operator
router.get('/my-company', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const staffRole = userRoles.find(role =>
      role.is_active && role.operator_id &&
      ['OPERATOR', 'DISPATCHER', 'DRIVER', 'CONDUCTOR', 'COUNTER_AGENT'].includes(role.role)
    );

    if (!staffRole || !staffRole.operator_id) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const operator = await Operator.findByPk(staffRole.operator_id, {
      attributes: ['id', 'company_name', 'company_name_nepali'],
    });
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({
      success: true,
      data: {
        company_name: operator.company_name,
        company_name_nepali: operator.company_name_nepali,
      },
    });
  } catch (error) {
    console.error('Get my company error:', error);
    res.status(500).json({ success: false, message: 'Failed to get company' });
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