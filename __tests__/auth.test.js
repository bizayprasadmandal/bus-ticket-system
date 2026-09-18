const request = require('supertest');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

// Mock the database and models
jest.mock('../config/database', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  sequelize: {
    sync: jest.fn().mockResolvedValue(true),
    transaction: jest.fn().mockReturnValue({
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    }),
  },
}));

jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  UserRole: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  UserWallet: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, phone_number: '9841123456', roles: [{ role: 'CUSTOMER', is_active: true }] };
    next();
  },
  requireRole: (roles) => (req, res, next) => next(),
}));

jest.mock('../validators', () => ({
  userValidation: {
    register: (req, res, next) => next(),
    update: (req, res, next) => next(),
  },
  commonValidation: {
    pagination: (req, res, next) => next(),
    idParam: (req, res, next) => next(),
  },
}));

jest.mock('../middleware/error', () => ({
  handleValidationErrors: (req, res, next) => next(),
  errorHandler: (err, req, res, next) => res.status(500).json({ success: false, message: err.message }),
  notFound: (req, res) => res.status(404).json({ success: false, message: 'Not found' }),
}));

jest.mock('../services/caching', () => ({
  cacheOTP: jest.fn().mockResolvedValue(true),
  getCachedOTP: jest.fn().mockResolvedValue(null),
  invalidateOTP: jest.fn().mockResolvedValue(true),
  cacheMiddleware: () => (req, res, next) => next(),
}));

jest.mock('../services/notifications', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendOTP: jest.fn().mockResolvedValue({ success: true }),
    sendBookingConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendBookingCancellation: jest.fn().mockResolvedValue({ success: true }),
    sendPaymentConfirmation: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { User, UserRole, UserWallet } = require('../models');
      
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 1,
        phone_number: '9841123456',
        full_name: 'Ram Bahadur',
        email: 'ram@example.com',
        status: 'ACTIVE',
      });
      UserRole.create.mockResolvedValue({});
      UserWallet.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          phone_number: '9841123456',
          full_name: 'Ram Bahadur',
          password: 'password123',
          email: 'ram@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone_number).toBe('9841123456');
      expect(res.body.data.token).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      const { User } = require('../models');
      
      User.findOne.mockResolvedValue({ id: 1, phone_number: '9841123456' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          phone_number: '9841123456',
          full_name: 'Ram Bahadur',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const { User } = require('../models');
      
      User.findOne.mockResolvedValue({
        id: 1,
        phone_number: '9841123456',
        password: '$2a$10$hashedpassword',
        status: 'ACTIVE',
        full_name: 'Ram Bahadur',
        roles: [{ role: 'CUSTOMER', is_active: true }],
      });

      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone_number: '9841123456',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      bcrypt.compare.mockRestore();
    });

    it('should return 401 for invalid credentials', async () => {
      const { User } = require('../models');
      
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone_number: '9841123456',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if no phone number provided', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should return user data for valid token', async () => {
      const { User } = require('../models');
      
      User.findByPk.mockResolvedValue({
        id: 1,
        phone_number: '9841123456',
        full_name: 'Ram Bahadur',
        email: 'ram@example.com',
        status: 'ACTIVE',
        roles: [{ role: 'CUSTOMER', is_active: true }],
      });

      const res = await request(app)
        .get('/api/auth/verify');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone_number).toBe('9841123456');
    });
  });
});
