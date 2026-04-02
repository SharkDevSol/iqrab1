const db = require('../config/db');

// Update all references from G8A and G8B to "8" across all tables
async function run() {
  const updates = [
    // attendance tables
    { table: 'academic_student_attendance', col: 'class_name' },
    { table: 'academic_student_attendance_settings', col: 'class_name' },
    { table: 'academic_class_shift_assignment', col: 'class_name' },
    // staff/teacher assignments
    { table: 'staff_users', col: 'assigned_class' },
    // evaluation book
    { table: 'evaluation_book_teacher_assignments', col: 'class_name' },
    { table: 'evaluation_book_daily_entries', col: 'class_name' },
    // class messages
    { table: 'class_messages', col: 'class_name' },
    // student activities
    { table: 'student_activities', col: 'class_name' },
  ];

  for (const { table, col } of updates) {
    try {
      // Check if table and column exist
      const check = await db.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, col]
      );
      if (check.rows.length === 0) {
        console.log(`  SKIP: ${table}.${col} (not found)`);
        continue;
      }

      const r1 = await db.query(`UPDATE ${table} SET ${col} = '8' WHERE ${col} = 'G8A'`);
      const r2 = await db.query(`UPDATE ${table} SET ${col} = '8' WHERE ${col} = 'G8B'`);
      const total = r1.rowCount + r2.rowCount;
      if (total > 0) console.log(`  UPDATED ${table}.${col}: ${total} rows`);
      else console.log(`  OK: ${table}.${col} (no G8A/G8B found)`);
    } catch (e) {
      console.log(`  ERROR: ${table}.${col} - ${e.message}`);
    }
  }

  // Also check mark list / evaluation forms tables
  const extraTables = [
    { table: 'evaluation_forms', col: 'class_name' },
    { table: 'evaluation_responses', col: 'class_name' },
  ];

  for (const { table, col } of extraTables) {
    try {
      const check = await db.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, col]
      );
      if (check.rows.length === 0) { console.log(`  SKIP: ${table}.${col}`); continue; }
      const r1 = await db.query(`UPDATE ${table} SET ${col} = '8' WHERE ${col} = 'G8A'`);
      const r2 = await db.query(`UPDATE ${table} SET ${col} = '8' WHERE ${col} = 'G8B'`);
      const total = r1.rowCount + r2.rowCount;
      console.log(`  ${total > 0 ? 'UPDATED' : 'OK'}: ${table}.${col}${total > 0 ? ` (${total} rows)` : ''}`);
    } catch (e) {
      console.log(`  ERROR: ${table}.${col} - ${e.message}`);
    }
  }

  // Check mark list routes - they use class name in JSON config
  // Find all tables with any column containing G8A or G8B
  console.log('\nSearching for any remaining G8A/G8B references...');
  try {
    const allTables = await db.query(
      `SELECT table_name, column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND data_type IN ('character varying', 'text', 'json', 'jsonb')`
    );
    for (const { table_name, column_name } of allTables.rows) {
      try {
        const found = await db.query(
          `SELECT COUNT(*) as cnt FROM ${table_name} WHERE ${column_name}::text LIKE '%G8A%' OR ${column_name}::text LIKE '%G8B%'`
        );
        if (parseInt(found.rows[0].cnt) > 0) {
          console.log(`  FOUND: ${table_name}.${column_name} has ${found.rows[0].cnt} rows with G8A/G8B`);
        }
      } catch (_) {}
    }
  } catch (e) {
    console.log('Search error:', e.message);
  }

  console.log('\nDone!');
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
