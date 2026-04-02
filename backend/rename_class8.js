require('dotenv').config();
const pool = require('./config/db');

async function renameClass() {
  const client = await pool.connect();
  try {
    console.log('Renaming table "8" to "G8" in classes_schema...');
    await client.query('ALTER TABLE classes_schema."8" RENAME TO "G8"');
    console.log('✅ Done! Table renamed from "8" to "G8" successfully.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

renameClass();
