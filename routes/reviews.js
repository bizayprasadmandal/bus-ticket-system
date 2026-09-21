const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Review, User, Trip, Booking, Bus, Route, Operator, City } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// POST / - Create review (authenticated, only COMPLETED bookings, one per user per trip)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { trip_id, rating, title, comment, is_anonymous } = req.body;
    const user_id = req.user.id;

    if (!trip_id || !rating) {
      return res.status(400).json({ success: false, message: 'trip_id and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check user has a completed booking for this trip
    const booking = await Booking.findOne({
      where: {
        user_id,
        trip_id,
        booking_status: 'COMPLETED',
      },
    });

    if (!booking) {
      return res.status(403).json({ success: false, message: 'You can only review trips you have completed' });
    }

    // Check if user already reviewed this trip
    const existingReview = await Review.findOne({
      where: { user_id, trip_id },
    });

    if (existingReview) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this trip' });
    }

    // Get trip to find operator
    const trip = await Trip.findByPk(trip_id, {
      include: [{ model: Bus, as: 'bus', attributes: ['operator_id'] }],
    });

    const operator_id = trip?.bus?.operator_id || null;

    const review = await Review.create({
      user_id,
      trip_id,
      operator_id,
      rating,
      title,
      comment,
      is_anonymous: is_anonymous || false,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
});

// GET /trip/:tripId - Get reviews for a trip (public)
router.get('/trip/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { trip_id: tripId, is_active: true },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] },
        { model: Trip, as: 'trip', attributes: ['id', 'trip_date', 'departure_time'],
          include: [
            { model: Route, as: 'route', attributes: ['id'],
              include: [
                { model: City, as: 'origin', attributes: ['id', 'name'] },
                { model: City, as: 'destination', attributes: ['id', 'name'] },
              ]
            }
          ]
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Mask anonymous reviews
    const masked = reviews.map(r => {
      const plain = r.toJSON();
      if (plain.is_anonymous) {
        plain.user = { id: null, full_name: 'Anonymous' };
      }
      return plain;
    });

    res.json({
      success: true,
      data: masked,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get trip reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// GET /operator/:operatorId - Get reviews for an operator (public)
router.get('/operator/:operatorId', async (req, res) => {
  try {
    const { operatorId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { operator_id: operatorId, is_active: true },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name'] },
        { model: Trip, as: 'trip', attributes: ['id', 'trip_date', 'departure_time'],
          include: [
            { model: Route, as: 'route', attributes: ['id'],
              include: [
                { model: City, as: 'origin', attributes: ['id', 'name'] },
                { model: City, as: 'destination', attributes: ['id', 'name'] },
              ]
            }
          ]
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const masked = reviews.map(r => {
      const plain = r.toJSON();
      if (plain.is_anonymous) {
        plain.user = { id: null, full_name: 'Anonymous' };
      }
      return plain;
    });

    res.json({
      success: true,
      data: masked,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get operator reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// GET /my-reviews - Get current user's reviews (authenticated)
router.get('/my-reviews', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { user_id, is_active: true },
      include: [
        { model: Trip, as: 'trip', attributes: ['id', 'trip_date', 'departure_time'],
          include: [
            { model: Route, as: 'route', attributes: ['id', 'origin_city', 'destination_city'] },
          ]
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// DELETE /:id - Delete own review (authenticated)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const review = await Review.findOne({
      where: { id, user_id, is_active: true },
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or already deleted' });
    }

    await review.update({ is_active: false });

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
});

module.exports = router;
