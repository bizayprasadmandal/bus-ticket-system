const express = require('express');
const moment = require('moment');
const { SeatLock, Trip, User, Route } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { seatLockValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// Lock seats temporarily
router.post('/', authenticateToken, seatLockValidation.lock, handleValidationErrors, async (req, res) => {
  try {
    const { trip_id, seat_numbers } = req.body;
    const userId = req.user.id;
    const lockDurationMinutes = process.env.SEAT_LOCK_DURATION_MINUTES || 15;

    // Check if trip exists
    const trip = await Trip.findByPk(trip_id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    // Check for existing locks or bookings on these seats
    const existingLocks = await SeatLock.findAll({
      where: {
        trip_id,
        status: ['LOCKED', 'BOOKED'],
      },
    });

    const lockedSeats = [];
    existingLocks.forEach(lock => {
      if (lock.seat_numbers) {
        const seats = Array.isArray(lock.seat_numbers) ? lock.seat_numbers : JSON.parse(lock.seat_numbers);
        lockedSeats.push(...seats);
      }
    });

    const conflictingSeats = seat_numbers.filter(seat => lockedSeats.includes(seat));
    if (conflictingSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some seats are already locked or booked',
        conflicting_seats: conflictingSeats,
      });
    }

    // Release any existing locks by this user for this trip
    await SeatLock.update(
      { status: 'RELEASED' },
      {
        where: {
          trip_id,
          user_id: userId,
          status: 'LOCKED',
        },
      }
    );

    // Create new seat lock
    const expiresAt = moment().add(lockDurationMinutes, 'minutes').toDate();
    
    const seatLock = await SeatLock.create({
      trip_id,
      seat_numbers: JSON.stringify(seat_numbers),
      user_id: userId,
      expires_at: expiresAt,
      status: 'LOCKED',
    });

    res.json({
      success: true,
      message: 'Seats locked successfully',
      data: {
        lock_id: seatLock.id,
        seat_numbers,
        expires_at: expiresAt,
        duration_minutes: lockDurationMinutes,
      },
    });
  } catch (error) {
    console.error('Lock seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock seats',
      error: error.message,
    });
  }
});

// Release seat lock
router.delete('/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const seatLock = await SeatLock.findOne({
      where: {
        id,
        user_id: userId,
        status: 'LOCKED',
      },
    });

    if (!seatLock) {
      return res.status(404).json({
        success: false,
        message: 'Seat lock not found or already released',
      });
    }

    await seatLock.update({ status: 'RELEASED' });

    res.json({
      success: true,
      message: 'Seat lock released successfully',
    });
  } catch (error) {
    console.error('Release seat lock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release seat lock',
      error: error.message,
    });
  }
});

// Get user's active seat locks
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const activeLocks = await SeatLock.findAll({
      where: {
        user_id: userId,
        status: 'LOCKED',
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Route,
              as: 'route',
            },
          ],
        },
      ],
      order: [['locked_at', 'DESC']],
    });

    res.json({
      success: true,
      message: 'Active seat locks retrieved successfully',
      data: {
        locks: activeLocks.map(lock => ({
          id: lock.id,
          seat_numbers: JSON.parse(lock.seat_numbers),
          locked_at: lock.locked_at,
          expires_at: lock.expires_at,
          trip: {
            id: lock.trip.id,
            trip_date: lock.trip.trip_date,
            departure_time: lock.trip.departure_time,
            route: lock.trip.route,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Get active locks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active seat locks',
      error: error.message,
    });
  }
});

// Extend seat lock (if within allowed time)
router.put('/:id/extend', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const extensionMinutes = 10; // Allow 10 more minutes

    const seatLock = await SeatLock.findOne({
      where: {
        id,
        user_id: userId,
        status: 'LOCKED',
      },
    });

    if (!seatLock) {
      return res.status(404).json({
        success: false,
        message: 'Seat lock not found or already released',
      });
    }

    // Check if lock hasn't expired yet
    if (moment().isAfter(moment(seatLock.expires_at))) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend expired lock',
      });
    }

    // Extend expiry time
    const newExpiresAt = moment(seatLock.expires_at).add(extensionMinutes, 'minutes').toDate();
    await seatLock.update({ expires_at: newExpiresAt });

    res.json({
      success: true,
      message: 'Seat lock extended successfully',
      data: {
        lock_id: seatLock.id,
        new_expires_at: newExpiresAt,
        extension_minutes: extensionMinutes,
      },
    });
  } catch (error) {
    console.error('Extend seat lock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend seat lock',
      error: error.message,
    });
  }
});

// Clean up expired locks (admin only - cron job handles this automatically)
router.post('/cleanup-expired', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const result = await SeatLock.update(
      { status: 'RELEASED' },
      {
        where: {
          status: 'LOCKED',
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      }
    );

    res.json({
      success: true,
      message: `Cleaned up ${result[0]} expired seat locks`,
      cleaned_count: result[0],
    });
  } catch (error) {
    console.error('Cleanup expired locks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired locks',
      error: error.message,
    });
  }
});

module.exports = router;