const { sequelize } = require('./models');
const { Operator, City, Bus, Route, Trip, User, UserRole, UserWallet } = require('./models');
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

const today = new Date();
const dates = [];
for (let i = 1; i <= 7; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  dates.push(d.toISOString().split('T')[0]);
}

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // --- Operators (add more) ---
    await Operator.bulkCreate([
      { company_name: 'Mountain Express', company_name_nepali: 'माउन्टेन एक्सप्रेस', license_number: 'ME-004', contact_person: 'Laxmi Gurung', phone_number: '061-555777', email: 'info@mountainexpress.com.np', address: 'Pokhara, Nepal', status: 'APPROVED', commission_rate: 10 },
      { company_name: 'Terai Deluxe Bus Services', company_name_nepali: 'तराई डिलक्स बस सर्भिसेज', license_number: 'TD-005', contact_person: 'Rajendra Prasad Yadav', phone_number: '021-445566', email: 'info@teraideluxe.com.np', address: 'Biratnagar, Nepal', status: 'APPROVED', commission_rate: 9 },
      { company_name: 'Himali Yatayat', company_name_nepali: 'हिमाली यातायात', license_number: 'HY-006', contact_person: 'Mingma Sherpa', phone_number: '01-555666', email: 'info@himaliyatayat.com.np', address: 'Kathmandu, Nepal', status: 'APPROVED', commission_rate: 11 },
      { company_name: 'Gorkha Dreamline', company_name_nepali: 'गोरखा ड्रिमलाइन', license_number: 'GD-007', contact_person: 'Binod Gurung', phone_number: '01-666777', email: 'info@gorkhadreamline.com.np', address: 'Kathmandu, Nepal', status: 'APPROVED', commission_rate: 10 },
      { company_name: 'National Express', company_name_nepali: 'नेशनल एक्सप्रेस', license_number: 'NE-008', contact_person: 'Anil Kumar Singh', phone_number: '051-334455', email: 'info@nationalexpess.com.np', address: 'Nepalgunj, Nepal', status: 'APPROVED', commission_rate: 8 },
    ], { ignoreDuplicates: true });
    console.log('✅ Operators upserted');

    // --- Cities (add more) ---
    await City.bulkCreate([
      { name: 'Chitwan', name_nepali: 'चितवन', district: 'Chitwan', province: 'Bagmati', latitude: 27.5292, longitude: 84.3542, is_major_city: false },
      { name: 'Ilam', name_nepali: 'इलाम', district: 'Ilam', province: 'Koshi', latitude: 26.9131, longitude: 87.9264, is_major_city: false },
      { name: 'Gorkha', name_nepali: 'गोरखा', district: 'Gorkha', province: 'Gandaki', latitude: 28.0000, longitude: 84.6333, is_major_city: false },
      { name: 'Palpa', name_nepali: 'पाल्पा', district: 'Palpa', province: 'Lumbini', latitude: 27.8667, longitude: 83.5400, is_major_city: false },
      { name: 'Taplejung', name_nepali: 'ताप्लेजुङ', district: 'Taplejung', province: 'Koshi', latitude: 27.3500, longitude: 87.6667, is_major_city: false },
      { name: 'Solukhumbu', name_nepali: 'सोलुखुम्बु', district: 'Solukhumbu', province: 'Koshi', latitude: 27.5000, longitude: 86.5833, is_major_city: false },
      { name: 'Kaski', name_nepali: 'कास्की', district: 'Kaski', province: 'Gandaki', latitude: 28.2096, longitude: 83.9856, is_major_city: false },
      { name: 'Rupandehi', name_nepali: 'रुपन्देही', district: 'Rupandehi', province: 'Lumbini', latitude: 27.5000, longitude: 83.4667, is_major_city: false },
    ], { ignoreDuplicates: true });
    console.log('✅ Cities upserted');

    // Query all operators and cities from DB (bulkCreate may return empty if duplicates)
    const allOperators = await Operator.findAll({ order: [['id', 'ASC']] });
    const allCities = await City.findAll({ order: [['id', 'ASC']] });
    console.log(`Found ${allOperators.length} operators, ${allCities.length} cities`);

    // Assign operator IDs by license number for reliable lookup
    const operatorMap = {};
    for (const op of allOperators) operatorMap[op.license_number] = op.id;

    // --- Buses (add more) ---
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
    ];

    const operatorLicenseList = ['ME-004', 'ME-004', 'TD-005', 'TD-005', 'HY-006', 'HY-006', 'GD-007', 'GD-007', 'NE-008', 'NE-008'];
    const busesToCreate = newBusData
      .filter(b => !existingBusNumbers.has(b.bus_number))
      .map((b, i) => ({
        ...b,
        operator_id: operatorMap[operatorLicenseList[i]],
        status: 'ACTIVE',
      }));

    if (busesToCreate.length > 0) {
      await Bus.bulkCreate(busesToCreate);
      console.log(`✅ Created ${busesToCreate.length} new buses`);
    } else {
      console.log('ℹ️  All buses already exist');
    }

    // --- Routes (add more) ---
    const existingRoutes = await Route.findAll({ attributes: ['route_name'] });
    const existingRouteNames = new Set(existingRoutes.map(r => r.route_name));

    const newRouteData = [
      { route_name: 'Kathmandu - Gorkha Express', origin_city: 'Kathmandu', destination_city: 'Gorkha', distance_km: 140, estimated_duration_minutes: 240, base_fare: 700, stops: [{ city: 'Dhunche', time: 120 }] },
      { route_name: 'Pokhara - Chitwan Safari', origin_city: 'Pokhara', destination_city: 'Chitwan', distance_km: 170, estimated_duration_minutes: 300, base_fare: 1000, stops: [{ city: 'Bandipur', time: 150 }] },
      { route_name: 'Biratnagar - Kathmandu Express', origin_city: 'Biratnagar', destination_city: 'Kathmandu', distance_km: 365, estimated_duration_minutes: 600, base_fare: 1800, stops: [{ city: 'Dharan', time: 120 }] },
      { route_name: 'Biratnagar - Janakpur', origin_city: 'Biratnagar', destination_city: 'Janakpur', distance_km: 180, estimated_duration_minutes: 300, base_fare: 800, stops: [{ city: 'Itahari', time: 60 }] },
      { route_name: 'Kathmandu - Solukhumbu Explorer', origin_city: 'Kathmandu', destination_city: 'Solukhumbu', distance_km: 300, estimated_duration_minutes: 600, base_fare: 1500, stops: [{ city: 'Dhulikhel', time: 60 }, { city: 'Salleri', time: 360 }] },
      { route_name: 'Kathmandu - Ilam Premium', origin_city: 'Kathmandu', destination_city: 'Ilam', distance_km: 420, estimated_duration_minutes: 720, base_fare: 2000, stops: [{ city: 'Dharan', time: 360 }, { city: 'Birtamod', time: 480 }] },
      { route_name: 'Kathmandu - Palpa Link', origin_city: 'Kathmandu', destination_city: 'Palpa', distance_km: 280, estimated_duration_minutes: 480, base_fare: 1300, stops: [{ city: 'Hetauda', time: 120 }, { city: 'Butwal', time: 300 }] },
      { route_name: 'Kathmandu - Dharan Direct', origin_city: 'Kathmandu', destination_city: 'Dharan', distance_km: 320, estimated_duration_minutes: 540, base_fare: 1600, stops: [{ city: 'Basantapur', time: 300 }] },
      { route_name: 'Nepalgunj - Kathmandu Express', origin_city: 'Nepalgunj', destination_city: 'Kathmandu', distance_km: 500, estimated_duration_minutes: 720, base_fare: 2200, stops: [{ city: 'Surkhet', time: 180 }, { city: 'Bharatpur', time: 420 }] },
      { route_name: 'Nepalgunj - Pokhara', origin_city: 'Nepalgunj', destination_city: 'Pokhara', distance_km: 320, estimated_duration_minutes: 480, base_fare: 1400, stops: [{ city: 'Ghorahi', time: 180 }] },
    ];

    const routeOperatorLicenseList = ['ME-004', 'ME-004', 'TD-005', 'TD-005', 'HY-006', 'HY-006', 'GD-007', 'GD-007', 'NE-008', 'NE-008'];
    const routesToCreate = newRouteData
      .filter(r => !existingRouteNames.has(r.route_name))
      .map((r, i) => ({
        ...r,
        operator_id: operatorMap[routeOperatorLicenseList[i]],
        is_active: true,
      }));

    if (routesToCreate.length > 0) {
      await Route.bulkCreate(routesToCreate);
      console.log(`✅ Created ${routesToCreate.length} new routes`);
    } else {
      console.log('ℹ️  All routes already exist');
    }

    // --- Trips (many more, across multiple days) ---
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
      { name: 'Deepak Gurung', phone: '9841000017' },
      { name: 'Hari Bahadur', phone: '9841000019' },
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
      { name: 'Anil Thapa', phone: '9841000018' },
      { name: 'Raj Kumar', phone: '9841000020' },
    ];

    const departures = ['06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00', '12:00:00', '14:00:00', '16:00:00', '17:00:00', '18:00:00', '20:00:00', '21:00:00'];

    const tripData = [];
    for (const date of dates) {
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

        tripData.push({
          route_id: route.id,
          bus_id: bus.id,
          trip_date: date,
          departure_time: dep,
          arrival_time: arr,
          current_fare: fare,
          available_seats: bus.total_seats,
          status: 'SCHEDULED',
          driver_name: drivers[i % drivers.length].name,
          driver_phone: drivers[i % drivers.length].phone,
          conductor_name: conductors[i % conductors.length].name,
          conductor_phone: conductors[i % conductors.length].phone,
        });
      }
    }

    // Only insert trips that don't already exist (by route_id + trip_date + departure_time)
    const existingTrips = await Trip.findAll({ attributes: ['route_id', 'trip_date', 'departure_time'] });
    const existingTripKeys = new Set(existingTrips.map(t => `${t.route_id}-${t.trip_date}-${t.departure_time}`));
    const newTrips = tripData.filter(t => !existingTripKeys.has(`${t.route_id}-${t.trip_date}-${t.departure_time}`));

    if (newTrips.length > 0) {
      await Trip.bulkCreate(newTrips);
      console.log(`✅ Created ${newTrips.length} new trips`);
    } else {
      console.log('ℹ️  All trips already exist');
    }

    // --- Final counts ---
    const finalOperators = await Operator.findAll();
    const finalCities = await City.findAll();
    const finalBuses = await Bus.findAll();
    const finalRoutes = await Route.findAll();
    const finalTrips = await Trip.findAll();

    console.log('\n🎉 Seed complete!');
    console.log('---');
    console.log(`Total: ${finalOperators.length} operators, ${finalCities.length} cities, ${finalBuses.length} buses, ${finalRoutes.length} routes, ${finalTrips.length} trips`);
    console.log('---');

    // Show operator_id assignments
    console.log('\nOperator assignments:');
    for (const bus of finalBuses) {
      console.log(`  Bus ${bus.bus_number} -> operator_id ${bus.operator_id}`);
    }
    for (const route of finalRoutes) {
      console.log(`  Route "${route.route_name}" -> operator_id ${route.operator_id}`);
    }

    console.log('\nTry searching:');
    console.log(`  curl "http://localhost:3000/api/trips/search?origin_city=Kathmandu&destination_city=Pokhara&trip_date=${dates[0]}"`);

    // --- Users with passwords ---
    const passwordHash = await bcrypt.hash('password123', 10);

    const [admin] = await User.findOrCreate({
      where: { phone_number: '9800000001' },
      defaults: {
        full_name: 'Admin User',
        email: 'admin@samayadeluxe.com',
        password: passwordHash,
        status: 'ACTIVE',
      },
    });
    await UserRole.findOrCreate({ where: { user_id: admin.id, role: 'SUPER_ADMIN' }, defaults: { user_id: admin.id, role: 'SUPER_ADMIN', is_active: true } });
    await UserWallet.findOrCreate({ where: { user_id: admin.id }, defaults: { user_id: admin.id, balance: 0 } });
    console.log('✅ Admin user seeded (9800000001 / password123)');

    const [operator] = await User.findOrCreate({
      where: { phone_number: '9800000002' },
      defaults: {
        full_name: 'Operator User',
        email: 'operator@samayadeluxe.com',
        password: passwordHash,
        status: 'ACTIVE',
      },
    });
    const firstOp = await Operator.findOne();
    await UserRole.findOrCreate({ where: { user_id: operator.id, role: 'OPERATOR' }, defaults: { user_id: operator.id, role: 'OPERATOR', operator_id: firstOp?.id, is_active: true } });
    await UserWallet.findOrCreate({ where: { user_id: operator.id }, defaults: { user_id: operator.id, balance: 0 } });
    console.log('✅ Operator user seeded (9800000002 / password123)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
