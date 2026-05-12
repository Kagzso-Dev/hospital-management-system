require('dotenv').config();
const db = require('../db/database');
const seedData = require('./seedData');

async function resetAndSeed() {
  await db.init();

  console.log('Clearing existing data...');
  // Disable FK checks so we can truncate in any order
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'prescription_items',
    'prescriptions',
    'appointments',
    'doctor_availability',
    'doctors',
    'patients',
    'medicines',
  ]) {
    await db.execute(`TRUNCATE TABLE \`${table}\``);
    console.log(`  Cleared ${table}`);
  }
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\nSeeding fresh data...');
  await seedData();

  console.log('\nDone! Database is ready with sample data.');
  process.exit(0);
}

resetAndSeed().catch((err) => { console.error(err); process.exit(1); });
