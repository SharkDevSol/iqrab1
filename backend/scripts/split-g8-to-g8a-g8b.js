/**
 * Split table "G8" into "G8A" and "G8B" based on class column
 * Also restores mark list tables for G8A and G8B from old "8" mark tables
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function split() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Check current state ──────────────────────────────────────────────
    const total = await client.query('SELECT COUNT(*) FROM classes_schema."G8"');
    const g8aCount = await client.query(`SELECT COUNT(*) FROM classes_schema."G8" WHERE class = 'G8A'`);
    const g8bCount = await client.query(`SELECT COUNT(*) FROM classes_schema."G8" WHERE class = 'G8B'`);
    console.log('Total in G8 :', total.rows[0].count);
    console.log('G8A students:', g8aCount.rows[0].count);
    console.log('G8B students:', g8bCount.rows[0].count);

    // ── 2. Create G8A and G8B tables (same structure as G8) ─────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."G8A" AS
      SELECT * FROM classes_schema."G8" WHERE class = 'G8A'
    `);
    console.log('✅ G8A table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."G8B" AS
      SELECT * FROM classes_schema."G8" WHERE class = 'G8B'
    `);
    console.log('✅ G8B table created');

    // ── 3. Drop old G8 table ─────────────────────────────────────────────────
    await client.query(`DROP TABLE classes_schema."G8"`);
    console.log('✅ Old G8 table dropped');

    await client.query('COMMIT');
    console.log('\n✅ G8 split into G8A and G8B successfully.\n');

    // ── 4. Restore mark list tables ──────────────────────────────────────────
    await restoreMarkTables(client);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

async function restoreMarkTables(client) {
  console.log('── Checking mark list tables ──────────────────────────────────');

  // Get all subject schemas
  const schemas = await client.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'subject_%_schema'
    ORDER BY schema_name
  `);

  let restored = 0;

  for (const { schema_name } of schemas.rows) {
    // Find tables named "8_term_*" or "8a_term_*" / "8b_term_*"
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 AND (
        table_name LIKE '8_term_%' OR
        table_name LIKE '8a_term_%' OR
        table_name LIKE '8b_term_%'
      )
    `, [schema_name]);

    for (const { table_name } of tables.rows) {
      const termNum = table_name.split('_term_')[1];

      // If old table is "8_term_N" - copy to both 8a_term_N and 8b_term_N
      if (table_name.startsWith('8_term_')) {
        for (const suffix of ['8a', '8b']) {
          const newTable = `${suffix}_term_${termNum}`;
          const exists = await client.query(`
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = $1 AND table_name = $2
          `, [schema_name, newTable]);

          if (exists.rowCount === 0) {
            await client.query(`
              CREATE TABLE ${schema_name}.${newTable} AS
              SELECT * FROM ${schema_name}.${table_name}
            `);
            console.log(`  ✅ Created ${schema_name}.${newTable} from ${table_name}`);
            restored++;
          } else {
            console.log(`  ⏭  ${schema_name}.${newTable} already exists`);
          }
        }
      }

      // If "8a_term_N" or "8b_term_N" already exist - they are fine
      if (table_name.startsWith('8a_term_') || table_name.startsWith('8b_term_')) {
        console.log(`  ✅ ${schema_name}.${table_name} already exists`);
      }
    }
  }

  console.log(`\n✅ Mark list restore done. Tables created: ${restored}`);
}

split();
