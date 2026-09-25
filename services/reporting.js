const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const {
  Booking,
  Trip,
  Route,
  Bus,
  Operator,
  User,
  UserRole,
  Payment,
  WalletTransaction,
} = require('../models');

const nptDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kathmandu',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const nptToday = () => nptDateFmt.format(new Date());

// Inclusive date-time range; null when neither bound is given (all-time).
// Missing side defaults: start -> epoch, end -> today (NPT).
const bookingDateBetween = (start_date, end_date) => {
  if (!start_date && !end_date) return null;
  const start = String(start_date || '1970-01-01').slice(0, 10);
  const end = String(end_date || nptToday()).slice(0, 10);
  return { [Op.between]: [start, `${end} 23:59:59`] };
};

class ReportingService {
  // Generate booking report
  async generateBookingReport(filters = {}) {
    try {
      const {
        start_date,
        end_date,
        operator_id,
        booking_status,
        payment_status,
        format = 'json',
      } = filters;

      let whereClause = {};
      let includeClause = [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'phone_number', 'email'],
        },
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Route,
              as: 'route',
              include: [
                {
                  model: Operator,
                  as: 'operator',
                  attributes: ['company_name'],
                },
              ],
            },
            {
              model: Bus,
              as: 'bus',
              attributes: ['bus_number', 'bus_type'],
            },
          ],
        },
      ];

      // Apply filters
      const bookingDateRange = bookingDateBetween(start_date, end_date);
      if (bookingDateRange) {
        whereClause.booking_date = bookingDateRange;
      }

      if (booking_status) {
        whereClause.booking_status = booking_status;
      }

      if (payment_status) {
        whereClause.payment_status = payment_status;
      }

      if (operator_id) {
        includeClause[1].include[0].where = { operator_id };
      }

      const bookings = await Booking.findAll({
        where: whereClause,
        include: includeClause,
        order: [['booking_date', 'DESC']],
      });

      // Calculate summary statistics
      const summary = this.calculateBookingSummary(bookings);

      const reportData = {
        summary,
        bookings: bookings.map(booking => ({
          id: booking.id,
          pnr: booking.pnr,
          booking_date: booking.booking_date,
          user_name: booking.user?.full_name,
          user_phone: booking.user?.phone_number,
          passenger_name: booking.user?.full_name || 'N/A',
          passenger_phone: booking.user?.phone_number || '',
          route: booking.trip?.route ? `${booking.trip.route.origin_city} → ${booking.trip.route.destination_city}` : 'N/A',
          trip_date: booking.trip?.trip_date,
          departure_time: booking.trip?.departure_time,
          bus_number: booking.trip?.bus?.bus_number,
          operator: booking.trip?.route?.operator?.company_name || 'N/A',
          passengers: booking.total_passengers,
          base_amount: parseFloat(booking.base_amount || 0),
          tax_amount: parseFloat(booking.tax_amount || 0),
          service_fee: parseFloat(booking.service_fee || 0),
          total_amount: parseFloat(booking.total_amount || 0),
          booking_status: booking.booking_status,
          status: booking.booking_status,
          payment_status: booking.payment_status,
        })),
        total_bookings: summary.total_bookings,
        total_revenue: summary.total_revenue,
        generated_at: new Date(),
        filters: filters,
      };

      if (format === 'excel') {
        return await this.generateExcelReport(reportData, 'Booking Report');
      } else if (format === 'pdf') {
        return await this.generatePDFReport(reportData, 'Booking Report');
      }

      return reportData;
    } catch (error) {
      console.error('Error generating booking report:', error);
      throw error;
    }
  }

  // Generate revenue report
  async generateRevenueReport(filters = {}) {
    try {
      const {
        start_date,
        end_date,
        operator_id,
        group_by = 'day', // day, week, month
        format = 'json',
      } = filters;

      let whereClause = {
        payment_status: 'COMPLETED',
      };

      const bookingDateRange = bookingDateBetween(start_date, end_date);
      if (bookingDateRange) {
        whereClause.booking_date = bookingDateRange;
      }

      let includeClause = [
        {
          model: Trip,
          as: 'trip',
          include: [
            {
              model: Route,
              as: 'route',
              include: [
                {
                  model: Operator,
                  as: 'operator',
                  attributes: ['id', 'company_name'],
                },
              ],
            },
          ],
        },
      ];

      if (operator_id) {
        includeClause[0].include[0].where = { operator_id };
      }

      const bookings = await Booking.findAll({
        where: whereClause,
        include: includeClause,
        order: [['booking_date', 'ASC']],
      });

      // Group revenue data
      const revenueData = this.groupRevenueData(bookings, group_by);
      const summary = this.calculateRevenueSummary(bookings);

      const reportData = {
        summary,
        total_bookings: summary.total_bookings,
        total_revenue: summary.total_revenue,
        average_fare: summary.total_bookings > 0 ? summary.total_revenue / summary.total_bookings : 0,
        revenue_data: revenueData,
        generated_at: new Date(),
        filters: filters,
      };

      // Flatten + operator breakdown for admin UI
      const byOperator = {};
      for (const b of bookings) {
        const name = b.trip?.route?.operator?.company_name || 'Unknown';
        if (!byOperator[name]) byOperator[name] = { company_name: name, total_revenue: 0, total_bookings: 0 };
        byOperator[name].total_revenue += parseFloat(b.total_amount || 0);
        byOperator[name].total_bookings += 1;
      }
      const totalRev = reportData.total_revenue || 1;
      reportData.revenue_by_operator = Object.values(byOperator)
        .map(o => ({ ...o, percentage: Math.round((o.total_revenue / totalRev) * 1000) / 10 }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      if (format === 'excel') {
        return await this.generateExcelReport(reportData, 'Revenue Report');
      } else if (format === 'pdf') {
        return await this.generatePDFReport(reportData, 'Revenue Report');
      }

      return reportData;
    } catch (error) {
      console.error('Error generating revenue report:', error);
      throw error;
    }
  }

  // Generate operator performance report
  async generateOperatorReport(filters = {}) {
    try {
      const {
        start_date,
        end_date,
        operator_id,
        format = 'json',
      } = filters;

      let bookingWhereClause = {};
      const bookingDateRange = bookingDateBetween(start_date, end_date);
      if (bookingDateRange) {
        bookingWhereClause.booking_date = bookingDateRange;
      }

      let operatorWhereClause = { status: 'APPROVED' };
      if (operator_id) {
        operatorWhereClause.id = operator_id;
      }

      const operators = await Operator.findAll({
        where: operatorWhereClause,
        include: [
          {
            model: Route,
            as: 'routes',
            include: [
              {
                model: Trip,
                as: 'trips',
                include: [
                  {
                    model: Booking,
                    as: 'bookings',
                    where: {
                      ...bookingWhereClause,
                      payment_status: 'COMPLETED',
                    },
                    required: false,
                  },
                ],
              },
            ],
          },
          {
            model: Bus,
            as: 'buses',
            where: { status: 'ACTIVE' },
            required: false,
          },
        ],
      });

      const operatorData = operators.map(operator => {
        const allBookings = [];
        let tripCount = 0;
        operator.routes?.forEach(route => {
          route.trips?.forEach(trip => {
            tripCount += 1;
            if (trip.bookings) {
              allBookings.push(...trip.bookings);
            }
          });
        });

        const totalRevenue = allBookings.reduce((sum, booking) => 
          sum + parseFloat(booking.total_amount), 0);
        const totalBookings = allBookings.length;
        const totalPassengers = allBookings.reduce((sum, booking) => 
          sum + booking.total_passengers, 0);
        const activeRoutes = operator.routes?.filter(route => route.is_active).length || 0;
        const activeBuses = operator.buses?.length || 0;

        return {
          operator_id: operator.id,
          company_name: operator.company_name,
          total_revenue: totalRevenue,
          total_bookings: totalBookings,
          total_passengers: totalPassengers,
          active_routes: activeRoutes,
          active_buses: activeBuses,
          total_buses: activeBuses,
          total_trips: tripCount,
          commission_earned: totalRevenue * (operator.commission_rate / 100),
          average_booking_value: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        };
      });

      const reportData = {
        operators: operatorData,
        summary: {
          total_operators: operatorData.length,
          total_revenue: operatorData.reduce((sum, op) => sum + op.total_revenue, 0),
          total_bookings: operatorData.reduce((sum, op) => sum + op.total_bookings, 0),
          total_commission: operatorData.reduce((sum, op) => sum + op.commission_earned, 0),
        },
        generated_at: new Date(),
        filters: filters,
      };

      if (format === 'excel') {
        return await this.generateExcelReport(reportData, 'Operator Performance Report');
      } else if (format === 'pdf') {
        return await this.generatePDFReport(reportData, 'Operator Performance Report');
      }

      return reportData;
    } catch (error) {
      console.error('Error generating operator report:', error);
      throw error;
    }
  }

  // Generate user activity report
  async generateUserActivityReport(filters = {}) {
    try {
      const {
        start_date,
        end_date,
        user_status,
        format = 'json',
      } = filters;

      let userWhereClause = {};
      if (user_status) {
        userWhereClause.status = user_status;
      }

      let bookingWhereClause = {};
      const bookingDateRange = bookingDateBetween(start_date, end_date);
      if (bookingDateRange) {
        bookingWhereClause.booking_date = bookingDateRange;
      }

      const users = await User.findAll({
        where: userWhereClause,
        attributes: { exclude: ['password', 'firebase_uid'] },
        include: [
          {
            model: UserRole,
            as: 'roles',
            where: { is_active: true },
            required: false,
          },
          {
            model: Booking,
            as: 'bookings',
            where: bookingWhereClause,
            required: false,
            include: [
              {
                model: Trip,
                as: 'trip',
                include: [
                  {
                    model: Route,
                    as: 'route',
                    attributes: ['origin_city', 'destination_city'],
                  },
                ],
              },
            ],
          },
        ],
      });

      const userData = users
        .filter(user => user.bookings && user.bookings.length > 0)
        .map(user => {
          const completedBookings = user.bookings.filter(b => b.payment_status === 'COMPLETED');
          const totalSpent = completedBookings.reduce((sum, booking) => 
            sum + parseFloat(booking.total_amount), 0);
          const totalTrips = completedBookings.length;
          const lastBookingDate = user.bookings.length > 0 
            ? new Date(Math.max(...user.bookings.map(b => new Date(b.booking_date))))
            : null;

          return {
            id: user.id,
            user_id: user.id,
            full_name: user.full_name,
            phone_number: user.phone_number,
            email: user.email,
            role: user.roles?.[0]?.role || 'CUSTOMER',
            registration_date: user.created_at,
            total_bookings: user.bookings.length,
            completed_bookings: completedBookings.length,
            total_spent: totalSpent,
            average_booking_value: totalTrips > 0 ? totalSpent / totalTrips : 0,
            last_booking_date: lastBookingDate,
            is_phone_verified: user.is_phone_verified,
            is_email_verified: user.is_email_verified,
            status: user.status,
          };
        })
        .sort((a, b) => b.total_spent - a.total_spent);

      const reportData = {
        users: userData,
        total_users: userData.length,
        summary: {
          total_active_users: userData.length,
          total_users: userData.length,
          total_revenue: userData.reduce((sum, user) => sum + user.total_spent, 0),
          total_bookings: userData.reduce((sum, user) => sum + user.total_bookings, 0),
          average_user_value: userData.length > 0 
            ? userData.reduce((sum, user) => sum + user.total_spent, 0) / userData.length 
            : 0,
        },
        generated_at: new Date(),
        filters: filters,
      };

      if (format === 'excel') {
        return await this.generateExcelReport(reportData, 'User Activity Report');
      } else if (format === 'pdf') {
        return await this.generatePDFReport(reportData, 'User Activity Report');
      }

      return reportData;
    } catch (error) {
      console.error('Error generating user activity report:', error);
      throw error;
    }
  }

  // Helper method to calculate booking summary
  calculateBookingSummary(bookings) {
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.booking_status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(b => b.booking_status === 'CANCELLED').length;
    const paidBookings = bookings.filter(b => b.payment_status === 'COMPLETED').length;
    
    const totalRevenue = bookings
      .filter(b => b.payment_status === 'COMPLETED')
      .reduce((sum, booking) => sum + parseFloat(booking.total_amount), 0);
    
    const totalPassengers = bookings.reduce((sum, booking) => sum + booking.total_passengers, 0);

    return {
      total_bookings: totalBookings,
      completed_bookings: completedBookings,
      cancelled_bookings: cancelledBookings,
      paid_bookings: paidBookings,
      total_revenue: totalRevenue,
      total_passengers: totalPassengers,
      average_booking_value: paidBookings > 0 ? totalRevenue / paidBookings : 0,
      cancellation_rate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
    };
  }

  // Helper method to calculate revenue summary
  calculateRevenueSummary(bookings) {
    const totalRevenue = bookings.reduce((sum, booking) => sum + parseFloat(booking.total_amount), 0);
    const totalServiceFee = bookings.reduce((sum, booking) => sum + parseFloat(booking.service_fee), 0);
    const totalTax = bookings.reduce((sum, booking) => sum + parseFloat(booking.tax_amount), 0);
    const totalBookings = bookings.length;

    return {
      total_revenue: totalRevenue,
      total_service_fee: totalServiceFee,
      total_tax: totalTax,
      total_bookings: totalBookings,
      average_revenue_per_booking: totalBookings > 0 ? totalRevenue / totalBookings : 0,
    };
  }

  // Helper method to group revenue data
  groupRevenueData(bookings, groupBy) {
    const grouped = {};

    bookings.forEach(booking => {
      let key;
      // Bucket by calendar date in Asia/Kathmandu (server host TZ is UTC)
      const nptDate = nptDateFmt.format(new Date(booking.booking_date));
      const [ny, nm, nd] = nptDate.split('-').map(Number);

      switch (groupBy) {
        case 'day':
          key = nptDate;
          break;
        case 'week': {
          const weekStart = new Date(Date.UTC(ny, nm - 1, nd, 12));
          weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = nptDate.slice(0, 7);
          break;
        default:
          key = nptDate;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          revenue: 0,
          bookings: 0,
          passengers: 0,
          service_fee: 0,
          tax: 0,
        };
      }

      grouped[key].revenue += parseFloat(booking.total_amount);
      grouped[key].bookings += 1;
      grouped[key].passengers += booking.total_passengers;
      grouped[key].service_fee += parseFloat(booking.service_fee);
      grouped[key].tax += parseFloat(booking.tax_amount);
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }

  // Generate Excel report
  async generateExcelReport(data, title) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // Add title
    worksheet.addRow([title]);
    worksheet.getRow(1).font = { size: 16, bold: true };

    // Add generation info
    worksheet.addRow([`Generated on: ${data.generated_at.toLocaleString()}`]);
    worksheet.addRow([]);

    // Add summary if available
    if (data.summary) {
      worksheet.addRow(['SUMMARY']);
      worksheet.getRow(worksheet.rowCount).font = { bold: true };
      
      Object.entries(data.summary).forEach(([key, value]) => {
        worksheet.addRow([
          key.replace(/_/g, ' ').toUpperCase(),
          typeof value === 'number' ? value.toFixed(2) : value
        ]);
      });
      worksheet.addRow([]);
    }

    // Add main data
    if (data.bookings) {
      this.addBookingDataToWorksheet(worksheet, data.bookings);
    } else if (data.operators) {
      this.addOperatorDataToWorksheet(worksheet, data.operators);
    } else if (data.users) {
      this.addUserDataToWorksheet(worksheet, data.users);
    } else if (data.revenue_data) {
      this.addRevenueDataToWorksheet(worksheet, data.revenue_data);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 0, 15);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      success: true,
      buffer: buffer,
      filename: `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // Generate PDF report
  async generatePDFReport(data, title) {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve({
          success: true,
          buffer: buffer,
          filename: `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
          contentType: 'application/pdf',
        });
      });

      // Add title
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      // Add generation info
      doc.fontSize(10).text(`Generated on: ${data.generated_at.toLocaleString()}`, { align: 'right' });
      doc.moveDown();

      // Add summary
      if (data.summary) {
        doc.fontSize(14).text('Summary', { underline: true });
        doc.moveDown(0.5);
        
        Object.entries(data.summary).forEach(([key, value]) => {
          doc.fontSize(10).text(
            `${key.replace(/_/g, ' ').toUpperCase()}: ${typeof value === 'number' ? value.toFixed(2) : value}`
          );
        });
        doc.moveDown();
      }

      // Add main data (simplified for PDF)
      if (data.bookings && data.bookings.length > 0) {
        doc.fontSize(12).text(`Total Bookings: ${data.bookings.length}`);
      } else if (data.operators && data.operators.length > 0) {
        doc.fontSize(12).text(`Total Operators: ${data.operators.length}`);
      }

      doc.end();
    });
  }

  // Helper methods for adding data to Excel worksheets
  addBookingDataToWorksheet(worksheet, bookings) {
    const headers = [
      'PNR', 'Booking Date', 'User Name', 'Phone', 'Route', 'Trip Date',
      'Departure', 'Bus Number', 'Operator', 'Passengers', 'Total Amount',
      'Booking Status', 'Payment Status'
    ];
    
    worksheet.addRow(headers);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    bookings.forEach(booking => {
      worksheet.addRow([
        booking.pnr,
        booking.booking_date,
        booking.user_name,
        booking.user_phone,
        booking.route,
        booking.trip_date,
        booking.departure_time,
        booking.bus_number,
        booking.operator,
        booking.passengers,
        booking.total_amount,
        booking.booking_status,
        booking.payment_status,
      ]);
    });
  }

  addOperatorDataToWorksheet(worksheet, operators) {
    const headers = [
      'Company Name', 'Total Revenue', 'Total Bookings', 'Total Passengers',
      'Active Routes', 'Active Buses', 'Commission Earned', 'Avg Booking Value'
    ];
    
    worksheet.addRow(headers);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    operators.forEach(operator => {
      worksheet.addRow([
        operator.company_name,
        operator.total_revenue,
        operator.total_bookings,
        operator.total_passengers,
        operator.active_routes,
        operator.active_buses,
        operator.commission_earned,
        operator.average_booking_value,
      ]);
    });
  }

  addUserDataToWorksheet(worksheet, users) {
    const headers = [
      'Full Name', 'Phone', 'Email', 'Registration Date', 'Total Bookings',
      'Completed Bookings', 'Total Spent', 'Avg Booking Value', 'Last Booking'
    ];
    
    worksheet.addRow(headers);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    users.forEach(user => {
      worksheet.addRow([
        user.full_name,
        user.phone_number,
        user.email,
        user.registration_date,
        user.total_bookings,
        user.completed_bookings,
        user.total_spent,
        user.average_booking_value,
        user.last_booking_date,
      ]);
    });
  }

  addRevenueDataToWorksheet(worksheet, revenueData) {
    const headers = [
      'Period', 'Revenue', 'Bookings', 'Passengers', 'Service Fee', 'Tax'
    ];
    
    worksheet.addRow(headers);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    revenueData.forEach(data => {
      worksheet.addRow([
        data.period,
        data.revenue,
        data.bookings,
        data.passengers,
        data.service_fee,
        data.tax,
      ]);
    });
  }
}

module.exports = ReportingService;