const db = require('../config/db');
async function run() {
  const r = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log(r.rows.map(x => x.tablename).join('\n'));
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
