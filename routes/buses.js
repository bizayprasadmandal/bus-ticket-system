const express = require('express');
const { Op } = require('sequelize');
const { Bus, Operator, Trip } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { busValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// Hardcoded seat layouts based on provided images (layout = string[][] for seat pickers)
const sidesToLayout = (sides) => {
  const a = Array.isArray(sides?.A) ? sides.A : [];
  const b = Array.isArray(sides?.B) ? sides.B : [];
  const n = Math.max(a.length, b.length);
  const layout = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    if (a[i] != null && a[i] !== '') row.push(String(a[i]));
    if (b[i] != null && b[i] !== '') row.push(String(b[i]));
    if (row.length) layout.push(row);
  }
  return layout;
};

const generateSeatLayout = (totalSeats) => {
  const seatsPerRow = 4;
  const seats = Math.max(1, parseInt(totalSeats, 10) || 30);
  const rows = Math.ceil(seats / seatsPerRow);
  const layout = [];
  let n = 1;
  for (let r = 1; r <= rows; r++) {
    const row = [];
    for (let s = 1; s <= seatsPerRow && n <= seats; s++, n++) {
      row.push(`${r}${String.fromCharCode(64 + s)}`);
    }
    if (row.length) layout.push(row);
  }
  return { type: 'seater', rows, seats_per_row: seatsPerRow, layout };
};

const vipSofaSeatLayout = {
  layout_name: "A/C VIP Sofa",
  type: 'sofa',
  sides: {
    A: ["A","B","C","D","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"],
    B: ["J1","J2","क","ख","ग","घ","१","२","३","४","५","६","७","८","९","१०","११","१२"]
  },
};
vipSofaSeatLayout.layout = sidesToLayout(vipSofaSeatLayout.sides);

const sleeperSofaLayout = {
  layout_name: "A/C Sleeper + Sofa",
  type: 'sleeper',
  sides: {
    A: ["A","B","C","D","1","2","3","4","5","6","7","8","9","10",
        "Sleeper Bed 1", "Sleeper Bed 2", "Sleeper Bed 3", "Sleeper Bed 8", "Sleeper Bed 11"],
    B: ["J1","J2","क","ख","ग","घ","१","२","३","४","५","६","७","८",
        "Sleeper Bed 1", "Sleeper Bed 2", "Sleeper Bed 3", "Sleeper Bed 8"]
  },
};
sleeperSofaLayout.layout = sidesToLayout(sleeperSofaLayout.sides);

const resolveSeatLayout = (seat_layout_type, customSeatLayout, total_seats) => {
  if (seat_layout_type === 'vip_sofa') return vipSofaSeatLayout;
  if (seat_layout_type === 'sleeper_sofa') return sleeperSofaLayout;
  if (customSeatLayout) {
    if (Array.isArray(customSeatLayout)) {
      return { type: 'seater', layout: customSeatLayout };
    }
    if (customSeatLayout.layout && Array.isArray(customSeatLayout.layout)) {
      return customSeatLayout;
    }
  }
  return generateSeatLayout(total_seats);
};

// List buses, optionally filtered by operator or status
router.get('/', async (req, res) => {
  try {
    const { operator_id, status = 'ACTIVE' } = req.query;

    let whereClause = {};
    const statusNorm = String(status).toUpperCase();
    if (statusNorm !== 'ALL') {
      whereClause.status = statusNorm;
    }
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

    const seat_layout = resolveSeatLayout(seat_layout_type, customSeatLayout, total_seats);

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
      bus_number,
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

    if (bus_number && bus_number !== bus.bus_number) {
      const duplicate = await Bus.findOne({
        where: { bus_number, id: { [Op.ne]: id } },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Bus with this number already exists' });
      }
    }

    const hasLayoutChange =
      seat_layout_type !== undefined || customSeatLayout !== undefined;
    const seat_layout = hasLayoutChange
      ? resolveSeatLayout(
          seat_layout_type,
          customSeatLayout,
          total_seats ?? bus.total_seats
        )
      : undefined;

    const updates = {
      ...(bus_number !== undefined ? { bus_number } : {}),
      ...(bus_model !== undefined ? { bus_model } : {}),
      ...(bus_type !== undefined ? { bus_type } : {}),
      ...(total_seats !== undefined ? { total_seats } : {}),
      ...(seat_layout ? { seat_layout } : {}),
      ...(amenities !== undefined ? { amenities } : {}),
      ...(images !== undefined ? { images } : {}),
      ...(insurance_expiry !== undefined ? { insurance_expiry } : {}),
      ...(fitness_expiry !== undefined ? { fitness_expiry } : {}),
      ...(status !== undefined ? { status } : {}),
    };

    await bus.update(updates);

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

module.exports = router;
