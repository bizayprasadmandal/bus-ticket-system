const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, UserRole, UserWallet } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { userValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const cachingService = require('../services/caching');
const { NotificationService } = require('../services/notifications');

const notificationService = new NotificationService();

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Normalize Nepali phone numbers to canonical 10-digit form (98xxxxxxxx / 97xxxxxxxx)
const normalizePhone = (req, res, next) => {
  if (typeof req.body.phone_number === 'string') {
    req.body.phone_number = req.body.phone_number
      .replace(/[\s\-()]/g, '')
      .replace(/^\+977/, '')
      .replace(/^0/, '');
  }
  next();
};

const isValidNepaliPhone = (phone) => /^9[6-8]\d{8}$/.test(phone);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone_number, full_name, password]
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "9841123456"
 *               full_name:
 *                 type: string
 *                 example: "Ram Bahadur"
 *               email:
 *                 type: string
 *                 example: "ram@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */
// Register new user
router.post('/register', normalizePhone, userValidation.register, handleValidationErrors, async (req, res) => {
  try {
    const { phone_number, email, full_name, full_name_nepali, gender, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        phone_number,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      phone_number,
      email,
      full_name,
      full_name_nepali,
      gender,
      password: hashedPassword,
      firebase_uid: uuidv4(),
    });

    // Create default customer role
    await UserRole.create({
      user_id: user.id,
      role: 'CUSTOMER',
      is_active: true,
    });

    // Create user wallet
    await UserWallet.create({
      user_id: user.id,
      balance: 0.00,
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
          email: user.email,
          full_name: user.full_name,
          full_name_nepali: user.full_name_nepali,
          gender: user.gender,
          date_of_birth: user.date_of_birth,
          profile_image_url: user.profile_image_url,
          status: user.status,
          is_phone_verified: user.is_phone_verified,
          is_email_verified: user.is_email_verified,
          roles: [{ role: 'CUSTOMER', is_active: true }],
        },
        token,
      },
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with phone number and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone_number, password]
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "9841123456"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
// Login user
router.post('/login', normalizePhone, async (req, res) => {
  try {
    const { phone_number, password, firebase_uid } = req.body;

    if (!phone_number && !firebase_uid) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or Firebase UID is required',
      });
    }

    // Password is always required (no credential-less login paths)
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    if (phone_number && !isValidNepaliPhone(phone_number)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Nepali phone number',
      });
    }

    // Find user
    const whereClause = phone_number ? { phone_number } : { firebase_uid };
    const user = await User.findOne({
      where: whereClause,
      include: [
        {
          model: UserRole,
          as: 'roles',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'role', 'operator_id', 'is_active'],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Accounts without a password hash can never authenticate
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
          email: user.email,
          full_name: user.full_name,
          full_name_nepali: user.full_name_nepali,
          gender: user.gender,
          date_of_birth: user.date_of_birth,
          profile_image_url: user.profile_image_url,
          status: user.status,
          is_phone_verified: user.is_phone_verified,
          is_email_verified: user.is_email_verified,
          roles: user.roles || [],
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
          email: user.email,
          full_name: user.full_name,
          full_name_nepali: user.full_name_nepali,
          gender: user.gender,
          date_of_birth: user.date_of_birth,
          profile_image_url: user.profile_image_url,
          status: user.status,
          is_phone_verified: user.is_phone_verified,
          is_email_verified: user.is_email_verified,
          roles: user.roles || [],
        },
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message,
    });
  }
});

// Send OTP for phone verification
router.post('/send-otp', async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in cache with 5-minute TTL
    await cachingService.cacheOTP(phone_number, otp, 300);

    // Send OTP via SMS
    const smsResult = await notificationService.sendOTP(phone_number, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        sms_sent: smsResult.success,
      },
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message,
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Get OTP from cache
    const cachedOTP = await cachingService.getCachedOTP(phone_number);

    if (!cachedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Verify OTP
    if (cachedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // Delete OTP from cache after successful verification
    await cachingService.invalidateOTP(phone_number);

    // Update user phone verification status
    const user = await User.findOne({ where: { phone_number } });
    if (user) {
      await user.update({ is_phone_verified: true });
    }

    res.json({
      success: true,
      message: 'Phone number verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message,
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const newToken = generateToken(user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message,
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await user.update({ password: hashedPassword });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
});


module.exports = router;