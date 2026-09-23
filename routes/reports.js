const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ReportingService = require('../services/reporting');

const router = express.Router();
const reportingService = new ReportingService();

// Get booking report
router.get('/bookings', authenticateToken, requireRole(['SUPER_ADMIN', 'OPERATOR']), async (req, res) => {
  try {
    const { start_date, end_date, date_from, date_to, operator_id, booking_status, payment_status, format = 'json' } = req.query;

    const filters = {
      start_date: start_date || date_from,
      end_date: end_date || date_to,
      booking_status,
      payment_status,
      format,
    };

    // Operators can only see their own data
    if (req.user.roles?.some(r => r.role === 'OPERATOR')) {
      const operatorRole = req.user.roles.find(r => r.role === 'OPERATOR');
      filters.operator_id = operatorRole.operator_id;
    } else if (operator_id) {
      filters.operator_id = operator_id;
    }

    const report = await reportingService.generateBookingReport(filters);

    if (format === 'excel') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(Buffer.from(report.buffer));
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(report.buffer);
    }

    res.json({
      success: true,
      message: 'Booking report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Generate booking report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate booking report',
      error: error.message,
    });
  }
});

// Get revenue report
router.get('/revenue', authenticateToken, requireRole(['SUPER_ADMIN', 'OPERATOR']), async (req, res) => {
  try {
    const { start_date, end_date, date_from, date_to, operator_id, group_by = 'day', format = 'json' } = req.query;

    const filters = {
      start_date: start_date || date_from,
      end_date: end_date || date_to,
      group_by,
      format,
    };

    if (req.user.roles?.some(r => r.role === 'OPERATOR')) {
      const operatorRole = req.user.roles.find(r => r.role === 'OPERATOR');
      filters.operator_id = operatorRole.operator_id;
    } else if (operator_id) {
      filters.operator_id = operator_id;
    }

    const report = await reportingService.generateRevenueReport(filters);

    if (format === 'excel') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(Buffer.from(report.buffer));
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(report.buffer);
    }

    res.json({
      success: true,
      message: 'Revenue report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Generate revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report',
      error: error.message,
    });
  }
});

// Get operator performance report (admin only)
router.get('/operators', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { start_date, end_date, date_from, date_to, operator_id, format = 'json' } = req.query;

    const report = await reportingService.generateOperatorReport({
      start_date: start_date || date_from,
      end_date: end_date || date_to,
      operator_id,
      format,
    });

    if (format === 'excel') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(Buffer.from(report.buffer));
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(report.buffer);
    }

    res.json({
      success: true,
      message: 'Operator report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Generate operator report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate operator report',
      error: error.message,
    });
  }
});

// Get user activity report (admin only)
router.get('/users', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { start_date, end_date, date_from, date_to, user_status, format = 'json' } = req.query;

    const report = await reportingService.generateUserActivityReport({
      start_date: start_date || date_from,
      end_date: end_date || date_to,
      user_status,
      format,
    });

    if (format === 'excel') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(Buffer.from(report.buffer));
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(report.buffer);
    }

    res.json({
      success: true,
      message: 'User activity report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Generate user report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate user activity report',
      error: error.message,
    });
  }
});

module.exports = router;
