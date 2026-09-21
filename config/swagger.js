const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Samaya Deluxe Bus Booking API',
      version: '1.0.0',
      description: 'A comprehensive bus ticket booking system API for Nepal. Supports trip search, seat booking, payments (eSewa, Khalti), wallet, and real-time bus tracking.',
      contact: {
        name: 'Samaya Deluxe',
        email: 'support@samayadeluxe.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            phone_number: { type: 'string' },
            full_name: { type: 'string' },
            email: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] },
          },
        },
        Operator: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            company_name: { type: 'string' },
            company_name_nepali: { type: 'string' },
            license_number: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'] },
          },
        },
        Bus: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            bus_number: { type: 'string' },
            bus_model: { type: 'string' },
            bus_type: { type: 'string', enum: ['DELUXE', 'SUPER_DELUXE', 'AC', 'NON_AC', 'SLEEPER', 'SEMI_SLEEPER', 'TOURIST'] },
            total_seats: { type: 'integer' },
            amenities: { type: 'array', items: { type: 'string' } },
          },
        },
        Route: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            route_name: { type: 'string' },
            origin_city: { type: 'string' },
            destination_city: { type: 'string' },
            distance_km: { type: 'number' },
            estimated_duration_minutes: { type: 'integer' },
            base_fare: { type: 'number' },
          },
        },
        Trip: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            trip_date: { type: 'string', format: 'date' },
            departure_time: { type: 'string' },
            arrival_time: { type: 'string' },
            current_fare: { type: 'number' },
            available_seats: { type: 'integer' },
            status: { type: 'string', enum: ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED'] },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            pnr: { type: 'string' },
            total_passengers: { type: 'integer' },
            total_amount: { type: 'number' },
            booking_status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'] },
            payment_status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
          },
        },
        Passenger: {
          type: 'object',
          properties: {
            passenger_name: { type: 'string' },
            age: { type: 'integer' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
            seat_number: { type: 'string' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            payment_method: { type: 'string', enum: ['ESEWA', 'KHALTI', 'FONEPAY', 'CONNECTIPS', 'CARD', 'WALLET'] },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'] },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            balance: { type: 'number' },
            total_earned: { type: 'number' },
            total_spent: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Samaya Deluxe API Docs',
  }));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
};

module.exports = { setupSwagger, swaggerSpec };
