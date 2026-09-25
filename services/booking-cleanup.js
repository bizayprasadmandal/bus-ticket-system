const { Op } = require('sequelize');
const { Booking, Trip, Payment, sequelize } = require('../models');
const { getSystemSettings } = require('./settings');
const { releasePromoUsage } = require('./promos');

/**
 * Expire stale PENDING bookings older than the configured timeout.
 * - Cancels the booking
 * - Releases seats back to the trip
 * - Marks any pending payment as FAILED
 * Returns the number of bookings expired.
 */
async function expireStalePendingBookings() {
  const settings = await getSystemSettings();
  const timeoutMinutes = Number(settings.auto_cancel_timeout) || 30;
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

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
          cancellation_reason: `Payment timeout (expired after ${timeoutMinutes} minutes)`,
        },
        { transaction }
      );

      // Give the promo redemption back (the booking never got paid)
      if (booking.promo_code && Number(booking.discount_amount || 0) > 0) {
        await releasePromoUsage(booking.promo_code, { transaction });
      }

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

module.exports = { expireStalePendingBookings };
