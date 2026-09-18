const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Send booking confirmation email
  async sendBookingConfirmation(booking, user) {
    try {
      const emailContent = this.generateBookingConfirmationEmail(booking);
      
      const mailOptions = {
        from: `"Samaya Deluxe" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: `Booking Confirmation - PNR: ${booking.pnr}`,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Booking confirmation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send booking cancellation email
  async sendBookingCancellation(booking, user, refundAmount) {
    try {
      const emailContent = this.generateBookingCancellationEmail(booking, refundAmount);
      
      const mailOptions = {
        from: `"Samaya Deluxe" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: `Booking Cancelled - PNR: ${booking.pnr}`,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Booking cancellation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending booking cancellation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(payment, booking, user) {
    try {
      const emailContent = this.generatePaymentConfirmationEmail(payment, booking);
      
      const mailOptions = {
        from: `"Samaya Deluxe" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: `Payment Confirmed - PNR: ${booking.pnr}`,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Payment confirmation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate booking confirmation email template
  generateBookingConfirmationEmail(booking) {
    const trip = booking.trip;
    const route = trip.route;
    const passengers = booking.passengers || [];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .passenger-list { margin: 15px 0; }
          .passenger { background-color: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 3px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚌 Samaya Deluxe</h1>
            <h2>Booking Confirmation</h2>
          </div>
          
          <div class="content">
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>PNR:</strong> ${booking.pnr}</p>
              <p><strong>Booking Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${booking.booking_status}</p>
              <p><strong>Total Amount:</strong> NPR ${booking.total_amount}</p>
            </div>

            <div class="booking-details">
              <h3>Trip Information</h3>
              <p><strong>Route:</strong> ${route.origin_city} → ${route.destination_city}</p>
              <p><strong>Date:</strong> ${trip.trip_date}</p>
              <p><strong>Departure:</strong> ${trip.departure_time}</p>
              <p><strong>Arrival:</strong> ${trip.arrival_time}</p>
              <p><strong>Bus Number:</strong> ${trip.bus.bus_number}</p>
              <p><strong>Bus Type:</strong> ${trip.bus.bus_type}</p>
            </div>

            <div class="passenger-list">
              <h3>Passengers</h3>
              ${passengers.map(passenger => `
                <div class="passenger">
                  <strong>${passenger.passenger_name}</strong> (${passenger.age} years, ${passenger.gender})<br>
                  Seat: ${passenger.seat_number} | ID: ${passenger.id_type} - ${passenger.id_number}
                </div>
              `).join('')}
            </div>

            <div class="booking-details">
              <h3>Important Information</h3>
              <ul>
                <li>Please arrive at the departure point 30 minutes before departure time</li>
                <li>Carry a valid ID proof for all passengers</li>
                <li>Contact us at ${process.env.SUPPORT_PHONE} for any queries</li>
                <li>Cancellation charges may apply as per our policy</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing Samaya Deluxe!</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate booking cancellation email template
  generateBookingCancellationEmail(booking, refundAmount) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚌 Samaya Deluxe</h1>
            <h2>Booking Cancelled</h2>
          </div>
          
          <div class="content">
            <div class="booking-details">
              <h3>Cancellation Details</h3>
              <p><strong>PNR:</strong> ${booking.pnr}</p>
              <p><strong>Original Amount:</strong> NPR ${booking.total_amount}</p>
              <p><strong>Refund Amount:</strong> NPR ${refundAmount}</p>
              <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="booking-details">
              <h3>Refund Information</h3>
              <p>Your refund will be processed within 3-5 business days.</p>
              <p>The refunded amount will be credited to your original payment method or wallet.</p>
            </div>
          </div>

          <div class="footer">
            <p>We're sorry to see you go. Thank you for considering Samaya Deluxe!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate payment confirmation email template
  generatePaymentConfirmationEmail(payment, booking) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .payment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚌 Samaya Deluxe</h1>
            <h2>Payment Confirmed</h2>
          </div>
          
          <div class="content">
            <div class="payment-details">
              <h3>Payment Details</h3>
              <p><strong>PNR:</strong> ${booking.pnr}</p>
              <p><strong>Payment Method:</strong> ${payment.payment_method}</p>
              <p><strong>Amount Paid:</strong> NPR ${payment.amount}</p>
              <p><strong>Transaction ID:</strong> ${payment.gateway_transaction_id}</p>
              <p><strong>Payment Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</p>
            </div>

            <div class="payment-details">
              <p>Your booking is now confirmed and your seats are reserved.</p>
              <p>You will receive your e-tickets shortly.</p>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your payment!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

class SMSService {
  constructor() {
    // Twilio configuration (lazy init to avoid crash with placeholder credentials)
    this.twilioClient = null;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Sparrow SMS configuration (Popular in Nepal)
    this.sparrowToken = process.env.SPARROW_SMS_TOKEN;
    this.sparrowFrom = process.env.SPARROW_SMS_FROM || 'SamayaDlx';
  }

  // Send SMS via Twilio
  async sendViaTwilio(to, message) {
    try {
      if (!this.twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      }
      if (!this.twilioClient) {
        return { success: false, error: 'Twilio not configured' };
      }
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: to,
      });

      console.log(`SMS sent via Twilio: ${result.sid}`);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS via Sparrow (Nepal)
  async sendViaSparrow(to, message) {
    try {
      const response = await axios.post('https://sms.aakashsms.com/sms/v3/send', {
        auth_token: this.sparrowToken,
        to: to,
        text: message,
        from: this.sparrowFrom,
      });

      if (response.data.response_code === 'OK') {
        console.log(`SMS sent via Sparrow: ${response.data.message_id}`);
        return { success: true, messageId: response.data.message_id };
      } else {
        return { success: false, error: response.data.error_message };
      }
    } catch (error) {
      console.error('Sparrow SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send booking confirmation SMS
  async sendBookingConfirmation(booking, user) {
    const message = `Samaya Deluxe: Booking confirmed! PNR: ${booking.pnr}, ${booking.trip.route.origin_city} to ${booking.trip.route.destination_city}, Date: ${booking.trip.trip_date}, Time: ${booking.trip.departure_time}. Amount: NPR ${booking.total_amount}`;

    // Try Sparrow first (for Nepal), fallback to Twilio
    let result = await this.sendViaSparrow(user.phone_number, message);
    
    if (!result.success && this.twilioClient) {
      result = await this.sendViaTwilio(user.phone_number, message);
    }

    return result;
  }

  // Send booking cancellation SMS
  async sendBookingCancellation(booking, user, refundAmount) {
    const message = `Samaya Deluxe: Booking ${booking.pnr} cancelled. Refund amount NPR ${refundAmount} will be processed in 3-5 days. Contact: ${process.env.SUPPORT_PHONE}`;

    let result = await this.sendViaSparrow(user.phone_number, message);
    
    if (!result.success && this.twilioClient) {
      result = await this.sendViaTwilio(user.phone_number, message);
    }

    return result;
  }

  // Send payment confirmation SMS
  async sendPaymentConfirmation(payment, booking, user) {
    const message = `Samaya Deluxe: Payment confirmed! PNR: ${booking.pnr}, Amount: NPR ${payment.amount}, Transaction ID: ${payment.gateway_transaction_id}. Your seats are reserved!`;

    let result = await this.sendViaSparrow(user.phone_number, message);
    
    if (!result.success && this.twilioClient) {
      result = await this.sendViaTwilio(user.phone_number, message);
    }

    return result;
  }

  // Send OTP SMS
  async sendOTP(phoneNumber, otp) {
    const message = `Your Samaya Deluxe verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

    let result = await this.sendViaSparrow(phoneNumber, message);
    
    if (!result.success && this.twilioClient) {
      result = await this.sendViaTwilio(phoneNumber, message);
    }

    return result;
  }

  // Send trip reminder SMS
  async sendTripReminder(booking, user, hoursBeforeDeparture) {
    const trip = booking.trip;
    const message = `Samaya Deluxe Reminder: Your trip PNR ${booking.pnr} departs in ${hoursBeforeDeparture} hours. ${trip.route.origin_city} to ${trip.route.destination_city} at ${trip.departure_time}. Arrive 30 mins early!`;

    let result = await this.sendViaSparrow(user.phone_number, message);
    
    if (!result.success && this.twilioClient) {
      result = await this.sendViaTwilio(user.phone_number, message);
    }

    return result;
  }
}

// Notification service that coordinates email and SMS
class NotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  // Send booking confirmation notifications
  async sendBookingConfirmation(booking, user) {
    const results = await Promise.allSettled([
      this.emailService.sendBookingConfirmation(booking, user),
      this.smsService.sendBookingConfirmation(booking, user),
    ]);

    return {
      email: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
      sms: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
    };
  }

  // Send booking cancellation notifications
  async sendBookingCancellation(booking, user, refundAmount) {
    const results = await Promise.allSettled([
      this.emailService.sendBookingCancellation(booking, user, refundAmount),
      this.smsService.sendBookingCancellation(booking, user, refundAmount),
    ]);

    return {
      email: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
      sms: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
    };
  }

  // Send payment confirmation notifications
  async sendPaymentConfirmation(payment, booking, user) {
    const results = await Promise.allSettled([
      this.emailService.sendPaymentConfirmation(payment, booking, user),
      this.smsService.sendPaymentConfirmation(payment, booking, user),
    ]);

    return {
      email: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
      sms: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
    };
  }

  // Send OTP
  async sendOTP(phoneNumber, otp) {
    return await this.smsService.sendOTP(phoneNumber, otp);
  }

  // Send trip reminder
  async sendTripReminder(booking, user, hoursBeforeDeparture) {
    return await this.smsService.sendTripReminder(booking, user, hoursBeforeDeparture);
  }
}

module.exports = {
  EmailService,
  SMSService,
  NotificationService,
};