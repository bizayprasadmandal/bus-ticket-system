const { Op } = require('sequelize');
const { Booking, Trip, Payment, sequelize } = require('../models');

const PENDING_TIMEOUT_MINUTES = 30;

/**
 * Expire stale PENDING bookings older than the timeout.
 * - Cancels the booking
 * - Releases seats back to the trip
 * - Marks any pending payment as FAILED
 * Returns the number of bookings expired.
 */
async function expireStalePendingBookings() {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_MINUTES * 60 * 1000);

  const staleBookings = await Booking.findAll({
    where: {
      booking_status: 'PENDING',
      booking_date: { [Op.lt]: cutoff },
    },
    include: [{ model: Trip, as: 'trip' }],
  });

  if (staleBookings.length === 0) return 0;

  let expired = 0;
  for (const booking of staleBookings) {
    const transaction = await sequelize.transaction();
    try {
      await booking.update(
        {
          booking_status: 'CANCELLED',
          cancellation_reason: 'Payment timeout (expired after 30 minutes)',
        },
        { transaction }
      );

      if (booking.trip) {
        await booking.trip.increment(
          { available_seats: booking.total_passengers },
          { transaction }
        );
      }

      await Payment.update(
        { status: 'FAILED' },
        {
          where: { booking_id: booking.id, status: 'PENDING' },
          transaction,
        }
      );

      await transaction.commit();
      expired++;
      console.log(`⏰ Expired pending booking ${booking.pnr} (seats released: ${booking.total_passengers})`);
    } catch (error) {
      await transaction.rollback();
      console.error(`Failed to expire booking ${booking.pnr}:`, error.message);
    }
  }

  return expired;
}

module.exports = { expireStalePendingBookings, PENDING_TIMEOUT_MINUTES };
