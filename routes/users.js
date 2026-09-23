const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { User, UserAddress, UserRole, UserWallet } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { userValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const { FileUploadService } = require('../services/file-upload');

const router = express.Router();
const fileUploadService = new FileUploadService();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

const buildProfilePayload = (user) => ({
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
});

const loadProfileAssociations = (userId) =>
  User.findByPk(userId, {
    include: [
      { model: UserAddress, as: 'addresses' },
      { model: UserRole, as: 'roles', where: { is_active: true }, required: false },
      { model: UserWallet, as: 'wallet' },
    ],
  });

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await loadProfileAssociations(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: buildProfilePayload(user) },
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

// Upload profile photo
router.post('/profile/photo', authenticateToken, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Send a field named "photo".',
      });
    }

    const userId = req.user.id;
    const previousUrl = req.user.profile_image_url;

    const result = await fileUploadService.uploadProfileImage(req.file, userId);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to upload profile photo',
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ profile_image_url: result.url });

    // Best-effort cleanup of previous local profile image
    if (
      previousUrl &&
      previousUrl.startsWith('/uploads/') &&
      result.url !== previousUrl
    ) {
      try {
        const relative = previousUrl.slice('/uploads/'.length);
        if (relative.startsWith('profiles/')) {
          const uploadRoot = process.env.UPLOAD_DIR || './uploads';
          const localPath = path.resolve(uploadRoot, relative);
          const rootResolved = path.resolve(uploadRoot);
          if (localPath.startsWith(rootResolved) && fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        }
      } catch (err) {
        console.warn('Failed to delete old profile photo:', err.message);
      }
    }

    const fresh = await loadProfileAssociations(userId);
    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: { user: buildProfilePayload(fresh || user) },
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile photo',
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

    const updates = {};
    if (email !== undefined) updates.email = email || null;
    if (full_name !== undefined) updates.full_name = full_name;
    if (full_name_nepali !== undefined) updates.full_name_nepali = full_name_nepali || null;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth || null;
    if (gender !== undefined) updates.gender = gender || null;
    if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url || null;

    await user.update(updates);

    const fresh = await loadProfileAssociations(userId);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: buildProfilePayload(fresh || user) },
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