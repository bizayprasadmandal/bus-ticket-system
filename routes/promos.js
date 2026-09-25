const express = require('express');
const { Op, col } = require('sequelize');
const { PromoCode } = require('../models');

const router = express.Router();

// GET /promos - Public list of promo codes a customer can actually use right now
// (ACTIVE + within validity window + not fully redeemed). Codes are meant to be
// discovered, so this endpoint is intentionally unauthenticated.
router.get('/', async (req, res) => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());

    const promos = await PromoCode.findAll({
      where: {
        status: 'ACTIVE',
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { max_uses: 0 }, // 0 = unlimited redemptions
          { used_count: { [Op.lt]: col('max_uses') } },
        ],
      },
      attributes: [
        'id',
        'code',
        'description',
        'discount_type',
        'discount_value',
        'min_amount',
        'valid_from',
        'valid_until',
        'used_count',
        'max_uses',
      ],
      order: [
        ['valid_until', 'ASC'],
        ['discount_value', 'DESC'],
      ],
      limit: 50,
    });

    res.json({
      success: true,
      message: 'Promo codes retrieved successfully',
      data: { promos },
    });
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({ success: false, message: 'Failed to get promo codes', error: error.message });
  }
});

module.exports = router;
