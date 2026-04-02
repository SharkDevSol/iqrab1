/**
 * Map all subjects to all classes
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');

async function mapAll() {
  const client = await pool.connect();
  try {
    // Get all subjects
    const subjectsRes = await client.query('SELECT subject_name FROM subjects_of_school_schema.subjects ORDER BY subject_name');
    const subjects = subjectsRes.rows.map(r => r.subject_name);
    console.log('Subjects:', subjects.join(', '));

    // Get all classes
    const classesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name`);
    const classes = classesRes.rows.map(r => r.table_name);
    console.log('Classes:', classes.join(', '));

    // Insert all mappings
    let inserted = 0;
    let skipped = 0;
    for (const subject_name of subjects) {
      for (const class_name of classes) {
        try {
          await client.query(
            `INSERT INTO subjects_of_school_schema.subject_class_mappings (subject_name, class_name)
             VALUES ($1, $2) ON CONFLICT (subject_name, class_name) DO NOTHING`,
            [subject_name, class_name]
          );
          inserted++;
        } catch (e) {
          skipped++;
        }
      }
    }

    console.log(`\n✅ Done! Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

mapAll();
