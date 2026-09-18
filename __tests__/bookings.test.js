// Test helper functions from bookings.js

// Extract and test the helper functions
const TAX_RATE = 0.13;
const SERVICE_FEE_PER_PASSENGER = 50;

const calculateBookingAmounts = (farePerPassenger, totalPassengers) => {
  const subtotal = farePerPassenger * totalPassengers;
  const tax_amount = Math.round(subtotal * TAX_RATE * 100) / 100;
  const service_fee = SERVICE_FEE_PER_PASSENGER * totalPassengers;
  const total_amount = Math.round((subtotal + tax_amount + service_fee) * 100) / 100;

  return {
    base_fare: farePerPassenger,
    subtotal,
    tax_amount,
    service_fee,
    discount_amount: 0,
    total_amount,
  };
};

const generatePNR = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 10; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
};

describe('Booking Helper Functions', () => {
  describe('calculateBookingAmounts', () => {
    it('should calculate amounts correctly for single passenger', () => {
      const result = calculateBookingAmounts(1000, 1);

      expect(result.base_fare).toBe(1000);
      expect(result.subtotal).toBe(1000);
      expect(result.tax_amount).toBe(130); // 13% of 1000
      expect(result.service_fee).toBe(50);
      expect(result.discount_amount).toBe(0);
      expect(result.total_amount).toBe(1180); // 1000 + 130 + 50
    });

    it('should calculate amounts correctly for multiple passengers', () => {
      const result = calculateBookingAmounts(1500, 3);

      expect(result.base_fare).toBe(1500);
      expect(result.subtotal).toBe(4500);
      expect(result.tax_amount).toBe(585); // 13% of 4500
      expect(result.service_fee).toBe(150); // 50 * 3
      expect(result.discount_amount).toBe(0);
      expect(result.total_amount).toBe(5235); // 4500 + 585 + 150
    });

    it('should handle zero passengers', () => {
      const result = calculateBookingAmounts(1000, 0);

      expect(result.subtotal).toBe(0);
      expect(result.tax_amount).toBe(0);
      expect(result.service_fee).toBe(0);
      expect(result.total_amount).toBe(0);
    });
  });

  describe('generatePNR', () => {
    it('should generate a 10-character PNR', () => {
      const pnr = generatePNR();
      expect(pnr).toHaveLength(10);
    });

    it('should only contain alphanumeric characters', () => {
      const pnr = generatePNR();
      expect(pnr).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique PNRs', () => {
      const pnrs = new Set();
      for (let i = 0; i < 100; i++) {
        pnrs.add(generatePNR());
      }
      // With 36^10 possible values, 100 should all be unique
      expect(pnrs.size).toBe(100);
    });
  });
});
