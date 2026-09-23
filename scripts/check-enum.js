const { sequelize } = require('./config/database');
(async () => {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM payments LIKE 'payment_method'`);
  console.log(rows[0] ? rows[0].Type : 'not found');
  const [enums] = await sequelize.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME='payments' AND COLUMN_NAME='payment_method'`
  );
  console.log('ENUM:', enums[0].COLUMN_TYPE);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
