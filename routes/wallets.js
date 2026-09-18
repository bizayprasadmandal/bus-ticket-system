const express = require('express');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const {
  UserWallet,
  WalletTransaction,
  User,
} = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { commonValidation } = require('../validators');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

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

// Top up wallet
router.post('/topup', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { amount, payment_method = 'CARD' } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    const topupAmount = parseFloat(amount);

    // Get or create wallet
    let wallet = await UserWallet.findOne({
      where: { user_id: userId },
      transaction,
    });

    if (!wallet) {
      wallet = await UserWallet.create({
        user_id: userId,
        balance: 0.00,
        total_earned: 0.00,
        total_spent: 0.00,
      }, { transaction });
    }

    // Simulate payment processing (in real implementation, integrate with payment gateway)
    const isPaymentSuccessful = Math.random() > 0.1; // 90% success rate

    if (!isPaymentSuccessful) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Payment failed. Please try again.',
      });
    }

    // Update wallet balance
    await wallet.update({
      balance: wallet.balance + topupAmount,
      total_earned: wallet.total_earned + topupAmount,
    }, { transaction });

    // Create transaction record
    await WalletTransaction.create({
      wallet_id: wallet.id,
      transaction_type: 'CREDIT',
      amount: topupAmount,
      description: `Wallet top-up via ${payment_method}`,
      reference_type: 'TOPUP',
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        amount: topupAmount,
        new_balance: parseFloat(wallet.balance),
        payment_method,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Wallet topup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to top up wallet',
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