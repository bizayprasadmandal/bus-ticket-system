const express = require('express');
const { City } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const cachingService = require('../services/caching');

const router = express.Router();

const invalidateCitiesCache = async () => {
  try {
    await cachingService.clearPattern('route_GET_/api/cities');
    await cachingService.del('cities_list');
  } catch (e) {
    // cache invalidation is best-effort
  }
};

// Get all cities
router.get('/', cachingService.cacheMiddleware(300), async (req, res) => {
  try {
    const { major_only = false } = req.query;

    let whereClause = {};
    if (major_only === 'true') {
      whereClause.is_major_city = true;
    }

    const cities = await City.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Cities retrieved successfully',
      data: {
        cities,
        total: cities.length,
      },
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cities',
      error: error.message,
    });
  }
});

// Get city by ID
router.get('/:id', commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const city = await City.findByPk(id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }

    res.json({
      success: true,
      message: 'City retrieved successfully',
      data: { city },
    });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get city',
      error: error.message,
    });
  }
});

// Create city (Admin only)
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const {
      name,
      name_nepali,
      district,
      province,
      latitude,
      longitude,
      is_major_city = false,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
      });
    }

    const city = await City.create({
      name,
      name_nepali,
      district,
      province,
      latitude,
      longitude,
      is_major_city,
    });

    await invalidateCitiesCache();

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: { city },
    });
  } catch (error) {
    console.error('Create city error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create city',
      error: error.message,
    });
  }
});

// Update city (Admin only)
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      name_nepali,
      district,
      province,
      latitude,
      longitude,
      is_major_city,
    } = req.body;

    const city = await City.findByPk(id);
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }

    await city.update({
      name,
      name_nepali,
      district,
      province,
      latitude,
      longitude,
      is_major_city,
    });

    await invalidateCitiesCache();

    res.json({
      success: true,
      message: 'City updated successfully',
      data: { city },
    });
  } catch (error) {
    console.error('Update city error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update city',
      error: error.message,
    });
  }
});

module.exports = router;