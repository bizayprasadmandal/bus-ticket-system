const express = require('express');
const { Operator, Bus, Route } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { operatorValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const {  UserRole } = require('../models');


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

// Get operator details
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

module.exports = router;