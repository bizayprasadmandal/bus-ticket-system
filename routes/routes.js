const express = require('express');
const { Op } = require('sequelize');
const { Route, Operator, Trip } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { routeValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// Get all routes (optionally filtered by operator, origin, destination)
router.get('/', async (req, res) => {
  try {
    const { operator_id, origin_city, destination_city, is_active = true } = req.query;

    let whereClause = { is_active: is_active === 'true' };

    if (operator_id) {
      whereClause.operator_id = operator_id;
    }

    if (origin_city) {
      whereClause.origin_city = origin_city;
    }

    if (destination_city) {
      whereClause.destination_city = destination_city;
    }

    const routes = await Route.findAll({
      where: whereClause,
      include: [
        {
          model: Operator,
          as: 'operator',
          attributes: ['company_name', 'company_name_nepali', 'logo_url'],
        },
      ],
      order: [['origin_city', 'ASC'], ['destination_city', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Routes retrieved successfully',
      data: {
        routes,
        total: routes.length,
      },
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get routes',
      error: error.message,
    });
  }
});

// Get all routes for logged in operator
router.get('/operator/my-routes', authenticateToken, requireRole(['OPERATOR']), async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    const routes = await Route.findAll({
      where: { operator_id: operatorRole.operator_id },
      order: [['origin_city', 'ASC'], ['destination_city', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Operator routes retrieved successfully',
      data: {
        routes,
        total: routes.length,
      },
    });
  } catch (error) {
    console.error('Get operator routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operator routes',
      error: error.message,
    });
  }
});

// Get route details by route ID, including upcoming trips
router.get('/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const route = await Route.findByPk(id, {
      include: [
        {
          model: Operator,
          as: 'operator',
        },
        {
          model: Trip,
          as: 'trips',
          where: { status: ['SCHEDULED', 'BOARDING'] },
          required: false,
          limit: 10,
          order: [['trip_date', 'ASC']],
        },
      ],
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    res.json({
      success: true,
      message: 'Route details retrieved successfully',
      data: { route },
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route details',
      error: error.message,
    });
  }
});

// Create route (Operator only)
router.post('/', authenticateToken, requireRole(['OPERATOR']), routeValidation.create, handleValidationErrors, async (req, res) => {
  try {
    const {
      route_name,
      origin_city,
      destination_city,
      distance_km,
      estimated_duration_minutes,
      base_fare,
      stops,
    } = req.body;

    // Get operator ID from user roles
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    // Check if similar route exists for this operator with same origin and destination
    const existingRoute = await Route.findOne({
      where: {
        operator_id: operatorRole.operator_id,
        origin_city,
        destination_city,
        is_active: true,
      },
    });

    if (existingRoute) {
      return res.status(409).json({
        success: false,
        message: 'Route between these cities already exists for your company',
      });
    }

    const route = await Route.create({
      operator_id: operatorRole.operator_id,
      route_name,
      origin_city,
      destination_city,
      distance_km,
      estimated_duration_minutes,
      base_fare,
      stops,
      is_active: true,
    });

    // Get full route details with operator info
    const completeRoute = await Route.findByPk(route.id, {
      include: [
        {
          model: Operator,
          as: 'operator',
          attributes: ['company_name', 'company_name_nepali'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: { route: completeRoute },
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: error.message,
    });
  }
});

// Update route (Operator only for their own routes)
router.put('/:id', authenticateToken, requireRole(['OPERATOR']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      route_name,
      distance_km,
      estimated_duration_minutes,
      base_fare,
      stops,
      is_active,
    } = req.body;

    // Get operator ID from user roles
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    const route = await Route.findOne({
      where: {
        id,
        operator_id: operatorRole.operator_id,
      },
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not authorized',
      });
    }

    await route.update({
      route_name,
      distance_km,
      estimated_duration_minutes,
      base_fare,
      stops,
      is_active,
    });

    res.json({
      success: true,
      message: 'Route updated successfully',
      data: { route },
    });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update route',
      error: error.message,
    });
  }
});

// Delete route (Operator only, soft delete by setting is_active false)
router.delete('/:id', authenticateToken, requireRole(['OPERATOR']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Get operator ID from user roles
    const userRoles = req.user.roles || [];
    const operatorRole = userRoles.find(role => role.role === 'OPERATOR' && role.is_active);

    if (!operatorRole || !operatorRole.operator_id) {
      return res.status(403).json({
        success: false,
        message: 'Operator information not found',
      });
    }

    const route = await Route.findOne({
      where: {
        id,
        operator_id: operatorRole.operator_id,
      },
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found or not authorized',
      });
    }

    // Check if route has active trips
    const activeTrips = await Trip.count({
      where: {
        route_id: id,
        status: ['SCHEDULED', 'BOARDING', 'DEPARTED'],
      },
    });

    if (activeTrips > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete route with active trips',
      });
    }

    await route.update({ is_active: false });

    res.json({
      success: true,
      message: 'Route deleted successfully',
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete route',
      error: error.message,
    });
  }
});

module.exports = router;
