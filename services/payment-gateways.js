const crypto = require('crypto');
const axios = require('axios');

class EsewaService {
  constructor() {
    this.merchantCode = process.env.ESEWA_MERCHANT_CODE;
    this.secretKey = process.env.ESEWA_SECRET_KEY;
    this.baseUrl = process.env.ESEWA_BASE_URL || (process.env.NODE_ENV === 'production'
      ? 'https://epay.esewa.com.np/epay/main'
      : 'https://rc-epay.esewa.com.np/epay/main');
  }

  // eSewa v1 checkout page - eSewa ignores payment params served on the bare host,
  // so the URL must always point at /epay/main
  getPaymentBaseUrl() {
    const url = (this.baseUrl || '').replace(/\/+$/, '');
    return url.endsWith('/epay/main') ? url : `${url}/epay/main`;
  }

  // v1 transaction verification (transrec) lives on a different host than checkout:
  // rc-epay.esewa.com.np -> rc.esewa.com.np, epay.esewa.com.np -> esewa.com.np
  getVerifyBaseUrl() {
    if (process.env.ESEWA_VERIFY_URL) {
      return process.env.ESEWA_VERIFY_URL.replace(/\/+$/, '');
    }
    return this.baseUrl
      .replace(/\/epay\/main\/?$/, '')
      .replace('//rc-epay.', '//rc.')
      .replace('//epay.', '//');
  }

  // Generate payment URL for eSewa
  generatePaymentURL(paymentData) {
    const {
      amount,
      tax_amount = 0,
      service_charge = 0,
      delivery_charge = 0,
      product_code,
      success_url,
      failure_url,
    } = paymentData;

    const totalAmount = parseFloat(amount) + parseFloat(tax_amount) + 
                       parseFloat(service_charge) + parseFloat(delivery_charge);

    const params = new URLSearchParams({
      amt: amount,
      tax_amt: tax_amount,
      srv_charge: service_charge,
      del_chrg: delivery_charge,
      tAmt: totalAmount,
      pid: product_code,
      scd: this.merchantCode,
      su: success_url,
      fu: failure_url,
    });

    return `${this.getPaymentBaseUrl()}?${params.toString()}`;
  }

