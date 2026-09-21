const { sequelize } = require('./models');
const { Operator, City, Bus, Route, Trip, User, UserRole, UserWallet, Booking, BookingPassenger, Payment, WalletTransaction } = require('./models');
const bcrypt = require('bcryptjs');

const seatLayout = (rows, seatsPerSide) => {
  const layout = [];
  for (let r = 1; r <= rows; r++) {
    const row = [];
    for (let s = 1; s <= seatsPerSide; s++) row.push(`${r}${String.fromCharCode(64 + s)}`);
    layout.push(row);
  }
  return { type: 'seater', rows, seats_per_row: seatsPerSide, layout };
};

const generatePNR = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 10; i++) pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  return pnr;
};

const today = new Date();
const futureDates = [];
for (let i = 1; i <= 14; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  futureDates.push(d.toISOString().split('T')[0]);
}
const pastDates = [];
for (let i = 1; i <= 7; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  pastDates.push(d.toISOString().split('T')[0]);
}

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced');

    // --- Operators ---
    const operatorData = [
      { company_name: 'Mountain Express', company_name_nepali: '\u092E\u093E\u0909\u0928\u094D\u091F\u0947\u0928 \u090F\u0915\u094D\u0938\u094D\u092A\u094D\u0930\u0947\u0938', license_number: 'ME-004', contact_person: 'Laxmi Gurung', phone_number: '061-555777', email: 'info@mountainexpress.com.np', address: 'Pokhara, Nepal', status: 'APPROVED', commission_rate: 10 },
      { company_name: 'Terai Deluxe Bus Services', company_name_nepali: '\u0924\u0930\u093E\u0908 \u0921\u093F\u0932\u0915\u094D\u0938 \u092C\u0938 \u0938\u0930\u094D\u092D\u093F\u0938\u0947\u091C', license_number: 'TD-005', contact_person: 'Rajendra Prasad Yadav', phone_number: '021-445566', email: 'info@teraideluxe.com.np', address: 'Biratnagar, Nepal', status: 'APPROVED', commission_rate: 9 },
      { company_name: 'Himali Yatayat', company_name_nepali: '\u0939\u093F\u092E\u093E\u0932\u0940 \u092F\u093E\u0924\u093E\u092F\u093E\u0924', license_number: 'HY-006', contact_person: 'Mingma Sherpa', phone_number: '01-555666', email: 'info@himaliyatayat.com.np', address: 'Kathmandu, Nepal', status: 'APPROVED', commission_rate: 11 },
      { company_name: 'Gorkha Dreamline', company_name_nepali: '\u0917\u094B\u0930\u0916\u093E \u0921\u094D\u0930\u093F\u092E\u0932\u093E\u0907\u0928', license_number: 'GD-007', contact_person: 'Binod Gurung', phone_number: '01-666777', email: 'info@gorkhadreamline.com.np', address: 'Kathmandu, Nepal', status: 'APPROVED', commission_rate: 10 },
      { company_name: 'National Express', company_name_nepali: '\u0928\u0947\u0936\u0928\u0932 \u090F\u0915\u094D\u0938\u094D\u092A\u094D\u0930\u0947\u0938', license_number: 'NE-008', contact_person: 'Anil Kumar Singh', phone_number: '051-334455', email: 'info@nationalexpess.com.np', address: 'Nepalgunj, Nepal', status: 'APPROVED', commission_rate: 8 },
    ];
    await Operator.bulkCreate(operatorData, { ignoreDuplicates: true });
    console.log('Operators upserted');

    // --- Cities ---
    const cityData = [
      { name: 'Kathmandu', name_nepali: '\u0915\u093E\u0920\u092E\u093E\u0921\u094C\u0902', district: 'Kathmandu', province: 'Bagmati', latitude: 27.7172, longitude: 85.3240, is_major_city: true },
      { name: 'Pokhara', name_nepali: '\u092A\u094B\u0916\u0930\u093E', district: 'Kaski', province: 'Gandaki', latitude: 28.2096, longitude: 83.9856, is_major_city: true },
      { name: 'Chitwan', name_nepali: '\u091A\u093F\u0924\u0935\u0928', district: 'Chitwan', province: 'Bagmati', latitude: 27.5292, longitude: 84.3542, is_major_city: true },
      { name: 'Biratnagar', name_nepali: '\u0935\u0940\u0930\u0928\u0917\u0930', district: 'Morang', province: 'Koshi', latitude: 26.4525, longitude: 87.2640, is_major_city: true },
      { name: 'Bharatpur', name_nepali: '\u092D\u0930\u0924\u092A\u0941\u0930', district: 'Chitwan', province: 'Bagmati', latitude: 27.6800, longitude: 84.4400, is_major_city: true },
      { name: 'Lalitpur', name_nepali: '\u0932\u0932\u093F\u0924\u092A\u0941\u0930', district: 'Lalitpur', province: 'Bagmati', latitude: 27.6644, longitude: 85.3188, is_major_city: true },
      { name: 'Birgunj', name_nepali: '\u0935\u0940\u0930\u0917\u091E\u094D\u091C', district: 'Parsa', province: 'Bagmati', latitude: 27.0000, longitude: 84.8500, is_major_city: true },
      { name: 'Butwal', name_nepali: '\u092C\u0941\u091F\u0935\u0932', district: 'Rupandehi', province: 'Lumbini', latitude: 27.5000, longitude: 83.4667, is_major_city: true },
      { name: 'Dharan', name_nepali: '\u0927\u0930\u093E\u0928', district: 'Sunsari', province: 'Koshi', latitude: 26.8130, longitude: 87.2640, is_major_city: true },
      { name: 'Hetauda', name_nepali: '\u0939\u0947\u091F\u094C\u0921\u093E', district: 'Makwanpur', province: 'Bagmati', latitude: 27.4287, longitude: 84.9960, is_major_city: true },
      { name: 'Nepalgunj', name_nepali: '\u0928\u0947\u092A\u093E\u0932\u0917\u091E\u094D\u091C', district: 'Banke', province: 'Lumbini', latitude: 28.0500, longitude: 81.6167, is_major_city: true },
      { name: 'Janakpur', name_nepali: '\u091C\u0928\u0915\u092A\u0941\u0930', district: 'Dhanusha', province: 'Madhesh', latitude: 26.7288, longitude: 85.9263, is_major_city: true },
      { name: 'Dhangadhi', name_nepali: '\u0927\u0928\u0917\u0922\u0940', district: 'Kailali', province: 'Sudurpashchim', latitude: 28.6833, longitude: 80.6000, is_major_city: true },
      { name: 'Itahari', name_nepali: '\u0907\u091F\u0939\u0930\u0940', district: 'Sunsari', province: 'Koshi', latitude: 26.6667, longitude: 87.2833, is_major_city: false },
      { name: 'Birtamod', name_nepali: '\u0935\u093F\u0930\u093E\u091F\u092E\u094B\u0921', district: 'Jhapa', province: 'Koshi', latitude: 26.6333, longitude: 87.9833, is_major_city: false },
      { name: 'Gorkha', name_nepali: '\u0917\u094B\u0930\u0916\u093E', district: 'Gorkha', province: 'Gandaki', latitude: 28.0000, longitude: 84.6333, is_major_city: false },
      { name: 'Palpa', name_nepali: '\u092A\u093E\u0932\u094D\u092A\u093E', district: 'Palpa', province: 'Lumbini', latitude: 27.8667, longitude: 83.5400, is_major_city: false },
      { name: 'Ilam', name_nepali: '\u0907\u0932\u093E\u092E', district: 'Ilam', province: 'Koshi', latitude: 26.9131, longitude: 87.9264, is_major_city: false },
      { name: 'Solukhumbu', name_nepali: '\u0938\u094B\u0932\u0941\u0916\u0941\u092E\u094D\u092C\u0941', district: 'Solukhumbu', province: 'Koshi', latitude: 27.5000, longitude: 86.5833, is_major_city: false },
      { name: 'Surkhet', name_nepali: '\u0938\u0941\u0930\u094D\u0916\u0947\u091F', district: 'Surkhet', province: 'Karnali', latitude: 28.5167, longitude: 81.6333, is_major_city: false },
      { name: 'Damak', name_nepali: '\u0921\u092E\u0915', district: 'Jhapa', province: 'Koshi', latitude: 26.6133, longitude: 87.9383, is_major_city: false },
      { name: 'Lumbini', name_nepali: '\u0932\u0941\u092E\u094D\u092C\u093F\u0928\u0940', district: 'Rupandehi', province: 'Lumbini', latitude: 27.4833, longitude: 83.2767, is_major_city: false },
      { name: 'Bandipur', name_nepali: '\u092C\u0928\u094D\u0926\u0940\u092A\u0941\u0930', district: 'Tanahu', province: 'Gandaki', latitude: 27.9353, longitude: 84.4108, is_major_city: false },
      { name: 'Besisahar', name_nepali: '\u092C\u0947\u0938\u0940\u0938\u0939\u0930', district: 'Lamjung', province: 'Gandaki', latitude: 28.2344, longitude: 84.3742, is_major_city: false },
      { name: 'Taplejung', name_nepali: '\u0924\u093E\u092A\u094D\u0932\u0947\u091C\u0941\u092E\u0917', district: 'Taplejung', province: 'Koshi', latitude: 27.3500, longitude: 87.6667, is_major_city: false },
      { name: 'Rasuwa', name_nepali: '\u0930\u0938\u0941\u0935\u093E', district: 'Rasuwa', province: 'Bagmati', latitude: 28.1000, longitude: 85.3333, is_major_city: false },
      { name: 'Syangja', name_nepali: '\u0938\u094D\u092F\u093E\u0902\u091C\u093E', district: 'Syangja', province: 'Gandaki', latitude: 28.0833, longitude: 83.8667, is_major_city: false },
      { name: 'Kaski', name_nepali: '\u0915\u093E\u0938\u094D\u0915\u0940', district: 'Kaski', province: 'Gandaki', latitude: 28.2500, longitude: 84.0000, is_major_city: false },
      { name: 'Morang', name_nepali: '\u092E\u094B\u0930\u0902\u0917', district: 'Morang', province: 'Koshi', latitude: 26.5000, longitude: 87.5000, is_major_city: false },
      { name: 'Sunsari', name_nepali: '\u0938\u0941\u0928\u094D\u0938\u0930\u0940', district: 'Sunsari', province: 'Koshi', latitude: 26.7500, longitude: 87.1667, is_major_city: false },
    ];
    await City.bulkCreate(cityData, { ignoreDuplicates: true });
    console.log('Cities upserted');

    const allOperators = await Operator.findAll({ order: [['id', 'ASC']] });
    const allCities = await City.findAll({ order: [['id', 'ASC']] });
    const operatorMap = {};
    for (const op of allOperators) operatorMap[op.license_number] = op.id;
    console.log(`Found ${allOperators.length} operators, ${allCities.length} cities`);

    // --- Buses ---
    const existingBuses = await Bus.findAll({ attributes: ['bus_number'] });
    const existingBusNumbers = new Set(existingBuses.map(b => b.bus_number));
    const newBusData = [
      { bus_number: 'BA-4-CHA-7890', bus_model: 'Yutong ZK6122', bus_type: 'DELUXE', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-4-DA-1111', bus_model: 'King Long', bus_type: 'SUPER_DELUXE', total_seats: 28, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-5-GHA-2222', bus_model: 'Tata Marcopolo', bus_type: 'DELUXE', total_seats: 42, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-5-CHA-3333', bus_model: 'Ashok Leyland', bus_type: 'AC', total_seats: 38, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket'] },
      { bus_number: 'BA-6-DA-4444', bus_model: 'Volvo 9800', bus_type: 'SUPER_DELUXE', total_seats: 32, seat_layout: seatLayout(8, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks'] },
      { bus_number: 'BA-6-CHA-5555', bus_model: 'Scania K360', bus_type: 'AC', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket', 'Snacks'] },
      { bus_number: 'BA-7-DA-6666', bus_model: 'Hyundai HIbus', bus_type: 'DELUXE', total_seats: 40, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-7-GHA-7777', bus_model: 'Tata Starbus ULTRA', bus_type: 'SEMI_SLEEPER', total_seats: 34, seat_layout: seatLayout(8, 4), amenities: ['Charging', 'Water'] },
      { bus_number: 'BA-8-CHA-8888', bus_model: 'Eicher Skybus', bus_type: 'DELUXE', total_seats: 38, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-8-DA-9999', bus_model: 'Mahindra Tourister', bus_type: 'NON_AC', total_seats: 44, seat_layout: seatLayout(11, 4), amenities: ['Water'] },
      { bus_number: 'BA-9-CHA-1010', bus_model: 'Yutong ZK6100', bus_type: 'DELUXE', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-9-DA-2020', bus_model: 'Volvo B9R', bus_type: 'SUPER_DELUXE', total_seats: 30, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-10-CHA-3030', bus_model: 'Scania K310', bus_type: 'AC', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket'] },
      { bus_number: 'BA-10-DA-4040', bus_model: 'Tata Prima', bus_type: 'DELUXE', total_seats: 40, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-11-CHA-5050', bus_model: 'Ashok Leyland Viking', bus_type: 'NON_AC', total_seats: 48, seat_layout: seatLayout(12, 4), amenities: ['Water'] },
      { bus_number: 'BA-12-CHA-6060', bus_model: 'Volvo 9400', bus_type: 'SUPER_DELUXE', total_seats: 32, seat_layout: seatLayout(8, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-12-DA-7070', bus_model: 'Scania K410', bus_type: 'AC', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket', 'Snacks'] },
      { bus_number: 'BA-13-CHA-8080', bus_model: 'Tata Marcopolo AV', bus_type: 'DELUXE', total_seats: 42, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-13-DA-9090', bus_model: 'Yutong ZK6129', bus_type: 'SUPER_DELUXE', total_seats: 28, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-14-CHA-1112', bus_model: 'Ashok Leyland Viking', bus_type: 'NON_AC', total_seats: 48, seat_layout: seatLayout(12, 4), amenities: ['Water'] },
      { bus_number: 'BA-14-DA-1314', bus_model: 'Eicher Skybus Pro', bus_type: 'DELUXE', total_seats: 38, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-15-CHA-1516', bus_model: 'Hyundai Universe', bus_type: 'AC', total_seats: 34, seat_layout: seatLayout(8, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket'] },
      { bus_number: 'BA-15-DA-1718', bus_model: 'Tata Starbus Gold', bus_type: 'DELUXE', total_seats: 40, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-16-CHA-1920', bus_model: 'Volvo B11R', bus_type: 'SUPER_DELUXE', total_seats: 30, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-16-DA-2122', bus_model: 'Scania Multi', bus_type: 'AC', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket', 'Snacks'] },
      { bus_number: 'BA-17-CHA-2324', bus_model: 'Mahindra Duro', bus_type: 'NON_AC', total_seats: 44, seat_layout: seatLayout(11, 4), amenities: ['Water'] },
      { bus_number: 'BA-17-DA-2526', bus_model: 'Yutong ZK6826', bus_type: 'DELUXE', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-18-CHA-2728', bus_model: 'King Long XMQ6127', bus_type: 'SUPER_DELUXE', total_seats: 32, seat_layout: seatLayout(8, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks'] },
      { bus_number: 'BA-18-DA-2930', bus_model: 'Tata Prima LX', bus_type: 'DELUXE', total_seats: 40, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-19-CHA-3132', bus_model: 'Ashok Leyland Oyster', bus_type: 'AC', total_seats: 38, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket'] },
      { bus_number: 'BA-19-DA-3334', bus_model: 'Eicher Skybus Elite', bus_type: 'DELUXE', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-20-CHA-3536', bus_model: 'Volvo 9700', bus_type: 'SUPER_DELUXE', total_seats: 30, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-20-DA-3738', bus_model: 'Scania Touring', bus_type: 'AC', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket', 'Snacks'] },
      { bus_number: 'BA-21-CHA-3940', bus_model: 'Tata Marcopolo Category', bus_type: 'DELUXE', total_seats: 42, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-21-DA-4142', bus_model: 'Yutong ZK6145', bus_type: 'SUPER_DELUXE', total_seats: 28, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-22-CHA-4344', bus_model: 'Hyundai County', bus_type: 'DELUXE', total_seats: 34, seat_layout: seatLayout(8, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-22-DA-4546', bus_model: 'Mahindra Road Star', bus_type: 'NON_AC', total_seats: 44, seat_layout: seatLayout(11, 4), amenities: ['Water'] },
      { bus_number: 'BA-23-CHA-4748', bus_model: 'Ashok Leyland Vestal', bus_type: 'AC', total_seats: 38, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket'] },
      { bus_number: 'BA-23-DA-4950', bus_model: 'Tata Starbus Ultra', bus_type: 'DELUXE', total_seats: 40, seat_layout: seatLayout(10, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-24-CHA-5152', bus_model: 'Volvo B8R', bus_type: 'SUPER_DELUXE', total_seats: 32, seat_layout: seatLayout(8, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks', 'Blanket'] },
      { bus_number: 'BA-24-DA-5354', bus_model: 'Scania Higer', bus_type: 'AC', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['AC', 'WiFi', 'Charging', 'Water', 'Blanket', 'Snacks'] },
      { bus_number: 'BA-25-CHA-5556', bus_model: 'Yutong ZK6125', bus_type: 'DELUXE', total_seats: 36, seat_layout: seatLayout(9, 4), amenities: ['WiFi', 'Charging', 'Water'] },
      { bus_number: 'BA-25-DA-5758', bus_model: 'King Long XMQ6900', bus_type: 'SUPER_DELUXE', total_seats: 30, seat_layout: seatLayout(7, 4), amenities: ['WiFi', 'Charging', 'Water', 'Snacks'] },
    ];
    const operatorLicenseList = ['ME-004', 'ME-004', 'TD-005', 'TD-005', 'HY-006', 'HY-006', 'GD-007', 'GD-007', 'NE-008', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008'];
    const busesToCreate = newBusData
      .filter(b => !existingBusNumbers.has(b.bus_number))
      .map((b, i) => ({ ...b, operator_id: operatorMap[operatorLicenseList[i]], status: 'ACTIVE' }));
    if (busesToCreate.length > 0) {
      await Bus.bulkCreate(busesToCreate);
      console.log(`Created ${busesToCreate.length} new buses`);
    } else {
      console.log('All buses already exist');
    }

    // --- Routes ---
    const existingRoutes = await Route.findAll({ attributes: ['route_name'] });
    const existingRouteNames = new Set(existingRoutes.map(r => r.route_name));
    const newRouteData = [
      { route_name: 'Kathmandu - Gorkha Express', origin_city: 'Kathmandu', destination_city: 'Gorkha', distance_km: 140, estimated_duration_minutes: 240, base_fare: 700, stops: [] },
      { route_name: 'Pokhara - Chitwan Safari', origin_city: 'Pokhara', destination_city: 'Chitwan', distance_km: 170, estimated_duration_minutes: 300, base_fare: 1000, stops: [] },
      { route_name: 'Biratnagar - Kathmandu Express', origin_city: 'Biratnagar', destination_city: 'Kathmandu', distance_km: 365, estimated_duration_minutes: 600, base_fare: 1800, stops: [] },
      { route_name: 'Biratnagar - Janakpur', origin_city: 'Biratnagar', destination_city: 'Janakpur', distance_km: 180, estimated_duration_minutes: 300, base_fare: 800, stops: [] },
      { route_name: 'Kathmandu - Solukhumbu Explorer', origin_city: 'Kathmandu', destination_city: 'Solukhumbu', distance_km: 300, estimated_duration_minutes: 600, base_fare: 1500, stops: [] },
      { route_name: 'Kathmandu - Ilam Premium', origin_city: 'Kathmandu', destination_city: 'Ilam', distance_km: 420, estimated_duration_minutes: 720, base_fare: 2000, stops: [] },
      { route_name: 'Kathmandu - Palpa Link', origin_city: 'Kathmandu', destination_city: 'Palpa', distance_km: 280, estimated_duration_minutes: 480, base_fare: 1300, stops: [] },
      { route_name: 'Kathmandu - Dharan Direct', origin_city: 'Kathmandu', destination_city: 'Dharan', distance_km: 320, estimated_duration_minutes: 540, base_fare: 1600, stops: [] },
      { route_name: 'Nepalgunj - Kathmandu Express', origin_city: 'Nepalgunj', destination_city: 'Kathmandu', distance_km: 500, estimated_duration_minutes: 720, base_fare: 2200, stops: [] },
      { route_name: 'Nepalgunj - Pokhara', origin_city: 'Nepalgunj', destination_city: 'Pokhara', distance_km: 320, estimated_duration_minutes: 480, base_fare: 1400, stops: [] },
      { route_name: 'Dhangadhi - Kathmandu Deluxe', origin_city: 'Dhangadhi', destination_city: 'Kathmandu', distance_km: 620, estimated_duration_minutes: 900, base_fare: 2500, stops: [] },
      { route_name: 'Butwal - Kathmandu Express', origin_city: 'Butwal', destination_city: 'Kathmandu', distance_km: 260, estimated_duration_minutes: 420, base_fare: 1100, stops: [] },
      { route_name: 'Hetauda - Kathmandu', origin_city: 'Hetauda', destination_city: 'Kathmandu', distance_km: 140, estimated_duration_minutes: 240, base_fare: 600, stops: [] },
      { route_name: 'Bharatpur - Kathmandu', origin_city: 'Bharatpur', destination_city: 'Kathmandu', distance_km: 170, estimated_duration_minutes: 300, base_fare: 750, stops: [] },
      { route_name: 'Janakpur - Kathmandu Express', origin_city: 'Janakpur', destination_city: 'Kathmandu', distance_km: 400, estimated_duration_minutes: 660, base_fare: 1900, stops: [] },
      { route_name: 'Dharan - Pokhara', origin_city: 'Dharan', destination_city: 'Pokhara', distance_km: 280, estimated_duration_minutes: 480, base_fare: 1200, stops: [] },
      { route_name: 'Birgunj - Kathmandu', origin_city: 'Birgunj', destination_city: 'Kathmandu', distance_km: 270, estimated_duration_minutes: 420, base_fare: 1100, stops: [] },
      { route_name: 'Lalitpur - Chitwan', origin_city: 'Lalitpur', destination_city: 'Chitwan', distance_km: 160, estimated_duration_minutes: 270, base_fare: 700, stops: [] },
      { route_name: 'Itahari - Kathmandu', origin_city: 'Itahari', destination_city: 'Kathmandu', distance_km: 340, estimated_duration_minutes: 560, base_fare: 1600, stops: [] },
      { route_name: 'Birtamod - Kathmandu', origin_city: 'Birtamod', destination_city: 'Kathmandu', distance_km: 400, estimated_duration_minutes: 660, base_fare: 1800, stops: [] },
      { route_name: 'Kathmandu - Damak Express', origin_city: 'Kathmandu', destination_city: 'Damak', distance_km: 410, estimated_duration_minutes: 680, base_fare: 1900, stops: [] },
      { route_name: 'Pokhara - Lumbini Pilgrim', origin_city: 'Pokhara', destination_city: 'Lumbini', distance_km: 180, estimated_duration_minutes: 320, base_fare: 900, stops: [] },
      { route_name: 'Kathmandu - Bandipur Scenic', origin_city: 'Kathmandu', destination_city: 'Bandipur', distance_km: 150, estimated_duration_minutes: 270, base_fare: 750, stops: [] },
      { route_name: 'Kathmandu - Besisahar Trek Start', origin_city: 'Kathmandu', destination_city: 'Besisahar', distance_km: 180, estimated_duration_minutes: 320, base_fare: 850, stops: [] },
      { route_name: 'Biratnagar - Dharan Express', origin_city: 'Biratnagar', destination_city: 'Dharan', distance_km: 60, estimated_duration_minutes: 120, base_fare: 350, stops: [] },
      { route_name: 'Kathmandu - Taplejung Adventure', origin_city: 'Kathmandu', destination_city: 'Taplejung', distance_km: 520, estimated_duration_minutes: 840, base_fare: 2400, stops: [] },
      { route_name: 'Pokhara - Gorkha Heritage', origin_city: 'Pokhara', destination_city: 'Gorkha', distance_km: 120, estimated_duration_minutes: 210, base_fare: 600, stops: [] },
      { route_name: 'Kathmandu - Rasuwa Gateway', origin_city: 'Kathmandu', destination_city: 'Rasuwa', distance_km: 120, estimated_duration_minutes: 210, base_fare: 550, stops: [] },
      { route_name: 'Kathmandu - Syangja Hills', origin_city: 'Kathmandu', destination_city: 'Syangja', distance_km: 220, estimated_duration_minutes: 390, base_fare: 1000, stops: [] },
      { route_name: 'Chitwan - Pokhara Nature', origin_city: 'Chitwan', destination_city: 'Pokhara', distance_km: 170, estimated_duration_minutes: 300, base_fare: 1000, stops: [] },
      { route_name: 'Butwal - Pokhara Express', origin_city: 'Butwal', destination_city: 'Pokhara', distance_km: 150, estimated_duration_minutes: 270, base_fare: 700, stops: [] },
      { route_name: 'Hetauda - Bharatpur Link', origin_city: 'Hetauda', destination_city: 'Bharatpur', distance_km: 50, estimated_duration_minutes: 90, base_fare: 300, stops: [] },
      { route_name: 'Kathmandu - Surkhet Western', origin_city: 'Kathmandu', destination_city: 'Surkhet', distance_km: 450, estimated_duration_minutes: 720, base_fare: 2100, stops: [] },
      { route_name: 'Nepalgunj - Surkhet Connector', origin_city: 'Nepalgunj', destination_city: 'Surkhet', distance_km: 140, estimated_duration_minutes: 240, base_fare: 650, stops: [] },
      { route_name: 'Birgunj - Janakpur Express', origin_city: 'Birgunj', destination_city: 'Janakpur', distance_km: 180, estimated_duration_minutes: 300, base_fare: 800, stops: [] },
      { route_name: 'Dhangadhi - Nepalgunj Link', origin_city: 'Dhangadhi', destination_city: 'Nepalgunj', distance_km: 220, estimated_duration_minutes: 360, base_fare: 1000, stops: [] },
      { route_name: 'Itahari - Biratnagar Shuttle', origin_city: 'Itahari', destination_city: 'Biratnagar', distance_km: 50, estimated_duration_minutes: 90, base_fare: 250, stops: [] },
      { route_name: 'Birtamod - Ilam Tea Route', origin_city: 'Birtamod', destination_city: 'Ilam', distance_km: 120, estimated_duration_minutes: 210, base_fare: 550, stops: [] },
      { route_name: 'Kathmandu - Kaski Express', origin_city: 'Kathmandu', destination_city: 'Kaski', distance_km: 200, estimated_duration_minutes: 350, base_fare: 950, stops: [] },
      { route_name: 'Bharatpur - Hetauda Express', origin_city: 'Bharatpur', destination_city: 'Hetauda', distance_km: 50, estimated_duration_minutes: 90, base_fare: 300, stops: [] },
    ];
    const routeOpLicenses = ['ME-004', 'ME-004', 'TD-005', 'TD-005', 'HY-006', 'HY-006', 'GD-007', 'GD-007', 'NE-008', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008', 'ME-004', 'TD-005', 'HY-006', 'GD-007', 'NE-008'];
    const routesToCreate = newRouteData
      .filter(r => !existingRouteNames.has(r.route_name))
      .map((r, i) => ({ ...r, operator_id: operatorMap[routeOpLicenses[i]], is_active: true }));
    if (routesToCreate.length > 0) {
      await Route.bulkCreate(routesToCreate);
      console.log(`Created ${routesToCreate.length} new routes`);
    } else {
      console.log('All routes already exist');
    }

    // --- Trips ---
    const allRoutes = await Route.findAll();
    const allBuses = await Bus.findAll();
    const drivers = [
      { name: 'Krishna Prasad', phone: '9841000001' },
      { name: 'Suresh Thapa', phone: '9841000003' },
      { name: 'Rajesh Rai', phone: '9841000005' },
      { name: 'Prakash Adhikari', phone: '9841000007' },
      { name: 'Dipak Ghale', phone: '9841000009' },
      { name: 'Manoj Singh', phone: '9841000011' },
      { name: 'Bikash Tamang', phone: '9841000013' },
      { name: 'Sanjay Bhandari', phone: '9841000015' },
    ];
    const conductors = [
      { name: 'Hari Bahadur', phone: '9841000002' },
      { name: 'Deepak Gurung', phone: '9841000004' },
      { name: 'Bikash Tamang', phone: '9841000006' },
      { name: 'Nirmal Karki', phone: '9841000008' },
      { name: 'Sanjay Bhandari', phone: '9841000010' },
      { name: 'Ravi Kumar', phone: '9841000012' },
      { name: 'Prakash Ghale', phone: '9841000014' },
      { name: 'Suman Gurung', phone: '9841000016' },
    ];
    const departures = ['06:00:00', '07:30:00', '09:00:00', '10:30:00', '12:00:00', '14:00:00', '16:00:00', '18:00:00', '20:00:00', '21:30:00'];

    const existingTrips = await Trip.findAll({ attributes: ['route_id', 'trip_date', 'departure_time'] });
    const existingTripKeys = new Set(existingTrips.map(t => `${t.route_id}-${t.trip_date}-${t.departure_time}`));

    const allDates = [...pastDates, ...futureDates];
    const tripData = [];
    for (const date of allDates) {
      for (let i = 0; i < allRoutes.length; i++) {
        const route = allRoutes[i];
        const bus = allBuses[i % allBuses.length];
        const dep = departures[i % departures.length];
        const depHour = parseInt(dep.split(':')[0]);
        const durationMin = parseInt(route.get('estimated_duration_minutes')) || 360;
        const arrHour = depHour + Math.floor(durationMin / 60);
        const arr = `${String(arrHour % 24).padStart(2, '0')}:${String(durationMin % 60).padStart(2, '0')}:00`;
        const fareVariation = Math.floor(Math.random() * 200) - 100;
        const baseFare = parseFloat(route.get('base_fare')) || 1000;
        const fare = Math.max(500, baseFare + fareVariation);
        const isPast = pastDates.includes(date);
        tripData.push({
          route_id: route.id,
          bus_id: bus.id,
          trip_date: date,
          departure_time: dep,
          arrival_time: arr,
          current_fare: fare,
          available_seats: isPast ? Math.max(0, bus.total_seats - Math.floor(Math.random() * 20)) : bus.total_seats,
          status: isPast ? 'COMPLETED' : 'SCHEDULED',
          driver_name: drivers[i % drivers.length].name,
          driver_phone: drivers[i % drivers.length].phone,
          conductor_name: conductors[i % conductors.length].name,
          conductor_phone: conductors[i % conductors.length].phone,
        });
      }
    }
    const newTrips = tripData.filter(t => !existingTripKeys.has(`${t.route_id}-${t.trip_date}-${t.departure_time}`));
    if (newTrips.length > 0) {
      await Trip.bulkCreate(newTrips);
      console.log(`Created ${newTrips.length} new trips`);
    } else {
      console.log('All trips already exist');
    }

    // --- Customer Users ---
    const passwordHash = await bcrypt.hash('password123', 10);
    const customerData = [
      { phone_number: '9841123456', full_name: 'Ram Bahadur Thapa', email: 'ram@example.com', gender: 'MALE' },
      { phone_number: '9841234567', full_name: 'Sita Devi Sharma', email: 'sita@example.com', gender: 'FEMALE' },
      { phone_number: '9841345678', full_name: 'Hari Prasad Karki', email: 'hari@example.com', gender: 'MALE' },
      { phone_number: '9841456789', full_name: 'Gita Poudel', email: 'gita@example.com', gender: 'FEMALE' },
      { phone_number: '9841567890', full_name: 'Bikash Rai', email: 'bikash@example.com', gender: 'MALE' },
      { phone_number: '9841678901', full_name: 'Anita Gurung', email: 'anita@example.com', gender: 'FEMALE' },
      { phone_number: '9841789012', full_name: 'Deepak Magar', email: 'deepak@example.com', gender: 'MALE' },
      { phone_number: '9841890123', full_name: 'Priya Tamang', email: 'priya@example.com', gender: 'FEMALE' },
    ];
    const customerIds = [];
    for (const c of customerData) {
      const [user] = await User.findOrCreate({
        where: { phone_number: c.phone_number },
        defaults: { ...c, password: passwordHash, status: 'ACTIVE' },
      });
      await UserRole.findOrCreate({ where: { user_id: user.id, role: 'CUSTOMER' }, defaults: { user_id: user.id, role: 'CUSTOMER', is_active: true } });
      await UserWallet.findOrCreate({ where: { user_id: user.id }, defaults: { user_id: user.id, balance: Math.floor(Math.random() * 5000) + 500 } });
      customerIds.push(user.id);
    }
    console.log(`Seeded ${customerData.length} customer users`);

    // --- Admin & Operator users ---
    const [admin] = await User.findOrCreate({
      where: { phone_number: '9800000001' },
      defaults: { full_name: 'Admin User', email: 'admin@samayadeluxe.com', password: passwordHash, status: 'ACTIVE' },
    });
    await UserRole.findOrCreate({ where: { user_id: admin.id, role: 'SUPER_ADMIN' }, defaults: { user_id: admin.id, role: 'SUPER_ADMIN', is_active: true } });
    await UserWallet.findOrCreate({ where: { user_id: admin.id }, defaults: { user_id: admin.id, balance: 0 } });

    const [operatorUser] = await User.findOrCreate({
      where: { phone_number: '9800000002' },
      defaults: { full_name: 'Operator User', email: 'operator@samayadeluxe.com', password: passwordHash, status: 'ACTIVE' },
    });
    const firstOp = await Operator.findOne();
    await UserRole.findOrCreate({ where: { user_id: operatorUser.id, role: 'OPERATOR' }, defaults: { user_id: operatorUser.id, role: 'OPERATOR', operator_id: firstOp?.id, is_active: true } });
    await UserWallet.findOrCreate({ where: { user_id: operatorUser.id }, defaults: { user_id: operatorUser.id, balance: 0 } });

    // --- Sample Bookings ---
    const allTrips = await Trip.findAll({ include: [{ model: Route, as: 'route' }, { model: Bus, as: 'bus' }], order: [['id', 'ASC']] });
    const futureTrips = allTrips.filter(t => t.status === 'SCHEDULED');
    const pastTrips = allTrips.filter(t => t.status === 'COMPLETED');

    const existingBookings = await Booking.findAll();
    if (existingBookings.length > 5) {
      console.log(`Skipping bookings (${existingBookings.length} already exist)`);
    } else {
      const passengerNames = [
        ['Ram Thapa', 'Sita Thapa'], ['Hari Karki'], ['Gita Sharma', 'Ram Sharma', 'Sita Sharma'],
        ['Bikash Rai', 'Anita Rai'], ['Deepak Magar'], ['Priya Tamang', 'Bikash Tamang'],
        ['Anita Gurung', 'Deepak Gurung', 'Gita Gurung'], ['Hari Bahadur'],
      ];
      const genders = ['MALE', 'FEMALE'];
      const idTypes = ['CITIZENSHIP', 'PASSPORT'];

      const bookingsToCreate = [];

      // Future confirmed bookings
      for (let i = 0; i < Math.min(12, futureTrips.length); i++) {
        const trip = futureTrips[i];
        const userId = customerIds[i % customerIds.length];
        const names = passengerNames[i % passengerNames.length];
        const totalPassengers = names.length;
        const subtotal = trip.current_fare * totalPassengers;
        const taxAmount = Math.round(subtotal * 0.13 * 100) / 100;
        const serviceFee = 50 * totalPassengers;
        const totalAmount = Math.round((subtotal + taxAmount + serviceFee) * 100) / 100;

        bookingsToCreate.push({
          pnr: generatePNR(),
          user_id: userId,
          trip_id: trip.id,
          total_passengers: totalPassengers,
          base_amount: trip.current_fare,
          tax_amount: taxAmount,
          service_fee: serviceFee,
          total_amount: totalAmount,
          payment_status: 'COMPLETED',
          booking_status: 'CONFIRMED',
          booking_date: new Date(Date.now() - Math.random() * 86400000 * 3),
          passengers: names.map((name, j) => ({
            passenger_name: name,
            age: 20 + Math.floor(Math.random() * 40),
            gender: genders[Math.floor(Math.random() * genders.length)],
            seat_number: `${(j % 10) + 1}${String.fromCharCode(65 + (j % 4))}`,
            id_type: idTypes[Math.floor(Math.random() * idTypes.length)],
            id_number: `${10000000 + Math.floor(Math.random() * 90000000)}`,
          })),
        });
      }

      // Past completed bookings
      for (let i = 0; i < Math.min(8, pastTrips.length); i++) {
        const trip = pastTrips[i];
        const userId = customerIds[i % customerIds.length];
        const names = passengerNames[(i + 3) % passengerNames.length];
        const totalPassengers = names.length;
        const subtotal = trip.current_fare * totalPassengers;
        const taxAmount = Math.round(subtotal * 0.13 * 100) / 100;
        const serviceFee = 50 * totalPassengers;
        const totalAmount = Math.round((subtotal + taxAmount + serviceFee) * 100) / 100;

        bookingsToCreate.push({
          pnr: generatePNR(),
          user_id: userId,
          trip_id: trip.id,
          total_passengers: totalPassengers,
          base_amount: trip.current_fare,
          tax_amount: taxAmount,
          service_fee: serviceFee,
          total_amount: totalAmount,
          payment_status: 'COMPLETED',
          booking_status: 'COMPLETED',
          booking_date: new Date(Date.now() - Math.random() * 86400000 * 10),
          passengers: names.map((name, j) => ({
            passenger_name: name,
            age: 20 + Math.floor(Math.random() * 40),
            gender: genders[Math.floor(Math.random() * genders.length)],
            seat_number: `${(j % 10) + 1}${String.fromCharCode(65 + (j % 4))}`,
            id_type: idTypes[Math.floor(Math.random() * idTypes.length)],
            id_number: `${10000000 + Math.floor(Math.random() * 90000000)}`,
          })),
        });
      }

      // A couple cancelled bookings
      for (let i = 0; i < Math.min(2, futureTrips.length - 12); i++) {
        const trip = futureTrips[12 + i];
        if (!trip) continue;
        const userId = customerIds[(i + 4) % customerIds.length];
        const names = passengerNames[(i + 5) % passengerNames.length];
        const totalPassengers = names.length;
        const subtotal = trip.current_fare * totalPassengers;
        const taxAmount = Math.round(subtotal * 0.13 * 100) / 100;
        const serviceFee = 50 * totalPassengers;
        const totalAmount = Math.round((subtotal + taxAmount + serviceFee) * 100) / 100;

        bookingsToCreate.push({
          pnr: generatePNR(),
          user_id: userId,
          trip_id: trip.id,
          total_passengers: totalPassengers,
          base_amount: trip.current_fare,
          tax_amount: taxAmount,
          service_fee: serviceFee,
          total_amount: totalAmount,
          payment_status: 'REFUNDED',
          booking_status: 'CANCELLED',
          cancellation_reason: 'Change of plans',
          refund_amount: Math.round(totalAmount * 0.75 * 100) / 100,
          booking_date: new Date(Date.now() - Math.random() * 86400000 * 5),
          passengers: names.map((name, j) => ({
            passenger_name: name,
            age: 20 + Math.floor(Math.random() * 40),
            gender: genders[Math.floor(Math.random() * genders.length)],
            seat_number: `${(j % 10) + 1}${String.fromCharCode(65 + (j % 4))}`,
            id_type: idTypes[Math.floor(Math.random() * idTypes.length)],
            id_number: `${10000000 + Math.floor(Math.random() * 90000000)}`,
          })),
        });
      }

      let bookingCount = 0;
      for (const bData of bookingsToCreate) {
        try {
          const booking = await Booking.create({
            pnr: bData.pnr,
            user_id: bData.user_id,
            trip_id: bData.trip_id,
            total_passengers: bData.total_passengers,
            base_amount: bData.base_amount,
            tax_amount: bData.tax_amount,
            service_fee: bData.service_fee,
            total_amount: bData.total_amount,
            payment_status: bData.payment_status,
            booking_status: bData.booking_status,
            cancellation_reason: bData.cancellation_reason,
            refund_amount: bData.refund_amount,
            booking_date: bData.booking_date,
          });
          for (const p of bData.passengers) {
            await BookingPassenger.create({ booking_id: booking.id, ...p });
          }
          // Create payment record for completed bookings
          if (bData.payment_status === 'COMPLETED') {
            await Payment.create({
              booking_id: booking.id,
              payment_method: 'WALLET',
              amount: bData.total_amount,
              currency: 'NPR',
              status: 'SUCCESS',
              gateway_transaction_id: `wallet_${generatePNR().substr(0, 8)}`,
            });
          }
          // Update trip available seats
          await Trip.update(
            { available_seats: Math.max(0, (await Trip.findByPk(bData.trip_id)).available_seats - bData.total_passengers) },
            { where: { id: bData.trip_id } }
          );
          bookingCount++;
        } catch (e) {
          // skip duplicate bookings
        }
      }
      console.log(`Created ${bookingCount} sample bookings with passengers`);
    }

    // --- Final counts ---
    const counts = {
      operators: await Operator.count(),
      cities: await City.count(),
      buses: await Bus.count(),
      routes: await Route.count(),
      trips: await Trip.count(),
      users: await User.count(),
      bookings: await Booking.count(),
      passengers: await BookingPassenger.count(),
      payments: await Payment.count(),
    };
    console.log('\nSeed complete!');
    console.log('---');
    console.log(`Operators: ${counts.operators}`);
    console.log(`Cities: ${counts.cities}`);
    console.log(`Buses: ${counts.buses}`);
    console.log(`Routes: ${counts.routes}`);
    console.log(`Trips: ${counts.trips}`);
    console.log(`Users: ${counts.users}`);
    console.log(`Bookings: ${counts.bookings}`);
    console.log(`Passengers: ${counts.passengers}`);
    console.log(`Payments: ${counts.payments}`);
    console.log('---');
    console.log('\nCustomer login: 9841123456 / password123');
    console.log('Admin login: 9800000001 / password123');
    console.log('Operator login: 9800000002 / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
