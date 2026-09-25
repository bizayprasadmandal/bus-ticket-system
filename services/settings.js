const { SystemSetting } = require('../models');

const DEFAULT_SETTINGS = {
  service_fee: 5,
  tax_rate: 13,
  currency: 'NPR',
  platform_name: 'Gadi Ticket',
  seat_lock_timeout: 10,
  max_passengers: 10,
  auto_cancel_timeout: 30,
  payment_methods: { khalti: true, esewa: true, cash: true },
  default_payment: 'khalti',
  notifications: { email: true, sms: true, push: true },
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 30000;

async function getSystemSettings() {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  try {
    const row = await SystemSetting.findOne({ where: { key: 'system_settings' } });
    cache = row && row.value
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }
      : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error('Settings load error:', e.message);
    cache = { ...DEFAULT_SETTINGS };
  }
  cacheAt = Date.now();
  return cache;
}

function invalidateSettingsCache() {
  cache = null;
  cacheAt = 0;
}

module.exports = { getSystemSettings, DEFAULT_SETTINGS, invalidateSettingsCache };
