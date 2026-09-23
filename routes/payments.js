const express = require('express');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const {
  Payment,
  Booking,
  User,
  UserWallet,
  WalletTransaction,
  Trip,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { paymentValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const { PaymentGatewayFactory } = require('../services/payment-gateways');
const { NotificationService } = require('../services/notifications');
const { creditWalletTopup } = require('../services/payment-init');

const notificationService = new NotificationService();

const router = express.Router();

// Initiate payment
const initiatePaymentHandler = async (req, res) => {
  try {
    const { booking_id, payment_method, amount } = req.body;
    const userId = req.user.id;

    // Verify booking belongs to user
    const booking = await Booking.findOne({
      where: {
        id: booking_id,
        user_id: userId,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.payment_status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking',
      });
    }

    // Verify amount matches booking total
    if (parseFloat(amount) !== parseFloat(booking.total_amount)) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match booking total',
      });
    }

    // Create payment record
    const payment = await Payment.create({
      booking_id,
      user_id: userId,
      payment_type: 'BOOKING',
      payment_method,
      amount,
      currency: 'NPR',
      status: 'PENDING',
    });

    // Handle different payment methods
    let paymentResult;
    
    switch (payment_method) {
      case 'ESEWA':
        try {
          const esewa = PaymentGatewayFactory.getGateway('ESEWA');
          const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
          paymentResult = {
            success: true,
            payment_url: esewa.generatePaymentURL({
              amount: amount,
              tax_amount: 0,
              product_code: `BOOKING_${booking_id}`,
              success_url: `${baseUrl}/api/payments/${payment.id}/verify?gateway=ESEWA`,
              failure_url: `${baseUrl}/api/payments/${payment.id}/verify?gateway=ESEWA&status=failed`,
            }),
            transaction_id: null,
          };
        } catch (err) {
          paymentResult = { success: false, message: err.message };
        }
        break;
      case 'KHALTI':
        try {
          const khalti = PaymentGatewayFactory.getGateway('KHALTI');
          const khaltiBaseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
          const khaltiResult = await khalti.initiatePayment({
            return_url: `${khaltiBaseUrl}/api/payments/${payment.id}/verify?gateway=KHALTI`,
            website_url: process.env.WEBSITE_URL || khaltiBaseUrl,
            amount: amount,
            purchase_order_id: `BOOKING_${booking_id}`,
            purchase_order_name: `Bus Booking - ${booking.pnr || booking_id}`,
            customer_info: {
              name: req.user.full_name || 'Customer',
              email: req.user.email || '',
              phone: req.user.phone_number,
            },
          });
          paymentResult = {
            success: khaltiResult.success,
            payment_url: khaltiResult.payment_url || null,
            transaction_id: khaltiResult.pidx || null,
          };
        } catch (err) {
          paymentResult = { success: false, message: err.message };
        }
        break;
      case 'CONNECTIPS':
        try {
          const connectips = PaymentGatewayFactory.getGateway('CONNECTIPS');
          const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
          const connectipsRequest = connectips.generatePaymentRequest({
            amount: amount,
            reference_id: `BOOKING_${booking_id}`,
            remarks: `Bus Booking - ${booking.pnr || booking_id}`,
          });
          paymentResult = {
            success: true,
            payment_url: `${connectips.baseUrl}/connectipswebws/api/creditor/purchase`,
            transaction_id: null,
          };
        } catch (err) {
          paymentResult = { success: false, message: err.message };
        }
        break;
      case 'WALLET':
        // Handle wallet payment
        const wallet = await UserWallet.findOne({ where: { user_id: userId } });
        if (!wallet || wallet.balance < amount) {
          await payment.update({
            status: 'FAILED',
            gateway_response: 'Insufficient wallet balance',
          });
          return res.status(400).json({
            success: false,
            message: 'Insufficient wallet balance',
          });
        }
        paymentResult = {
          success: true,
          transaction_id: `wallet_${uuidv4().substr(0, 8)}`,
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method',
        });
    }

    if (!paymentResult.success) {
      // Mark the orphan PENDING payment as FAILED so it can't be verified later
      await payment.update({
        status: 'FAILED',
        gateway_response: paymentResult.message || 'Payment initiation failed',
      });
      return res.status(400).json({
        success: false,
        message: paymentResult.message || 'Payment initiation failed',
      });
    }

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        payment_id: payment.id,
        status: 'PENDING',
        payment_method,
        amount,
        payment_url: paymentResult.payment_url || null,
      },
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message,
    });
  }
};

const initiateMiddleware = [authenticateToken, paymentValidation.initiate, handleValidationErrors];
router.post('/', ...initiateMiddleware, initiatePaymentHandler);
router.post('/initiate', ...initiateMiddleware, initiatePaymentHandler);