  // Verify payment with eSewa
  async verifyPayment(verificationData) {
    try {
      const {
        amt,
        rid, // Reference ID from eSewa
        pid, // Product ID
      } = verificationData;

      const verifyUrl = `${this.getVerifyBaseUrl()}/epay/transrec`;
      
      const params = new URLSearchParams({
        amt,
        rid,
        pid,
        scd: this.merchantCode,
      });

      const response = await axios.post(verifyUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      // eSewa returns XML response
      const responseText = response.data;
      
      if (responseText.includes('<response_code>Success</response_code>')) {
        return {
          success: true,
          transaction_id: rid,
          amount: parseFloat(amt),
          message: 'Payment verified successfully',
          raw_response: responseText,
        };
      } else {
        return {
          success: false,
          message: 'Payment verification failed',
          raw_response: responseText,
        };
      }
    } catch (error) {
      console.error('eSewa verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      };
    }
  }

  // eSewa ePay v2: verify the base64-encoded signed response passed to success/failure URLs
  async verifyV2Response(dataParam) {
    try {
      const decoded = JSON.parse(Buffer.from(dataParam, 'base64').toString('utf8'));
      const {
        transaction_code,
        status,
        total_amount,
        transaction_uuid,
        product_code,
        signed_field_names,
        signature,
      } = decoded;

      // Verify the response signature (HMAC-SHA256 over signed fields, in declared order)
      if (signed_field_names && signature && this.secretKey) {
        const message = signed_field_names
          .split(',')
          .map((field) => `${field}=${decoded[field]}`)
          .join(',');
        const expected = this.generateSignature(message);
        if (expected !== signature) {
          return {
            success: false,
            message: 'eSewa response signature mismatch',
            raw_response: decoded,
          };
        }
      }

      if (status !== 'COMPLETE') {
        return {
          success: false,
          status,
          message: `eSewa status: ${status}`,
          raw_response: decoded,
        };
      }

      // Cross-check with eSewa's status check API before trusting the redirect
      let refId = transaction_code;
      try {
        const statusUrl = `${this.getVerifyBaseUrl()}/api/epay/transaction/status/` +
          `?product_code=${encodeURIComponent(product_code)}` +
          `&total_amount=${encodeURIComponent(total_amount)}` +
          `&transaction_uuid=${encodeURIComponent(transaction_uuid)}`;
        const res = await axios.get(statusUrl, { timeout: 30000 });
        if (res.data && res.data.status && res.data.status !== 'COMPLETE') {
          return {
            success: false,
            status: res.data.status,
            message: `eSewa status check: ${res.data.status}`,
            raw_response: res.data,
          };
        }
        if (res.data && res.data.ref_id) refId = res.data.ref_id;
      } catch (statusErr) {
        console.error('eSewa status check error:', statusErr.message);
        // Status check unreachable: proceed with the signed redirect response
      }

      return {
        success: true,
        transaction_id: refId,
        amount: parseFloat(total_amount),
        message: 'Payment verified successfully',
        raw_response: decoded,
      };
    } catch (error) {
      console.error('eSewa v2 verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      };
    }
  }

  // Generate signature for API calls
  generateSignature(message) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }
}

class KhaltiService {
  constructor() {
    this.secretKey = process.env.KHALTI_SECRET_KEY;
    this.publicKey = process.env.KHALTI_PUBLIC_KEY;
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://khalti.com/api/v2'
      : 'https://a.khalti.com/api/v2';
  }

  // Initiate payment with Khalti
  async initiatePayment(paymentData) {
    try {
      const {
        return_url,
        website_url,
        amount, // Amount in paisa (NPR * 100)
        purchase_order_id,
        purchase_order_name,
        customer_info,
      } = paymentData;

      const payload = {
        return_url,
        website_url,
        amount: Math.round(amount * 100), // Convert to paisa
        purchase_order_id,
        purchase_order_name,
        customer_info: {
          name: customer_info.name,
          email: customer_info.email,
          phone: customer_info.phone,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/epayment/initiate/`,
        payload,
        {
          headers: {
            'Authorization': `Key ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data && response.data.payment_url) {
        return {
          success: true,
          payment_url: response.data.payment_url,
          pidx: response.data.pidx,
          expires_at: response.data.expires_at,
        };
      } else {
        return {
          success: false,
          message: 'Failed to initiate payment',
          error: response.data,
        };
      }
    } catch (error) {
      console.error('Khalti initiation error:', error);
      return {
        success: false,
        message: 'Payment initiation failed',
        error: error.response?.data || error.message,
      };
    }
  }

  // Verify payment with Khalti
  async verifyPayment(pidx) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/epayment/lookup/`,
        { pidx },
        {
          headers: {
            'Authorization': `Key ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const paymentData = response.data;

      if (paymentData.status === 'Completed') {
        return {
          success: true,
          transaction_id: paymentData.transaction_id,
          amount: paymentData.total_amount / 100, // Convert from paisa to NPR
          status: paymentData.status,
          fee: paymentData.fee / 100,
          refunded: paymentData.refunded,
          purchase_order_id: paymentData.purchase_order_id,
          raw_response: paymentData,
        };
      } else {
        return {
          success: false,
          status: paymentData.status,
          message: `Payment status: ${paymentData.status}`,
          raw_response: paymentData,
        };
      }
    } catch (error) {
      console.error('Khalti verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
        error: error.response?.data || error.message,
      };
    }
  }

  // Refund payment
  async refundPayment(refundData) {
    try {
      const {
        pidx,
        amount, // Amount in NPR
        remarks = 'Booking cancellation refund',
      } = refundData;

      const response = await axios.post(
        `${this.baseUrl}/epayment/refund/`,
        {
          pidx,
          amount: Math.round(amount * 100), // Convert to paisa
          remarks,
        },
        {
          headers: {
            'Authorization': `Key ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        refund_id: response.data.idx,
        amount: response.data.amount / 100,
        status: response.data.status,
        raw_response: response.data,
      };
    } catch (error) {
      console.error('Khalti refund error:', error);
      return {
        success: false,
        message: 'Refund failed',
        error: error.response?.data || error.message,
      };
    }
  }
}

class ConnectIPSService {
  constructor() {
    this.merchantId = process.env.CONNECTIPS_MERCHANT_ID;
    this.appId = process.env.CONNECTIPS_APP_ID;
    this.appName = process.env.CONNECTIPS_APP_NAME;
    this.txnPassword = process.env.CONNECTIPS_TXN_PASSWORD;
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://payment.connectips.com:7443/connectipswebws'
      : 'https://testpayment.connectips.com:7443/connectipswebws';
  }

  // Generate payment request for ConnectIPS
  generatePaymentRequest(paymentData) {
    const {
      amount,
      reference_id,
      remarks = 'Bus booking payment',
    } = paymentData;

    // Generate token for ConnectIPS
    const token = this.generateToken(amount, reference_id);

    return {
      MERCHANTID: this.merchantId,
      APPID: this.appId,
      APPNAME: this.appName,
      TXNID: reference_id,
      TXNDATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      TXNAMT: amount,
      REFERENCEID: reference_id,
      REMARKS: remarks,
      PARTICULARS: 'Bus Booking',
      TOKEN: token,
      TXNCURRENCY: 'NPR',
    };
  }

  // Generate token for ConnectIPS authentication
  generateToken(amount, referenceId) {
    const message = `${this.appId},${this.merchantId},${referenceId},${amount},NPR`;
    const hash = crypto.createHash('sha256').update(message + this.txnPassword).digest('hex');
    return hash.toUpperCase();
  }

  // Verify payment status
  async verifyPayment(transactionId) {
    try {
      const token = this.generateVerificationToken(transactionId);
      
      const response = await axios.post(
        `${this.baseUrl}/api/creditor/validatetxn`,
        {
          MERCHANTID: this.merchantId,
          APPID: this.appId,
          REFERENCEID: transactionId,
          TOKEN: token,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const result = response.data;

      if (result.STATUS === 'SUCCESS') {
        return {
          success: true,
          transaction_id: result.TXNID,
          amount: parseFloat(result.TXNAMT),
          status: result.STATUS,
          bank_ref: result.REFSTAN,
          raw_response: result,
        };
      } else {
        return {
          success: false,
          status: result.STATUS,
          message: result.MESSAGE,
          raw_response: result,
        };
      }
    } catch (error) {
      console.error('ConnectIPS verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      };
    }
  }

  generateVerificationToken(referenceId) {
    const message = `${this.appId},${this.merchantId},${referenceId}`;
    const hash = crypto.createHash('sha256').update(message + this.txnPassword).digest('hex');
    return hash.toUpperCase();
  }
}

// Factory pattern for payment services
class PaymentGatewayFactory {
  static getGateway(gatewayType) {
    switch (gatewayType.toUpperCase()) {
      case 'ESEWA':
        return new EsewaService();
      case 'KHALTI':
        return new KhaltiService();
      case 'CONNECTIPS':
        return new ConnectIPSService();
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayType}`);
    }
  }
}

module.exports = {
  EsewaService,
  KhaltiService,
  ConnectIPSService,
  PaymentGatewayFactory,
};