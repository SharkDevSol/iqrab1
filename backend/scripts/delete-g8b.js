const db = require('../config/db');
async function run() {
  await db.query('DROP TABLE IF EXISTS classes_schema."G8B"');
  console.log('G8B table deleted successfully');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
