const { User, Trip, Bus, Route } = require('../models');

// Shared access check for trip-scoped endpoints (manifest, crew assignment,
// board/no-show, verify-pnr, ...)
// Returns { ok: true } or { ok: false, status, message }
async function checkTripAccess(req, trip) {
  const userRoles = req.user.roles || [];
  const isAdmin = userRoles.some(r => r.role === 'SUPER_ADMIN' && r.is_active);
  if (isAdmin) return { ok: true };

  const operatorRole = userRoles.find(r => r.role === 'OPERATOR' && r.is_active);
  const dispatcherRole = userRoles.find(r => r.role === 'DISPATCHER' && r.is_active);
  const counterRole = userRoles.find(r => r.role === 'COUNTER_AGENT' && r.is_active);
  const driverRole = userRoles.find(r => r.role === 'DRIVER' && r.is_active);
  const conductorRole = userRoles.find(r => r.role === 'CONDUCTOR' && r.is_active);

  if (!operatorRole && !dispatcherRole && !counterRole && !driverRole && !conductorRole) {
    return { ok: false, status: 403, message: 'Only staff roles can access this trip' };
  }

  if (driverRole) {
    const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
    if (!user || trip.driver_name !== user.full_name) {
      return { ok: false, status: 403, message: 'You can only access trips assigned to you' };
    }
    return { ok: true };
  }

  if (conductorRole) {
    const user = await User.findByPk(req.user.id, { attributes: ['full_name'] });
    if (!user || trip.conductor_name !== user.full_name) {
      return { ok: false, status: 403, message: 'You can only access trips assigned to you' };
    }
    return { ok: true };
  }

  const scopedRole = operatorRole || dispatcherRole || counterRole;
  const ownerId = scopedRole.operator_id;
  const tripOwners = [trip.bus?.operator_id, trip.route?.operator_id].filter(Boolean);
  if (!tripOwners.includes(ownerId)) {
    return { ok: false, status: 403, message: 'You can only access trips of your own operator' };
  }
  return { ok: true };
}

// Loads the trip for a booking (with bus/route operator_id) and runs checkTripAccess.
async function checkBookingAccess(req, booking) {
  const trip = await Trip.findByPk(booking.trip_id, {
    include: [
      { model: Bus, as: 'bus', attributes: ['operator_id'] },
      { model: Route, as: 'route', attributes: ['operator_id'] },
    ],
  });
  if (!trip) {
    return { ok: false, status: 404, message: 'Trip not found' };
  }
  return checkTripAccess(req, trip);
}

module.exports = { checkTripAccess, checkBookingAccess };