// Public callback endpoint for payment gateway redirects (no auth required)
router.get('/:id/callback', async (req, res) => {
  try {
    const { id } = req.params;
    const gateway = req.query.gateway || req.query.payment_method || '';

    // Forward to the frontend callback page with all query params
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const queryParams = new URLSearchParams(req.query).toString();
    res.redirect(`${frontendUrl}/payment/callback/${id}?${queryParams}`);
  } catch (error) {
    console.error('Payment callback redirect error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment/callback/${req.params.id}?error=callback_failed`);
  }
});

// Public verify endpoint for gateway callbacks (no auth - called by gateway redirect)
router.get('/:id/verify', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const payment = await Payment.findOne({
      where: { id },
      include: [{ model: Booking, as: 'booking', required: false }],
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'PENDING') {
      await transaction.rollback();
      // Still redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payment/callback/${id}?status=already_processed`);
    }

    let verificationResult;

    switch (payment.payment_method) {      case 'ESEWA': {
        try {
          const esewa = PaymentGatewayFactory.getGateway('ESEWA');
          const { amt, rid, pid, data } = req.query;
          if (data) {
            // eSewa ePay v2: base64-encoded signed response in the data param
            verificationResult = await esewa.verifyV2Response(data);
          } else if (amt && rid && pid) {
            // eSewa ePay v1 legacy format
            verificationResult = await esewa.verifyPayment({ amt, rid, pid });
          } else {
            verificationResult = { success: false, message: 'Missing eSewa parameters' };
          }
        } catch (err) {
          verificationResult = { success: false, message: err.message };
        }
        break;
      }
      case 'KHALTI': {
        try {
          const khalti = PaymentGatewayFactory.getGateway('KHALTI');
          const { pidx } = req.query;
          if (pidx) {
            verificationResult = await khalti.verifyPayment(pidx);
          } else {
            verificationResult = { success: false, message: 'Missing Khalti pidx' };
          }
        } catch (err) {
          verificationResult = { success: false, message: err.message };
        }
        break;
      }
      case 'CONNECTIPS': {
        try {
          const connectips = PaymentGatewayFactory.getGateway('CONNECTIPS');
          const { TXNID } = req.query;
          if (TXNID) {
            verificationResult = await connectips.verifyPayment(TXNID);
          } else {
            verificationResult = { success: false, message: 'Missing ConnectIPS transaction ID' };
          }
        } catch (err) {
          verificationResult = { success: false, message: err.message };
        }
        break;
      }
      default:
        verificationResult = { success: false, message: 'Unknown payment method' };
    }

    // Validate amount to prevent payment tampering
    if (verificationResult.success && verificationResult.amount) {
      const paidAmount = parseFloat(verificationResult.amount);
      const expectedAmount = parseFloat(payment.amount);
      if (Math.abs(paidAmount - expectedAmount) > 0.01) {
        verificationResult = {
          success: false,
          message: `Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`,
        };
      }
    }

    const paymentStatus = verificationResult.success ? 'SUCCESS' : 'FAILED';
    const isTopup = payment.payment_type === 'TOPUP';

    await payment.update({
      status: paymentStatus,
      gateway_transaction_id: verificationResult.transaction_id,
      gateway_response: verificationResult.raw_response || verificationResult.gateway_response,
    }, { transaction });

    if (isTopup) {
      if (verificationResult.success) {
        await creditWalletTopup({ payment, transaction });
      }
    } else if (payment.booking) {
      const bookingPaymentStatus = verificationResult.success ? 'COMPLETED' : 'FAILED';
      const bookingStatus = verificationResult.success ? 'CONFIRMED' : payment.booking.booking_status;

      await payment.booking.update({
        payment_status: bookingPaymentStatus,
        booking_status: bookingStatus,
      }, { transaction });

      // Release seats back if payment failed
      if (!verificationResult.success) {
        const trip = await Trip.findByPk(payment.booking.trip_id, { transaction });
        if (trip) {
          await trip.update({
            available_seats: trip.available_seats + payment.booking.total_passengers,
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    // Send notification (non-blocking) — booking payments only
    if (verificationResult.success && payment.booking) {
      const user = await User.findByPk(payment.booking.user_id);
      if (user) {
        notificationService.sendPaymentConfirmation(payment, payment.booking, user).catch(err => {
          console.error('Failed to send payment notification:', err.message);
        });
      }
    }

    // Redirect to frontend callback page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const status = verificationResult.success ? 'success' : 'failed';
    res.redirect(`${frontendUrl}/payment/callback/${id}?status=${status}`);
  } catch (error) {
    await transaction.rollback();
    console.error('Verify payment callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment/callback/${req.params.id}?error=verification_failed`);
  }
});

// Verify payment (POST - for frontend-initiated verification with auth)
router.post('/:id/verify', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id },
      include: [
        {
          model: Booking,
          as: 'booking',
          required: false,
        },
      ],
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    const isTopup = payment.payment_type === 'TOPUP';
    const owned = isTopup
      ? payment.user_id === userId
      : payment.booking && payment.booking.user_id === userId;
    if (!owned) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'PENDING') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Payment already processed',
      });
    }

    // Verify payment with gateway
    let verificationResult;
    
    switch (payment.payment_method) {
      case 'ESEWA':
        try {
          const esewa = PaymentGatewayFactory.getGateway('ESEWA');
          const { amt, rid, pid } = req.query;
          if (amt && rid && pid) {
            verificationResult = await esewa.verifyPayment({ amt, rid, pid });
          } else {
            verificationResult = { success: false, message: 'Missing eSewa verification parameters' };
          }
        } catch (err) {
          verificationResult = { success: false, message: err.message };
        }
        break;
      case 'KHALTI':
        try {
          const khalti = PaymentGatewayFactory.getGateway('KHALTI');
          const { pidx } = req.query;
          if (pidx) {
            verificationResult = await khalti.verifyPayment(pidx);
          } else {
            verificationResult = { success: false, message: 'Missing Khalti pidx parameter' };
          }
        } catch (err) {
          verificationResult = { success: false, message: err.message };
        }
        break;
      case 'CONNECTIPS':
        try {
          const connectips = PaymentGatewayFactory.getGateway('CONNECTIPS');
          const { TXNID } = req.query;
          if (TXNID) {
            verificationResult = await connectips.verifyPayment(TXNID);
          } else {
            verificationResult = { success: false, message: 'Missing ConnectIPS transaction ID' };
          }
        } catch (err) {
          verificationResult = { success: false, message: err.message };
        }
        break;
      case 'WALLET':
        // Process wallet payment
        const wallet = await UserWallet.findOne({ 
          where: { user_id: userId },
          transaction 
        });
        
        if (!wallet || wallet.balance < payment.amount) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Insufficient wallet balance',
          });
        }

        // Deduct from wallet
        await wallet.update({
          balance: wallet.balance - payment.amount,
          total_spent: wallet.total_spent + payment.amount,
        }, { transaction });

        // Create wallet transaction
        await WalletTransaction.create({
          wallet_id: wallet.id,
          transaction_type: 'DEBIT',
          amount: payment.amount,
          description: `Payment for booking ${payment.booking.pnr}`,
          reference_id: payment.booking_id,
          reference_type: 'BOOKING',
        }, { transaction });

        verificationResult = { success: true };
        break;
      default:
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method',
        });
    }

    // Update payment status based on verification
    const paymentStatus = verificationResult.success ? 'SUCCESS' : 'FAILED';

    await payment.update({
      status: paymentStatus,
      gateway_transaction_id: verificationResult.transaction_id,
      gateway_response: verificationResult.raw_response || verificationResult.gateway_response,
    }, { transaction });

    if (isTopup) {
      if (verificationResult.success) {
        await creditWalletTopup({ payment, transaction });
      }
      await transaction.commit();

      res.json({
        success: verificationResult.success,
        message: verificationResult.success
          ? 'Wallet topped up successfully'
          : 'Top-up payment failed',
        data: {
          payment_id: payment.id,
          payment_type: 'TOPUP',
          status: paymentStatus,
          amount: parseFloat(payment.amount),
          transaction_id: verificationResult.transaction_id,
        },
      });
      return;
    }

    if (payment.booking) {
      const bookingPaymentStatus = verificationResult.success ? 'COMPLETED' : 'FAILED';
      const bookingStatus = verificationResult.success ? 'CONFIRMED' : payment.booking.booking_status;

      await payment.booking.update({
        payment_status: bookingPaymentStatus,
        booking_status: bookingStatus,
      }, { transaction });
    }

    await transaction.commit();

    // Send payment confirmation notification (non-blocking)
    if (verificationResult.success && payment.booking) {
      const user = await User.findByPk(userId);
      if (user) {
        notificationService.sendPaymentConfirmation(payment, payment.booking, user).catch(err => {
          console.error('Failed to send payment notification:', err.message);
        });
      }
    }

    res.json({
      success: verificationResult.success,
      message: verificationResult.success ? 'Payment completed successfully' : 'Payment failed',
      data: {
        payment_id: payment.id,
        status: paymentStatus,
        booking_status: payment.booking
          ? (verificationResult.success ? 'COMPLETED' : 'FAILED')
          : null,
        transaction_id: verificationResult.transaction_id,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message,
    });
  }
});

// Get payment details
router.get('/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id },
      include: [
        {
          model: Booking,
          as: 'booking',
          required: false,
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    const isTopup = payment.payment_type === 'TOPUP';
    const owned = isTopup
      ? payment.user_id === userId
      : payment.booking && payment.booking.user_id === userId;
    if (!owned) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: {
        payment: {
          id: payment.id,
          booking_id: payment.booking_id,
          payment_type: payment.payment_type,
          payment_method: payment.payment_method,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          gateway_transaction_id: payment.gateway_transaction_id,
          created_at: payment.created_at,
          booking: payment.booking
            ? {
                pnr: payment.booking.pnr,
                total_amount: payment.booking.total_amount,
                payment_status: payment.booking.payment_status,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details',
      error: error.message,
    });
  }
});

// Get user's payment history
router.get('/', authenticateToken, commonValidation.pagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const { count, rows: payments } = await Payment.findAndCountAll({
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { user_id: userId },
          attributes: ['pnr', 'total_amount', 'payment_status'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: {
        payments,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message,
    });
  }
});

module.exports = router;