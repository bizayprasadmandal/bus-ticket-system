// const express = require('express');
// const { Op } = require('sequelize');
// const { Bus, Operator, Trip } = require('../models');
// const { authenticateToken, requireRole } = require('../middleware/auth');
// const { busValidation, commonValidation } = require('../validators');
// const { handleValidationErrors } = require('../middleware/error');

// const router = express.Router();

// // List buses, optionally filtered by operator or status
// router.get('/', async (req, res) => {
//   try {
//     const { operator_id, status = 'ACTIVE' } = req.query;

//     let whereClause = { status: status.toUpperCase() };
//     if (operator_id) {
//       whereClause.operator_id = operator_id;
//     }

//     const buses = await Bus.findAll({
//       where: whereClause,
//       include: [
//         {
//           model: Operator,
//           as: 'operator',
//           attributes: ['company_name', 'company_name_nepali', 'logo_url'],
//         },
//       ],
//       order: [['bus_number', 'ASC']],
//     });

//     res.json({
//       success: true,
//       message: 'Buses retrieved successfully',
//       data: {
//         buses,
//         total: buses.length,
//       },
//     });
//   } catch (error) {
//     console.error('Get buses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get buses',
//       error: error.message,
//     });
//   }
// });

// // Get bus details by ID, including active trips
// router.get('/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const bus = await Bus.findByPk(id, {
//       include: [
//         {
//           model: Operator,
//           as: 'operator',
//         },
//         {
//           model: Trip,
//           as: 'trips',
//           where: { status: ['SCHEDULED', 'BOARDING', 'DEPARTED'] },
//           required: false,
//           limit: 5,
//           order: [['trip_date', 'ASC']],
//         },
//       ],
//     });

//     if (!bus) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bus not found',
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Bus details retrieved successfully',
//       data: { bus },
//     });
//   } catch (error) {
//     console.error('Get bus error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get bus details',
//       error: error.message,
//     });
//   }
// });

// // Create bus (Operator only)
// router.post('/', authenticateToken, requireRole(['OPERATOR']), busValidation.create, handleValidationErrors, async (req, res) => {
//   try {
//     const {
//       bus_number,
//       bus_model,
//       bus_type,
//       total_seats,
//       seat_layout,
//       amenities,
//       images,
//       registration_date,
//       insurance_expiry,
//       fitness_expiry,
//     } = req.body;

//     // Get operator ID from user roles
//     const userRoles = req.user.roles || [];
//     const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

//     if (!operatorRole || !operatorRole.operator_id) {
//       return res.status(403).json({
//         success: false,
//         message: 'Operator information not found',
//       });
//     }

//     // Check if bus number already exists for this operator
//     const existingBus = await Bus.findOne({
//       where: {
//         bus_number,
//         operator_id: operatorRole.operator_id,
//       },
//     });

//     if (existingBus) {
//       return res.status(409).json({
//         success: false,
//         message: 'Bus with this number already exists for your company',
//       });
//     }

//     const bus = await Bus.create({
//       operator_id: operatorRole.operator_id,
//       bus_number,
//       bus_model,
//       bus_type,
//       total_seats,
//       seat_layout,
//       amenities,
//       images,
//       registration_date,
//       insurance_expiry,
//       fitness_expiry,
//       status: 'ACTIVE',
//     });

//     // Get complete bus details
//     const completeBus = await Bus.findByPk(bus.id, {
//       include: [
//         {
//           model: Operator,
//           as: 'operator',
//           attributes: ['company_name', 'company_name_nepali'],
//         },
//       ],
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Bus created successfully',
//       data: { bus: completeBus },
//     });
//   } catch (error) {
//     console.error('Create bus error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create bus',
//       error: error.message,
//     });
//   }
// });

// // Update bus (Operator only for their own buses)
// router.put('/:id', authenticateToken, requireRole(['OPERATOR']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       bus_model,
//       bus_type,
//       total_seats,
//       seat_layout,
//       amenities,
//       images,
//       insurance_expiry,
//       fitness_expiry,
//       status,
//     } = req.body;

//     // Get operator ID from user roles
//     const userRoles = req.user.roles || [];
//     const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

//     if (!operatorRole || !operatorRole.operator_id) {
//       return res.status(403).json({
//         success: false,
//         message: 'Operator information not found',
//       });
//     }

//     const bus = await Bus.findOne({
//       where: {
//         id,
//         operator_id: operatorRole.operator_id,
//       },
//     });

