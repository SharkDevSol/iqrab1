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

    // ── 1. Find the actual table name (could be "8", "G8", "g8") ───────────
    const allTables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);
    console.log('All tables in classes_schema:', allTables.rows.map(r => r.table_name).join(', '));

    // Find the G8 table - could be named "8", "G8", "g8"
    const g8Table = allTables.rows.find(r =>
      r.table_name === 'G8' || r.table_name === '8' || r.table_name === 'g8'
    );

    if (!g8Table) {
      // Check if G8A and G8B already exist
      const g8aExists = allTables.rows.find(r => r.table_name === 'G8A' || r.table_name === 'g8a');
      const g8bExists = allTables.rows.find(r => r.table_name === 'G8B' || r.table_name === 'g8b');
      if (g8aExists && g8bExists) {
        console.log('✅ G8A and G8B already exist, skipping split. Running mark table restore only...');
        await client.query('COMMIT');
        await restoreMarkTables(client);
        return;
      }
      throw new Error('No G8 table found (tried: G8, 8, g8)');
    }

    const srcTable = g8Table.table_name;
    console.log(`Found source table: "${srcTable}"`);

    const total = await client.query(`SELECT COUNT(*) FROM classes_schema."${srcTable}"`);
    const g8aCount = await client.query(`SELECT COUNT(*) FROM classes_schema."${srcTable}" WHERE class = 'G8A'`);
    const g8bCount = await client.query(`SELECT COUNT(*) FROM classes_schema."${srcTable}" WHERE class = 'G8B'`);
    console.log('Total in table:', total.rows[0].count);
    console.log('G8A students :', g8aCount.rows[0].count);
    console.log('G8B students :', g8bCount.rows[0].count);

    // ── 2. Create G8A and G8B tables ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."G8A" AS
      SELECT * FROM classes_schema."${srcTable}" WHERE class = 'G8A'
    `);
    console.log('✅ G8A table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."G8B" AS
      SELECT * FROM classes_schema."${srcTable}" WHERE class = 'G8B'
    `);
    console.log('✅ G8B table created');

    // ── 3. Drop old table ────────────────────────────────────────────────────
    await client.query(`DROP TABLE classes_schema."${srcTable}"`);
    console.log(`✅ Old "${srcTable}" table dropped`);

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
