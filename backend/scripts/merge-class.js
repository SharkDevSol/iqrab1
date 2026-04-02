const db = require('../config/db');

const SOURCE = 'G8B';  // move FROM
const TARGET = 'G8A';   // move TO

async function run() {
  try {
    // Check both tables exist
    const tables = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name`
    );
    console.log('All classes:', tables.rows.map(r => r.table_name).join(', '));

    const srcExists = tables.rows.some(r => r.table_name === SOURCE);
    const tgtExists = tables.rows.some(r => r.table_name === TARGET);

    if (!srcExists) { console.log(`Source class "${SOURCE}" not found`); process.exit(1); }
    if (!tgtExists) { console.log(`Target class "${TARGET}" not found`); process.exit(1); }

    // Get students from source
    const src = await db.query(`SELECT * FROM classes_schema."${SOURCE}"`);
    console.log(`\n${SOURCE} has ${src.rows.length} students:`, src.rows.map(s => s.student_name));

    const tgt = await db.query(`SELECT * FROM classes_schema."${TARGET}"`);
    console.log(`${TARGET} has ${tgt.rows.length} students:`, tgt.rows.map(s => s.student_name));

    // Get columns of target table
    const cols = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'classes_schema' AND table_name = $1 ORDER BY ordinal_position`,
      [TARGET]
    );
    const colNames = cols.rows.map(c => c.column_name);
    console.log('\nTarget columns:', colNames.join(', '));

    // Insert each source student into target (only matching columns)
    let moved = 0;
    for (const student of src.rows) {
      const insertCols = colNames.filter(c => student[c] !== undefined);
      const values = insertCols.map(c => student[c]);
      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
      
      try {
        await db.query(
          `INSERT INTO classes_schema."${TARGET}" (${insertCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
          values
        );
        moved++;
        console.log(`  Moved: ${student.student_name}`);
      } catch (e) {
        console.log(`  Skip (duplicate?): ${student.student_name} - ${e.message}`);
      }
    }

    console.log(`\nMoved ${moved}/${src.rows.length} students to ${TARGET}`);
    console.log('\nDone! You can now delete the 8B class from admin panel.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

run();
