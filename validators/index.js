const { body, param, query } = require('express-validator');

// User validation rules
const userValidation = {
  register: [
    body('phone_number')
      .isMobilePhone('ne-NP')
      .withMessage('Please provide a valid Nepali phone number'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('full_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('gender')
      .optional()
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  ],
  
  update: [
    body('email')
      .optional({ values: 'falsy' })
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('full_name')
      .optional({ values: 'falsy' })
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('full_name_nepali')
      .optional({ values: 'falsy' })
      .isLength({ max: 100 })
      .withMessage('Nepali name must be at most 100 characters'),
    body('date_of_birth')
      .optional({ values: 'falsy' })
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    body('gender')
      .optional({ values: 'falsy' })
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('profile_image_url')
      .optional({ values: 'falsy' })
      .isLength({ max: 2000 })
      .withMessage('Profile image URL is too long'),
  ],
};

// Booking validation rules
const bookingValidation = {
  create: [
    body('trip_id')
      .isInt({ min: 1 })
      .withMessage('Valid trip ID is required'),
    body('passengers')
      .isArray({ min: 1 })
      .withMessage('At least one passenger is required'),
    body('passengers.*.passenger_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Passenger name must be between 2 and 100 characters'),
    body('passengers.*.age')
      .isInt({ min: 1, max: 120 })
      .withMessage('Age must be between 1 and 120'),
    body('passengers.*.gender')
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('passengers.*.seat_number')
      .notEmpty()
      .withMessage('Seat number is required'),
    body('passengers.*.id_type')
      .isIn(['CITIZENSHIP', 'PASSPORT', 'DRIVING_LICENSE'])
      .withMessage('Valid ID type is required'),
    body('passengers.*.id_number')
      .notEmpty()
      .withMessage('ID number is required'),
  ],

  cancel: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid booking ID is required'),
    body('cancellation_reason')
      .notEmpty()
      .withMessage('Cancellation reason is required'),
  ],
};

// Trip search validation
const tripValidation = {
  search: [
    query('origin_city')
      .notEmpty()
      .withMessage('Origin city is required'),
    query('destination_city')
      .notEmpty()
      .withMessage('Destination city is required'),
    query('trip_date')
      .isISO8601()
      .withMessage('Valid trip date is required'),
    query('passengers')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Passengers must be between 1 and 50'),
  ],
};

// Seat lock validation
const seatLockValidation = {
  lock: [
    body('trip_id')
      .isInt({ min: 1 })
      .withMessage('Valid trip ID is required'),
    body('seat_numbers')
      .isArray({ min: 1 })
      .withMessage('At least one seat number is required'),
  ],
};

// Payment validation
const paymentValidation = {
  initiate: [
    body('booking_id')
      .isInt({ min: 1 })
      .withMessage('Valid booking ID is required'),
    body('payment_method')
      .isIn(['ESEWA', 'KHALTI', 'FONEPAY', 'CONNECTIPS', 'CARD', 'WALLET', 'CASH'])
      .withMessage('Valid payment method is required'),
    body('amount')
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Valid amount is required'),
  ],

  verify: [
    body('gateway_transaction_id')
      .notEmpty()
      .withMessage('Gateway transaction ID is required'),
  ],
};

// Operator validation
const operatorValidation = {
  register: [
    body('company_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    body('license_number')
      .notEmpty()
      .withMessage('License number is required'),
    body('contact_person')
      .notEmpty()
      .withMessage('Contact person is required'),
    body('phone_number')
      .isMobilePhone('ne-NP')
      .withMessage('Please provide a valid Nepali phone number'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),
  ],
};

// Bus validation
const busValidation = {
  create: [
    body('bus_number')
      .notEmpty()
      .withMessage('Bus number is required'),
    body('bus_model')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Bus model must be between 2 and 50 characters'),
    body('bus_type')
      .isIn(['DELUXE', 'SUPER_DELUXE', 'AC', 'NON_AC', 'SLEEPER', 'SEMI_SLEEPER', 'TOURIST'])
      .withMessage('Valid bus type is required'),
    body('total_seats')
      .isInt({ min: 1, max: 100 })
      .withMessage('Total seats must be between 1 and 100'),
  ],
};

// Route validation
const routeValidation = {
  create: [
    body('route_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Route name must be between 2 and 100 characters'),
    body('origin_city')
      .notEmpty()
      .withMessage('Origin city is required'),
    body('destination_city')
      .notEmpty()
      .withMessage('Destination city is required'),
    body('distance_km')
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Valid distance in kilometers is required'),
    body('base_fare')
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Valid base fare is required'),
  ],
};

// Common parameter validations
const commonValidation = {
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid ID is required'),
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

module.exports = {
  userValidation,
  bookingValidation,
  tripValidation,
  seatLockValidation,
  paymentValidation,
  operatorValidation,
  busValidation,
  routeValidation,
  commonValidation,
};