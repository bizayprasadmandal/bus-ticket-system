# Samaya Deluxe Bus Booking System - Backend API

A comprehensive Node.js backend for a bus booking system with features for users, operators, bookings, payments, and real-time tracking.

## Features

### 🚌 Core Features
- **Trip Search & Booking**: Search available trips and make reservations
- **Seat Management**: Real-time seat layout, booking, and temporary seat locks
- **Payment Processing**: Multiple payment gateways (eSewa, Khalti, Wallet)
- **User Management**: Registration, authentication, profiles, and roles
- **Operator Management**: Bus operator registration and approval workflow
- **Real-time Tracking**: Bus location tracking and updates
- **Wallet System**: Digital wallet with top-up, transfers, and transaction history

### 👥 User Roles
- **Customer**: Book trips, manage bookings, wallet operations
- **Operator**: Manage buses, routes, trips, view analytics
- **Super Admin**: System management, operator approval, analytics

### 🔐 Security Features
- JWT authentication and authorization
- Role-based access control
- Request validation and sanitization
- Rate limiting and CORS protection

## Project Structure

```
samaya-deluxe-backend/
├── config/
│   └── database.js              # Database connection
├── middleware/
│   ├── auth.js                  # Authentication middleware
│   └── error.js                 # Error handling middleware
├── models/
│   ├── User.js                  # User model
│   ├── Operator.js              # Bus operator model
│   ├── Bus.js                   # Bus model
│   ├── Route.js                 # Route model
│   ├── Trip.js                  # Trip model
│   ├── Booking.js               # Booking model
│   ├── BookingPassenger.js      # Passenger details model
│   ├── Payment.js               # Payment model
│   ├── SeatLock.js              # Seat locking model
│   ├── UserWallet.js            # User wallet model
│   ├── WalletTransaction.js     # Wallet transactions model
│   └── index.js                 # Model relationships
├── routes/
│   ├── auth.js                  # Authentication routes
│   ├── users.js                 # User management routes
│   ├── operators.js             # Operator routes
│   ├── cities.js                # City routes
│   ├── buses.js                 # Bus management routes
│   ├── routes.js                # Route management routes
│   ├── trips.js                 # Trip search and management
│   ├── bookings.js              # Booking management
│   ├── payments.js              # Payment processing
│   ├── seat-locks.js            # Seat locking system
│   ├── wallets.js               # Wallet operations
│   └── dashboard.js             # Dashboard analytics
├── validators/
│   └── index.js                 # Request validation rules
├── package.json                 # Dependencies
├── server.js                    # Main server file
└── .env.example                 # Environment variables template
```

## API Endpoints

### Authentication
```
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User login
GET    /api/auth/verify          # Verify JWT token
POST   /api/auth/send-otp        # Send OTP for verification
POST   /api/auth/verify-otp      # Verify OTP
POST   /api/auth/refresh         # Refresh JWT token
```

### Trip Search & Booking
```
GET    /api/trips/search         # Search available trips
GET    /api/trips/:id            # Get trip details
GET    /api/trips/:id/seats      # Get seat layout and availability
GET    /api/trips/:id/location   # Get real-time bus location

POST   /api/bookings            # Create new booking
GET    /api/bookings            # Get user bookings
GET    /api/bookings/:id        # Get booking details
POST   /api/bookings/:id/cancel # Cancel booking
GET    /api/bookings/pnr/:pnr   # Get booking by PNR
```

### Seat Management
```
POST   /api/seat-locks          # Lock seats temporarily
DELETE /api/seat-locks/:id      # Release seat lock
GET    /api/seat-locks/active   # Get active seat locks
PUT    /api/seat-locks/:id/extend # Extend seat lock
```

### Payment Processing
```
POST   /api/payments            # Initiate payment
POST   /api/payments/:id/verify # Verify payment
GET    /api/payments/:id        # Get payment details
GET    /api/payments            # Get payment history
```

### User Management
```
GET    /api/users/profile       # Get user profile
PUT    /api/users/profile       # Update user profile
POST   /api/users/addresses     # Add user address
GET    /api/users/addresses     # Get user addresses
PUT    /api/users/addresses/:id # Update address
DELETE /api/users/addresses/:id # Delete address
```

