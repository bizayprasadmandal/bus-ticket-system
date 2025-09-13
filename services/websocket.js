const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, UserRole } = require('../models');

class WebSocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.connectedUsers = new Map(); // userId -> socket mapping
    this.roomSubscriptions = new Map(); // room -> Set of userIds
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Setup authentication middleware
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findByPk(decoded.userId, {
          include: [
            {
              model: UserRole,
              as: 'roles',
              where: { is_active: true },
              required: false,
            },
          ],
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('Invalid user'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.id} connected: ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.user.id, socket);

      // Join user to their personal room
      socket.join(`user_${socket.user.id}`);

      // Handle seat selection events
      socket.on('select_seats', (data) => {
        this.handleSeatSelection(socket, data);
      });

      // Handle trip subscription
      socket.on('subscribe_trip', (data) => {
        this.handleTripSubscription(socket, data);
      });

      // Handle booking updates
      socket.on('subscribe_booking', (data) => {
        this.handleBookingSubscription(socket, data);
      });

      // Handle bus location updates (for operators/drivers)
      socket.on('update_bus_location', (data) => {
        this.handleBusLocationUpdate(socket, data);
      });

      // Handle real-time notifications
      socket.on('mark_notification_read', (data) => {
        this.handleNotificationRead(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // Handle seat selection for real-time updates
  handleSeatSelection(socket, data) {
    const { trip_id, seat_numbers, action } = data; // action: 'select' or 'deselect'
    
    // Broadcast to all users viewing this trip
    socket.to(`trip_${trip_id}`).emit('seat_selection_changed', {
      user_id: socket.user.id,
      trip_id,
      seat_numbers,
      action,
      timestamp: new Date(),
    });
  }

  // Handle trip subscription for real-time seat updates
  handleTripSubscription(socket, data) {
    const { trip_id } = data;
    const roomName = `trip_${trip_id}`;
    
    socket.join(roomName);
    
    // Track room subscriptions
    if (!this.roomSubscriptions.has(roomName)) {
      this.roomSubscriptions.set(roomName, new Set());
    }
    this.roomSubscriptions.get(roomName).add(socket.user.id);

    // Send current seat status
    this.sendCurrentSeatStatus(socket, trip_id);
  }

  // Handle booking subscription for booking updates
  handleBookingSubscription(socket, data) {
    const { booking_id } = data;
    socket.join(`booking_${booking_id}`);
  }

  // Handle bus location updates
  handleBusLocationUpdate(socket, data) {
    const { trip_id, latitude, longitude, speed, heading } = data;
    
    // Verify user has permission to update location (operator/driver)
    const userRoles = socket.user.roles || [];
    const canUpdateLocation = userRoles.some(role => 
      ['OPERATOR', 'AGENT'].includes(role.role) && role.is_active
    );

    if (!canUpdateLocation) {
      socket.emit('error', { message: 'Unauthorized to update location' });
      return;
    }

    // Broadcast location update to trip subscribers
    this.io.to(`trip_${trip_id}`).emit('bus_location_updated', {
      trip_id,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: parseFloat(speed || 0),
        heading: parseInt(heading || 0),
        timestamp: new Date(),
      },
    });

    // Store location in database (you can call your location service here)
    this.storeBusLocation(trip_id, { latitude, longitude, speed, heading });
  }

  // Handle notification read status
  handleNotificationRead(socket, data) {
    const { notification_id } = data;
    
    // Broadcast to user's other devices
    socket.to(`user_${socket.user.id}`).emit('notification_read', {
      notification_id,
      timestamp: new Date(),
    });
  }

  // Handle user disconnect
  handleDisconnect(socket) {
    console.log(`User ${socket.user.id} disconnected: ${socket.id}`);
    
    // Remove from connected users
    this.connectedUsers.delete(socket.user.id);

    // Clean up room subscriptions
    this.roomSubscriptions.forEach((userSet, roomName) => {
      userSet.delete(socket.user.id);
      if (userSet.size === 0) {
        this.roomSubscriptions.delete(roomName);
      }
    });
  }

  // Send current seat status to newly subscribed user
  async sendCurrentSeatStatus(socket, trip_id) {
    try {
      // Get current seat locks and bookings
      const [seatLocks, bookings] = await Promise.all([
        SeatLock.findAll({
          where: {
            trip_id,
            status: 'LOCKED',
            expires_at: { [Op.gt]: new Date() },
          },
        }),
        Booking.findAll({
          where: { trip_id, booking_status: ['CONFIRMED', 'COMPLETED'] },
          include: [{ model: BookingPassenger, as: 'passengers' }],
        }),
      ]);

      // Compile seat status
      const lockedSeats = [];
      const bookedSeats = [];

      seatLocks.forEach(lock => {
        const seats = Array.isArray(lock.seat_numbers) 
          ? lock.seat_numbers 
          : JSON.parse(lock.seat_numbers || '[]');
        lockedSeats.push(...seats.map(seat => ({
          seat_number: seat,
          user_id: lock.user_id,
          expires_at: lock.expires_at,
        })));
      });

      bookings.forEach(booking => {
        booking.passengers?.forEach(passenger => {
          if (passenger.seat_number) {
            bookedSeats.push({
              seat_number: passenger.seat_number,
              passenger_name: passenger.passenger_name,
            });
          }
        });
      });

      socket.emit('current_seat_status', {
        trip_id,
        locked_seats: lockedSeats,
        booked_seats: bookedSeats,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error sending seat status:', error);
    }
  }

  // Store bus location in database
  async storeBusLocation(trip_id, locationData) {
    try {
      const { BusLocation } = require('../models');
      await BusLocation.create({
        trip_id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error storing bus location:', error);
    }
  }

  // Public methods for other services to emit events

  // Notify seat status change
  notifySeatStatusChange(trip_id, seatData) {
    this.io.to(`trip_${trip_id}`).emit('seat_status_changed', {
      trip_id,
      ...seatData,
      timestamp: new Date(),
    });
  }

  // Notify booking status change
  notifyBookingStatusChange(booking_id, status, user_id) {
    this.io.to(`booking_${booking_id}`).emit('booking_status_changed', {
      booking_id,
      status,
      timestamp: new Date(),
    });

    // Also notify user directly
    this.io.to(`user_${user_id}`).emit('booking_updated', {
      booking_id,
      status,
      timestamp: new Date(),
    });
  }

  // Notify payment status change
  notifyPaymentStatusChange(booking_id, payment_status, user_id) {
    this.io.to(`user_${user_id}`).emit('payment_status_changed', {
      booking_id,
      payment_status,
      timestamp: new Date(),
    });
  }

  // Send notification to user
  sendNotificationToUser(user_id, notification) {
    this.io.to(`user_${user_id}`).emit('new_notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  // Broadcast system announcement
  broadcastSystemAnnouncement(message, target_roles = []) {
    if (target_roles.length === 0) {
      // Broadcast to all connected users
      this.io.emit('system_announcement', {
        message,
        timestamp: new Date(),
      });
    } else {
      // Broadcast to specific roles
      this.connectedUsers.forEach((socket, userId) => {
        const userRoles = socket.user.roles || [];
        const hasTargetRole = userRoles.some(role => 
          target_roles.includes(role.role) && role.is_active
        );
        
        if (hasTargetRole) {
          socket.emit('system_announcement', {
            message,
            timestamp: new Date(),
          });
        }
      });
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get users in specific room
  getUsersInRoom(roomName) {
    return this.roomSubscriptions.get(roomName)?.size || 0;
  }

  // Force disconnect user (for admin purposes)
  disconnectUser(user_id) {
    const socket = this.connectedUsers.get(user_id);
    if (socket) {
      socket.disconnect(true);
    }
  }
}

module.exports = WebSocketService;