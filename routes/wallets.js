const express = require('express');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const {
  UserWallet,
  WalletTransaction,
  User,
  Payment,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');
const { initiateGatewayForPayment } = require('../services/payment-init');

const router = express.Router();

const topupRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many top-up attempts, please try again in a few minutes.',
  },
});

// Get wallet balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await UserWallet.findOne({
      where: { user_id: userId },
    });

    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await UserWallet.create({
        user_id: userId,
        balance: 0.00,
        total_earned: 0.00,
        total_spent: 0.00,
      });
    }

    res.json({
      success: true,
      message: 'Wallet balance retrieved successfully',
      data: {
        balance: parseFloat(wallet.balance),
        total_earned: parseFloat(wallet.total_earned),
        total_spent: parseFloat(wallet.total_spent),
        updated_at: wallet.updated_at,
      },
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance',
      error: error.message,
    });
  }
});

// Top up wallet — creates a PENDING TOPUP payment and returns the gateway payment_url
router.post('/topup', authenticateToken, topupRateLimiter, async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const userId = req.user.id;

    const topupAmount = parseFloat(amount);
    if (!Number.isFinite(topupAmount) || topupAmount < 10 || topupAmount > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be between NPR 10 and NPR 100,000',
      });
    }

    const methodMap = {
      esewa: 'ESEWA',
      khalti: 'KHALTI',
      ESEWA: 'ESEWA',
      KHALTI: 'KHALTI',
    };
    const paymentMethod = methodMap[payment_method];
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method must be eSewa or Khalti',
      });
    }

    const payment = await Payment.create({
      user_id: userId,
      booking_id: null,
      payment_type: 'TOPUP',
      payment_method: paymentMethod,
      amount: topupAmount.toFixed(2),
      currency: 'NPR',
      status: 'PENDING',
    });

    const paymentResult = await initiateGatewayForPayment({
      payment,
      paymentMethod,
      amount: topupAmount,
      orderRef: `TOPUP_${payment.id}`,
      orderName: `Wallet Top-up NPR ${topupAmount}`,
      user: req.user,
    });

    if (!paymentResult.success || !paymentResult.payment_url) {
      await payment.update({
        status: 'FAILED',
        gateway_response: paymentResult.message || 'Payment initiation failed',
      });
      return res.status(400).json({
        success: false,
        message: paymentResult.message || 'Could not start payment with gateway',
      });
    }

    if (paymentResult.transaction_id) {
      await payment.update({ gateway_transaction_id: paymentResult.transaction_id });
    }

    res.json({
      success: true,
      message: 'Redirecting to payment gateway',
      data: {
        payment_id: payment.id,
        payment_type: 'TOPUP',
        status: 'PENDING',
        payment_method: paymentMethod,
        amount: topupAmount,
        payment_url: paymentResult.payment_url,
      },
    });
  } catch (error) {
    console.error('Wallet topup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start wallet top-up',
      error: error.message,
    });
  }
});

// Get wallet transactions
router.get('/transactions', authenticateToken, commonValidation.pagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Get user's wallet
    const wallet = await UserWallet.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    // Build where clause
    const whereClause = { wallet_id: wallet.id };
    if (type && ['CREDIT', 'DEBIT'].includes(type.toUpperCase())) {
      whereClause.transaction_type = type.toUpperCase();
    }

    const { count, rows: transactions } = await WalletTransaction.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: 'Wallet transactions retrieved successfully',
      data: {
        transactions: transactions.map(txn => ({
          id: txn.id,
          transaction_type: txn.transaction_type,
          amount: parseFloat(txn.amount),
          description: txn.description,
          reference_id: txn.reference_id,
          reference_type: txn.reference_type,
          created_at: txn.created_at,
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet transactions',
      error: error.message,
    });
  }
});

// Transfer money to another wallet (optional feature)
router.post('/transfer', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { recipient_phone, amount, description = 'Wallet transfer' } = req.body;
    const senderId = req.user.id;

    if (!recipient_phone || !amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number and valid amount are required',
      });
    }

    const transferAmount = parseFloat(amount);

    // Find recipient user
    const recipient = await User.findOne({
      where: { phone_number: recipient_phone },
      transaction,
    });

    if (!recipient) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
      });
    }

    if (recipient.id === senderId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to yourself',
      });
    }

    // Get sender wallet
    const senderWallet = await UserWallet.findOne({
      where: { user_id: senderId },
      transaction,
    });

    if (!senderWallet || senderWallet.balance < transferAmount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    // Get or create recipient wallet
    let recipientWallet = await UserWallet.findOne({
      where: { user_id: recipient.id },
      transaction,
    });

    if (!recipientWallet) {
      recipientWallet = await UserWallet.create({
        user_id: recipient.id,
        balance: 0.00,
        total_earned: 0.00,
        total_spent: 0.00,
      }, { transaction });
    }

    // Update sender wallet
    await senderWallet.update({
      balance: senderWallet.balance - transferAmount,
      total_spent: senderWallet.total_spent + transferAmount,
    }, { transaction });

    // Update recipient wallet
    await recipientWallet.update({
      balance: recipientWallet.balance + transferAmount,
      total_earned: recipientWallet.total_earned + transferAmount,
    }, { transaction });

    // Create transaction records
    await WalletTransaction.create({
      wallet_id: senderWallet.id,
      transaction_type: 'DEBIT',
      amount: transferAmount,
      description: `Transfer to ${recipient_phone}: ${description}`,
      reference_id: recipient.id,
      reference_type: 'TOPUP',
    }, { transaction });

    await WalletTransaction.create({
      wallet_id: recipientWallet.id,
      transaction_type: 'CREDIT',
      amount: transferAmount,
      description: `Transfer from ${req.user.phone_number}: ${description}`,
      reference_id: senderId,
      reference_type: 'TOPUP',
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        amount: transferAmount,
        recipient: {
          phone_number: recipient.phone_number,
          full_name: recipient.full_name,
        },
        sender_new_balance: parseFloat(senderWallet.balance) - transferAmount,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Wallet transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer money',
      error: error.message,
    });
  }
});

// Get transaction details
router.get('/transactions/:id', authenticateToken, commonValidation.idParam, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get user's wallet
    const wallet = await UserWallet.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const transaction = await WalletTransaction.findOne({
      where: {
        id,
        wallet_id: wallet.id,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      message: 'Transaction details retrieved successfully',
      data: {
        transaction: {
          id: transaction.id,
          transaction_type: transaction.transaction_type,
          amount: parseFloat(transaction.amount),
          description: transaction.description,
          reference_id: transaction.reference_id,
          reference_type: transaction.reference_type,
          created_at: transaction.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction details',
      error: error.message,
    });
  }
});

module.exports = router;