### Wallet Operations
```
GET    /api/wallets/balance     # Get wallet balance
POST   /api/wallets/topup       # Top up wallet
GET    /api/wallets/transactions # Get transaction history
POST   /api/wallets/transfer    # Transfer money
```

### Operator Management
```
GET    /api/operators           # Get operators list
POST   /api/operators/register  # Register as operator
PUT    /api/operators/:id       # Update operator info
POST   /api/operators/:id/approval # Approve/reject operator

GET    /api/buses               # Get buses list
POST   /api/buses               # Create bus
PUT    /api/buses/:id           # Update bus
DELETE /api/buses/:id           # Delete bus

GET    /api/routes              # Get routes list
POST   /api/routes              # Create route
PUT    /api/routes/:id          # Update route
DELETE /api/routes/:id          # Delete route
```

### Dashboard & Analytics
```
GET    /api/dashboard/customer  # Customer dashboard
GET    /api/dashboard/operator  # Operator dashboard
GET    /api/dashboard/admin     # Admin dashboard
GET    /api/dashboard/analytics/bookings # Booking analytics
```

## Installation & Setup

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd samaya-deluxe-backend
npm install
```

### 2. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE samayadeluxe_db;

# Import the provided SQL schema
mysql -u root -p samayadeluxe_db < samayadeluxe_db.sql
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=samayadeluxe_db
DB_USERNAME=root
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Payment Gateway Credentials
ESEWA_MERCHANT_CODE=your_esewa_code
KHALTI_SECRET_KEY=your_khalti_key
```

### 4. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Database Schema

The system uses 15 interconnected tables:

- **users**: User accounts and profiles
- **user_roles**: Role-based access control
- **user_addresses**: User address management
- **user_wallets**: Digital wallet system
- **wallet_transactions**: Wallet transaction history
- **operators**: Bus operator companies
- **cities**: City information for routes
- **buses**: Bus fleet management
- **routes**: Route definitions between cities
- **trips**: Scheduled trip instances
- **bookings**: Booking records
- **booking_passengers**: Passenger details
- **payments**: Payment transactions
- **seat_locks**: Temporary seat reservations
- **bus_locations**: Real-time location tracking

## Authentication & Authorization

### JWT Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control
- **CUSTOMER**: Basic booking and wallet operations
- **OPERATOR**: Manage buses, routes, and trips
- **SUPER_ADMIN**: Full system administration

## Payment Integration

The system supports multiple payment methods:
- **eSewa**: Nepal's digital wallet
- **Khalti**: Digital payment gateway
- **Digital Wallet**: Internal wallet system
- **Card**: Credit/debit card payments

## Real-time Features

- **Seat Locking**: Temporary seat reservations (15-minute expiry)
- **Bus Tracking**: Real-time GPS location updates
- **Live Availability**: Dynamic seat availability updates

## Error Handling

The API uses consistent error response format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Field-specific error message"
    }
  ]
}
```

## Success Response Format

All successful responses follow this structure:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

## Development Notes

### Adding New Routes
1. Create route file in `/routes/` directory
2. Define validation rules in `/validators/index.js`
3. Import and register routes in `server.js`

### Database Changes
1. Update Sequelize models in `/models/`
2. Update relationships in `/models/index.js`
3. Run database migrations if needed

### Testing
```bash
# Run tests (when test suite is added)
npm test
```

## Production Deployment

### Environment Setup
- Set `NODE_ENV=production`
- Configure production database
- Set secure JWT secret
- Configure real payment gateway credentials
- Set up SSL certificates
- Configure reverse proxy (nginx)

### Security Considerations
- Enable HTTPS
- Configure CORS for production domains
- Set up rate limiting
- Monitor API usage and logs
- Regular security updates

## API Documentation

For detailed API documentation with request/response examples, consider setting up:
- Swagger/OpenAPI documentation
- Postman collections
- API testing suites

## Support

For issues and questions:
1. Check the error logs
2. Review the database schema
3. Verify environment configuration
4. Check API endpoint documentation

## License

MIT License - See LICENSE file for details.



////install to last 
npm install axios socket.io redis node-cache rate-limiter-flexible express-slow-down nodemailer twilio multer sharp aws-sdk exceljs pdfkit crypto xml2js cron bull winston winston-daily-rotate-file
