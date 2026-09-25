const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { PromoCode } = require('../models');

// Dates are evaluated in NPT, like the rest of the app.
const nptToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// percentage -> share of the subtotal; fixed -> flat NPR; never exceeds the subtotal.
const computeDiscount = (promo, subtotal) => {
  const value = Number(promo.discount_value);
  const raw = promo.discount_type === 'percentage' ? (subtotal * value) / 100 : value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
};

/**
 * Validate a promo code against a subtotal. Returns { promo, discount } or { error }.
 * The frontend previews with the same rules; this is the authoritative check at
 * booking creation (inside the booking transaction).
 */
async function findValidPromo(code, subtotal, { transaction = null } = {}) {
  const normalized = String(code || '').toUpperCase().trim();
  if (!normalized) return { error: 'Promo code is required' };

  const promo = await PromoCode.findOne({
    where: { code: normalized, status: 'ACTIVE' },
    transaction,
  });
  if (!promo) return { error: 'Invalid promo code' };

  const today = nptToday();
  if (String(promo.valid_from) > today) return { error: `This code is valid from ${promo.valid_from}` };
  if (String(promo.valid_until) < today) return { error: 'This code has expired' };
  if (Number(promo.max_uses) > 0 && Number(promo.used_count) >= Number(promo.max_uses)) {
    return { error: 'This code is fully redeemed' };
  }
  if (subtotal < Number(promo.min_amount)) {
    return { error: `This code needs a minimum spend of NPR ${Number(promo.min_amount).toLocaleString()}` };
  }

  return { promo, discount: computeDiscount(promo, subtotal) };
}

/**
 * Give a redemption back when a booking dies before being used
 * (customer cancel or payment-timeout expiry). Never goes below 0.
 */
async function releasePromoUsage(promoCode, { transaction = null } = {}) {
  if (!promoCode) return;
  await PromoCode.update(
    { used_count: sequelize.literal('GREATEST(used_count - 1, 0)') },
    { where: { code: promoCode }, transaction }
  );
}

module.exports = { nptToday, computeDiscount, findValidPromo, releasePromoUsage };