//     if (!bus) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bus not found or not authorized',
//       });
//     }

//     await bus.update({
//       bus_model,
//       bus_type,
//       total_seats,
//       seat_layout,
//       amenities,
//       images,
//       insurance_expiry,
//       fitness_expiry,
//       status,
//     });

//     res.json({
//       success: true,
//       message: 'Bus updated successfully',
//       data: { bus },
//     });
//   } catch (error) {
//     console.error('Update bus error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update bus',
//       error: error.message,
//     });
//   }
// });

// // Delete bus (Operator only for their own buses - soft delete by setting status to RETIRED)
// router.delete('/:id', authenticateToken, requireRole(['OPERATOR']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Get operator ID from user roles
//     const userRoles = req.user.roles || [];
//     const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

//     if (!operatorRole || !operatorRole.operator_id) {
//       return res.status(403).json({
//         success: false,
//         message: 'Operator information not found',
//       });
//     }

//     const bus = await Bus.findOne({
//       where: {
//         id,
//         operator_id: operatorRole.operator_id,
//       },
//     });

//     if (!bus) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bus not found or not authorized',
//       });
//     }

//     // Check if the bus has active trips
//     const activeTrips = await Trip.count({
//       where: {
//         bus_id: id,
//         status: ['SCHEDULED', 'BOARDING', 'DEPARTED'],
//       },
//     });

//     if (activeTrips > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cannot delete bus with active trips',
//       });
//     }

//     await bus.update({ status: 'RETIRED' });

//     res.json({
//       success: true,
//       message: 'Bus deleted successfully',
//     });
//   } catch (error) {
//     console.error('Delete bus error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete bus',
//       error: error.message,
//     });
//   }
// });

// // Get all buses for the logged in operator
// router.get('/operator/my-buses', authenticateToken, requireRole(['OPERATOR']), async (req, res) => {
//   try {
//     // Get operator ID from user roles
//     const userRoles = req.user.roles || [];
//     const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

//     if (!operatorRole || !operatorRole.operator_id) {
//       return res.status(403).json({
//         success: false,
//         message: 'Operator information not found',
//       });
//     }

//     const buses = await Bus.findAll({
//       where: { operator_id: operatorRole.operator_id },
//       order: [['bus_number', 'ASC']],
//     });

//     res.json({
//       success: true,
//       message: 'Operator buses retrieved successfully',
//       data: {
//         buses,
//         total: buses.length,
//       },
//     });
//   } catch (error) {
//     console.error('Get operator buses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get operator buses',
//       error: error.message,
//     });
//   }
// });

// module.exports = router;


const express = require('express');
const { Op } = require('sequelize');
const { Bus, Operator, Trip } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { busValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// Hardcoded seat layouts based on provided images
const vipSofaSeatLayout = {
  layout_name: "Samaya A/C VIP Sofa",
  sides: {
    A: ["A","B","C","D","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"],
    B: ["J1","J2","क","ख","ग","घ","१","२","३","४","५","६","७","८","९","१०","११","१२"]
  }
};

const sleeperSofaLayout = {
  layout_name: "Samaya A/C Sleeper + Sofa",
  sides: {
    A: ["A","B","C","D","1","2","3","4","5","6","7","8","9","10",
        "Sleeper Bed 1", "Sleeper Bed 2", "Sleeper Bed 3", "Sleeper Bed 8", "Sleeper Bed 11"],
    B: ["J1","J2","क","ख","ग","घ","१","२","३","४","५","६","७","८",
        "Sleeper Bed 1", "Sleeper Bed 2", "Sleeper Bed 3", "Sleeper Bed 8"]
  }
};

// List buses, optionally filtered by operator or status
router.get('/', async (req, res) => {
  try {
    const { operator_id, status = 'ACTIVE' } = req.query;

    let whereClause = { status: status.toUpperCase() };
    if (operator_id) {
      whereClause.operator_id = operator_id;
    }

    const buses = await Bus.findAll({
      where: whereClause,
      include: [
        {
          model: Operator,
          as: 'operator',
          attributes: ['company_name', 'company_name_nepali', 'logo_url'],
        },
      ],
      order: [['bus_number', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Buses retrieved successfully',
      data: {
        buses,
        total: buses.length,
      },
    });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get buses',
      error: error.message,
    });
  }
});

// Get bus details by ID, including active trips
router.get('/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const bus = await Bus.findByPk(id, {
      include: [
        { model: Operator, as: 'operator' },
        {
          model: Trip,
          as: 'trips',
          where: { status: ['SCHEDULED', 'BOARDING', 'DEPARTED'] },
          required: false,
          limit: 5,
          order: [['trip_date', 'ASC']],
        },
      ],
    });

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    res.json({
      success: true,
      message: 'Bus details retrieved successfully',
      data: { bus },
    });
  } catch (error) {
    console.error('Get bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bus details',
      error: error.message,
    });
  }
});

