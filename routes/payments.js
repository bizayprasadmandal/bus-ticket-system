const express = require('express');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const {
  Payment,
  Booking,
  User,
  UserWallet,
  WalletTransaction,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { paymentValidation, commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const { PaymentGatewayFactory } = require('../services/payment-gateways');
const { NotificationService } = require('../services/notifications');

const notificationService = new NotificationService();

const router = express.Router();

// Initiate payment
router.post('/', authenticateToken, paymentValidation.initiate, handleValidationErrors, async (req, res) => {
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
      case 'WALLET':
        // Handle wallet payment
        const wallet = await UserWallet.findOne({ where: { user_id: userId } });
        if (!wallet || wallet.balance < amount) {
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
        // Return payment URL for redirect (in real implementation)
        payment_url: paymentResult.success ? `/api/payments/${payment.id}/verify` : null,
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
});

// Verify payment
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
          where: { user_id: userId },
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
    const bookingPaymentStatus = verificationResult.success ? 'COMPLETED' : 'FAILED';
    const bookingStatus = verificationResult.success ? 'CONFIRMED' : payment.booking.booking_status;

    await payment.update({
      status: paymentStatus,
      gateway_transaction_id: verificationResult.transaction_id,
      gateway_response: verificationResult.raw_response || verificationResult.gateway_response,
    }, { transaction });

    await payment.booking.update({
      payment_status: bookingPaymentStatus,
      booking_status: bookingStatus,
    }, { transaction });

    await transaction.commit();

    // Send payment confirmation notification (non-blocking)
    if (verificationResult.success) {
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
        booking_status: bookingPaymentStatus,
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
          where: { user_id: userId },
        },
      ],
    });

    if (!payment) {
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
          payment_method: payment.payment_method,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          gateway_transaction_id: payment.gateway_transaction_id,
          created_at: payment.created_at,
          booking: {
            pnr: payment.booking.pnr,
            total_amount: payment.booking.total_amount,
            payment_status: payment.booking.payment_status,
          },
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