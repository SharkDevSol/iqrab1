require('dotenv').config();
const pool = require('./config/db');

async function check() {
  const client = await pool.connect();
  try {
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name"
    );
    console.log('Tables in classes_schema:', tables.rows.map(r => r.table_name));

    const cols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'classes_schema' AND table_name = 'g8b' ORDER BY ordinal_position"
    );
    console.log('G8B columns:', JSON.stringify(cols.rows));

    const g8bCount = await client.query('SELECT COUNT(*) FROM classes_schema.g8b');
    console.log('G8B student count:', g8bCount.rows[0].count);

    const g8aCount = await client.query('SELECT COUNT(*) FROM classes_schema.g8a');
    console.log('G8A student count:', g8aCount.rows[0].count);

    const g8bStudents = await client.query('SELECT * FROM classes_schema.g8b LIMIT 5');
    console.log('G8B sample students:', JSON.stringify(g8bStudents.rows));
  } finally {
    client.release();
    pool.end();
  }
}

check().catch(console.error);