// Create bus (Operator only)
router.post('/', authenticateToken, requireRole(['OPERATOR']), busValidation.create, handleValidationErrors, async (req, res) => {
  try {
    const {
      bus_number,
      bus_model,
      bus_type,
      total_seats,
      seat_layout_type,
      seat_layout: customSeatLayout,
      amenities,
      images,
      registration_date,
      insurance_expiry,
      fitness_expiry,
    } = req.body;

    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const existingBus = await Bus.findOne({
      where: {
        bus_number,
        operator_id: operatorRole.operator_id,
      },
    });

    if (existingBus) {
      return res.status(409).json({ success: false, message: 'Bus with this number already exists' });
    }

    let seat_layout = undefined;
    if (seat_layout_type === 'vip_sofa') {
      seat_layout = vipSofaSeatLayout;
    } else if (seat_layout_type === 'sleeper_sofa') {
      seat_layout = sleeperSofaLayout;
    } else if (customSeatLayout) {
      seat_layout = customSeatLayout;
    }

    const bus = await Bus.create({
      operator_id: operatorRole.operator_id,
      bus_number,
      bus_model,
      bus_type,
      total_seats,
      seat_layout,
      amenities,
      images,
      registration_date,
      insurance_expiry,
      fitness_expiry,
      status: 'ACTIVE',
    });

    const completeBus = await Bus.findByPk(bus.id, {
      include: [{ model: Operator, as: 'operator', attributes: ['company_name', 'company_name_nepali'] }],
    });

    res.status(201).json({
      success: true,
      message: 'Bus created successfully',
      data: { bus: completeBus },
    });
  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({ success: false, message: 'Failed to create bus', error: error.message });
  }
});

// Update bus (Operator only)
router.put('/:id', authenticateToken, requireRole(['OPERATOR']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bus_model,
      bus_type,
      total_seats,
      seat_layout_type,
      seat_layout: customSeatLayout,
      amenities,
      images,
      insurance_expiry,
      fitness_expiry,
      status,
    } = req.body;

    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const bus = await Bus.findOne({ where: { id, operator_id: operatorRole.operator_id } });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found or not authorized' });
    }

    let seat_layout = undefined;
    if (seat_layout_type === 'vip_sofa') {
      seat_layout = vipSofaSeatLayout;
    } else if (seat_layout_type === 'sleeper_sofa') {
      seat_layout = sleeperSofaLayout;
    } else if (customSeatLayout) {
      seat_layout = customSeatLayout;
    }

    await bus.update({
      bus_model,
      bus_type,
      total_seats,
      ...(seat_layout ? { seat_layout } : {}),
      amenities,
      images,
      insurance_expiry,
      fitness_expiry,
      status,
    });

    res.json({
      success: true,
      message: 'Bus updated successfully',
      data: { bus },
    });
  } catch (error) {
    console.error('Update bus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bus', error: error.message });
  }
});

// Delete bus (soft-delete)
router.delete('/:id', authenticateToken, requireRole(['OPERATOR']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const bus = await Bus.findOne({ where: { id, operator_id: operatorRole.operator_id } });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found or not authorized' });
    }

    const activeTrips = await Trip.count({
      where: {
        bus_id: id,
        status: ['SCHEDULED', 'BOARDING', 'DEPARTED'],
      },
    });

    if (activeTrips > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete bus with active trips' });
    }

    await bus.update({ status: 'RETIRED' });

    res.json({ success: true, message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bus', error: error.message });
  }
});

// Get all buses for logged-in operator
router.get('/operator/my-buses', authenticateToken, requireRole(['OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({ success: false, message: 'Operator information not found' });
    }

    const buses = await Bus.findAll({
      where: { operator_id: operatorRole.operator_id },
      order: [['bus_number', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Operator buses retrieved successfully',
      data: { buses, total: buses.length },
    });
  } catch (error) {
    console.error('Get operator buses error:', error);
    res.status(500).json({ success: false, message: 'Failed to get operator buses', error: error.message });
  }
});

module.exports = router;
