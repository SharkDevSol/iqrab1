// Script to sync all subjects from subject_class_mappings into subjects table
const pool = require('../config/db');

async function syncSubjects() {
  try {
    // Get all unique subject names from mappings
    const mappings = await pool.query(
      'SELECT DISTINCT subject_name FROM subjects_of_school_schema.subject_class_mappings ORDER BY subject_name'
    );
    
    console.log(`Found ${mappings.rows.length} unique subjects in mappings`);
    
    let added = 0;
    let skipped = 0;
    
    for (const row of mappings.rows) {
      try {
        const result = await pool.query(
          'INSERT INTO subjects_of_school_schema.subjects (subject_name) VALUES ($1) ON CONFLICT (subject_name) DO NOTHING RETURNING id',
          [row.subject_name]
        );
        if (result.rows.length > 0) {
          console.log(`Added: ${row.subject_name}`);
          added++;
        } else {
          console.log(`Exists: ${row.subject_name}`);
          skipped++;
        }
      } catch (err) {
        console.error(`Error adding ${row.subject_name}:`, err.message);
      }
    }
    
    console.log(`\nDone! Added: ${added}, Already existed: ${skipped}`);
    
    // Show final list
    const final = await pool.query('SELECT id, subject_name FROM subjects_of_school_schema.subjects ORDER BY subject_name');
    console.log(`\nTotal subjects now: ${final.rows.length}`);
    final.rows.forEach(r => console.log(`  ${r.id}: ${r.subject_name}`));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

syncSubjects();
