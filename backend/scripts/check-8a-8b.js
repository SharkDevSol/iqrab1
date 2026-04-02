/**
 * Check 8A vs 8B before merge
 */
const db = require('../config/db');

async function check() {
  const a = await db.query('SELECT COUNT(*) as cnt FROM classes_schema."8A"');
  const b = await db.query('SELECT COUNT(*) as cnt FROM classes_schema."8B"');
  console.log('8A students:', a.rows[0].cnt);
  console.log('8B students:', b.rows[0].cnt);

  const overlap = await db.query(`
    SELECT b.student_name FROM classes_schema."8B" b
    INNER JOIN classes_schema."8A" a ON a.student_name = b.student_name
  `);
  console.log('Duplicate names (in both classes):', overlap.rows.length);
  if (overlap.rows.length > 0) overlap.rows.forEach(r => console.log('  -', r.student_name));

  const bOnly = await db.query(`
    SELECT b.student_name FROM classes_schema."8B" b
    LEFT JOIN classes_schema."8A" a ON a.student_name = b.student_name
    WHERE a.student_name IS NULL
  `);
  console.log('\nStudents ONLY in 8B (will be moved to 8A):', bOnly.rows.length);
  bOnly.rows.forEach(r => console.log('  -', r.student_name));

  process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
