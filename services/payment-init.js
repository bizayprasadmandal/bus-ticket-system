const { PaymentGatewayFactory } = require('./payment-gateways');
const { UserWallet, WalletTransaction } = require('../models');

function getBaseUrl() {
  return process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

// Build gateway payment_url for a PENDING Payment record (booking or top-up)
async function initiateGatewayForPayment({ payment, paymentMethod, amount, orderRef, orderName, user }) {
  const baseUrl = getBaseUrl();

  switch (paymentMethod) {
    case 'ESEWA': {
      try {
        const esewa = PaymentGatewayFactory.getGateway('ESEWA');
        return {
          success: true,
          payment_url: esewa.generatePaymentURL({
            amount,
            tax_amount: 0,
            product_code: orderRef,
            success_url: `${baseUrl}/api/payments/${payment.id}/verify?gateway=ESEWA`,
            failure_url: `${baseUrl}/api/payments/${payment.id}/verify?gateway=ESEWA&status=failed`,
          }),
          transaction_id: null,
        };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }
    case 'KHALTI': {
      try {
        const khalti = PaymentGatewayFactory.getGateway('KHALTI');
        const khaltiResult = await khalti.initiatePayment({
          return_url: `${baseUrl}/api/payments/${payment.id}/verify?gateway=KHALTI`,
          website_url: process.env.WEBSITE_URL || baseUrl,
          amount,
          purchase_order_id: orderRef,
          purchase_order_name: orderName,
          customer_info: {
            name: user.full_name || 'Customer',
            email: user.email || '',
            phone: user.phone_number,
          },
        });
        return {
          success: khaltiResult.success,
          payment_url: khaltiResult.payment_url || null,
          transaction_id: khaltiResult.pidx || null,
          message: khaltiResult.message,
        };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }
    case 'CONNECTIPS': {
      try {
        const connectips = PaymentGatewayFactory.getGateway('CONNECTIPS');
        connectips.generatePaymentRequest({
          amount,
          reference_id: orderRef,
          remarks: orderName,
        });
        return {
          success: true,
          payment_url: `${connectips.baseUrl}/connectipswebws/api/creditor/purchase`,
          transaction_id: null,
        };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }
    default:
      return { success: false, message: 'Unsupported payment method' };
  }
}

// Credit wallet after a successful TOPUP payment (must run inside a DB transaction)
async function creditWalletTopup({ payment, transaction }) {
  let wallet = await UserWallet.findOne({
    where: { user_id: payment.user_id },
    transaction,
  });

  if (!wallet) {
    wallet = await UserWallet.create({
      user_id: payment.user_id,
      balance: 0.0,
      total_earned: 0.0,
      total_spent: 0.0,
    }, { transaction });
  }

  const amount = parseFloat(payment.amount);
  await wallet.update({
    balance: parseFloat(wallet.balance) + amount,
    total_earned: parseFloat(wallet.total_earned) + amount,
  }, { transaction });

  await WalletTransaction.create({
    wallet_id: wallet.id,
    transaction_type: 'CREDIT',
    amount: payment.amount,
    description: `Wallet top-up via ${payment.payment_method}`,
    reference_id: payment.id,
    reference_type: 'TOPUP',
  }, { transaction });

  return wallet;
}

module.exports = {
  initiateGatewayForPayment,
  creditWalletTopup,
};
