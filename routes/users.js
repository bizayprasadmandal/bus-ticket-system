const express = require('express');
const { User, UserAddress, UserRole, UserWallet } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { userValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserAddress,
          as: 'addresses',
        },
        {
          model: UserRole,
          as: 'roles',
          where: { is_active: true },
          required: false,
        },
        {
          model: UserWallet,
          as: 'wallet',
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
          email: user.email,
          full_name: user.full_name,
          full_name_nepali: user.full_name_nepali,
          date_of_birth: user.date_of_birth,
          gender: user.gender,
          profile_image_url: user.profile_image_url,
          is_phone_verified: user.is_phone_verified,
          is_email_verified: user.is_email_verified,
          status: user.status,
          created_at: user.created_at,
          addresses: user.addresses || [],
          roles: user.roles || [],
          wallet: user.wallet,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message,
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, userValidation.update, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email,
      full_name,
      full_name_nepali,
      date_of_birth,
      gender,
      profile_image_url,
    } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await user.update({
      email,
      full_name,
      full_name_nepali,
      date_of_birth,
      gender,
      profile_image_url,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
          email: user.email,
          full_name: user.full_name,
          full_name_nepali: user.full_name_nepali,
          date_of_birth: user.date_of_birth,
          gender: user.gender,
          profile_image_url: user.profile_image_url,
        },
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

// Add user address
router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      address_type,
      province,
      district,
      municipality,
      ward_no,
      street_address,
      is_default = false,
    } = req.body;

    // If this is default address, unset other default addresses
    if (is_default) {
      await UserAddress.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
    }

    const address = await UserAddress.create({
      user_id: userId,
      address_type,
      province,
      district,
      municipality,
      ward_no,
      street_address,
      is_default,
    });

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: { address },
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address',
      error: error.message,
    });
  }
});

// Get user addresses
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await UserAddress.findAll({
      where: { user_id: userId },
      order: [['is_default', 'DESC'], ['id', 'ASC']],
    });

    res.json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: { addresses },
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get addresses',
      error: error.message,
    });
  }
});

// Update address
router.put('/addresses/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      address_type,
      province,
      district,
      municipality,
      ward_no,
      street_address,
      is_default = false,
    } = req.body;

    const address = await UserAddress.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    // If this is being set as default, unset other default addresses
    if (is_default && !address.is_default) {
      await UserAddress.update(
        { is_default: false },
        { where: { user_id: userId, id: { [Op.ne]: id } } }
      );
    }

    await address.update({
      address_type,
      province,
      district,
      municipality,
      ward_no,
      street_address,
      is_default,
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: { address },
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message,
    });
  }
});

// Delete address
router.delete('/addresses/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await UserAddress.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    await address.destroy();

    res.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message,
    });
  }
});

// Get all users (Admin only)
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN']), commonValidation.pagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: UserRole,
          as: 'roles',
          where: { is_active: true },
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message,
    });
  }
});

module.exports = router;