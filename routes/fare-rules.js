const express = require('express');
const { Op } = require('sequelize');
const { FareRule, Operator, Route } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET / - List all fare rules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const where = {};

    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);

    if (!isAdmin && operatorRole) {
      where.operator_id = operatorRole.operator_id;
    }

    const fareRules = await FareRule.findAll({
      where,
      include: [
        { model: Operator, as: 'operator', attributes: ['id', 'company_name'] },
        { model: Route, as: 'route', attributes: ['id', 'origin_city', 'destination_city'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: { fare_rules: fareRules } });
  } catch (error) {
    console.error('Get fare rules error:', error);
    res.status(500).json({ success: false, message: 'Failed to get fare rules' });
  }
});

// POST / - Create fare rule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);

    if (!operatorRole && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, type, multiplier, discount_percent, start_date, end_date, start_time, end_time, days_of_week, route_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    const fareRule = await FareRule.create({
      operator_id: operatorRole?.operator_id || null,
      route_id: route_id || null,
      name,
      type,
      multiplier: multiplier || 1.00,
      discount_percent: discount_percent || 0,
      start_date: start_date || null,
      end_date: end_date || null,
      start_time: start_time || null,
      end_time: end_time || null,
      days_of_week: days_of_week || null,
      is_active: true,
    });

    res.status(201).json({ success: true, data: { fare_rule: fareRule } });
  } catch (error) {
    console.error('Create fare rule error:', error);
    res.status(500).json({ success: false, message: 'Failed to create fare rule' });
  }
});

// PUT /:id - Update fare rule
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);

    const fareRule = await FareRule.findByPk(req.params.id);
    if (!fareRule) {
      return res.status(404).json({ success: false, message: 'Fare rule not found' });
    }

    if (!isAdmin && (!operatorRole || fareRule.operator_id !== operatorRole.operator_id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, type, multiplier, discount_percent, start_date, end_date, start_time, end_time, days_of_week, route_id, is_active } = req.body;

    await fareRule.update({
      name: name ?? fareRule.name,
      type: type ?? fareRule.type,
      multiplier: multiplier ?? fareRule.multiplier,
      discount_percent: discount_percent ?? fareRule.discount_percent,
      start_date: start_date ?? fareRule.start_date,
      end_date: end_date ?? fareRule.end_date,
      start_time: start_time ?? fareRule.start_time,
      end_time: end_time ?? fareRule.end_time,
      days_of_week: days_of_week ?? fareRule.days_of_week,
      route_id: route_id ?? fareRule.route_id,
      is_active: is_active ?? fareRule.is_active,
    });

    res.json({ success: true, data: { fare_rule: fareRule } });
  } catch (error) {
    console.error('Update fare rule error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fare rule' });
  }
});

// DELETE /:id - Delete fare rule
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
    const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);

    const fareRule = await FareRule.findByPk(req.params.id);
    if (!fareRule) {
      return res.status(404).json({ success: false, message: 'Fare rule not found' });
    }

    if (!isAdmin && (!operatorRole || fareRule.operator_id !== operatorRole.operator_id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await fareRule.destroy();
    res.json({ success: true, message: 'Fare rule deleted' });
  } catch (error) {
    console.error('Delete fare rule error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete fare rule' });
  }
});

// GET /calculate/:tripId - Calculate fare with rules applied
router.get('/calculate/:tripId', authenticateToken, async (req, res) => {
  try {
    const { Trip } = require('../models');
    const trip = await Trip.findByPk(req.params.tripId, {
      include: [
        { model: Route, as: 'route' },
      ],
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    const applicableRules = await FareRule.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { operator_id: trip.route?.operator_id },
          { operator_id: null },
        ],
      },
    });

    let baseFare = parseFloat(trip.current_fare) || 0;
    let totalMultiplier = 1;
    let totalDiscount = 0;
    const appliedRules = [];

    for (const rule of applicableRules) {
      let applies = false;

      if (rule.type === 'PEAK_HOURS' && rule.start_time && rule.end_time) {
        if (currentTime >= rule.start_time && currentTime <= rule.end_time) applies = true;
      } else if (rule.type === 'WEEKEND' && rule.days_of_week) {
        if (rule.days_of_week.includes(dayOfWeek)) applies = true;
      } else if (rule.type === 'SEASONAL' && rule.start_date && rule.end_date) {
        if (currentDate >= rule.start_date && currentDate <= rule.end_date) applies = true;
      } else if (rule.type === 'DISCOUNT') {
        applies = true;
      } else if (rule.type === 'HOLIDAY') {
        applies = false; // Would need holiday data
      }

      if (applies) {
        if (rule.multiplier && parseFloat(rule.multiplier) !== 1) {
          totalMultiplier *= parseFloat(rule.multiplier);
        }
        if (rule.discount_percent && parseFloat(rule.discount_percent) > 0) {
          totalDiscount += parseFloat(rule.discount_percent);
        }
        appliedRules.push({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          multiplier: rule.multiplier,
          discount_percent: rule.discount_percent,
        });
      }
    }

    const fareAfterMultiplier = baseFare * totalMultiplier;
    const discountAmount = fareAfterMultiplier * (Math.min(totalDiscount, 100) / 100);
    const finalFare = Math.max(0, fareAfterMultiplier - discountAmount);

    res.json({
      success: true,
      data: {
        base_fare: baseFare,
        final_fare: Math.round(finalFare * 100) / 100,
        total_multiplier: totalMultiplier,
        total_discount_percent: Math.min(totalDiscount, 100),
        applied_rules: appliedRules,
      },
    });
  } catch (error) {
    console.error('Calculate fare error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate fare' });
  }
});

module.exports = router;
