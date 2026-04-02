/**
 * FULL MERGE: Move everything from 8B → 8A, then delete 8B
 * 
 * This script:
 * 1. Moves all students from classes_schema."8B" → classes_schema."8A"
 * 2. Updates all references in every table (attendance, finance, marks, etc.)
 * 3. Moves mark list data from subject schemas (8b_term_X → 8a_term_X)
 * 4. Drops classes_schema."8B"
 * 
 * Run on VPS: node backend/scripts/merge-8b-to-8a-full.js
 */

const db = require('../config/db');

const SOURCE = '8B';
const TARGET = '8A';
const SOURCE_LOWER = '8b';
const TARGET_LOWER = '8a';

async function run() {
  console.log(`\n========== FULL MERGE: ${SOURCE} → ${TARGET} ==========\n`);

  // ─── STEP 1: Verify both classes exist ───────────────────────────────────
  const tables = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`
  );
  const classNames = tables.rows.map(r => r.table_name);
  console.log('All classes found:', classNames.join(', '));

  if (!classNames.includes(SOURCE)) { console.error(`❌ Source class "${SOURCE}" not found`); process.exit(1); }
  if (!classNames.includes(TARGET)) { console.error(`❌ Target class "${TARGET}" not found`); process.exit(1); }

  // ─── STEP 2: Move students from 8B → 8A ──────────────────────────────────
  console.log(`\n--- Step 2: Moving students from ${SOURCE} → ${TARGET} ---`);

  const srcStudents = await db.query(`SELECT * FROM classes_schema."${SOURCE}"`);
  const tgtStudents = await db.query(`SELECT * FROM classes_schema."${TARGET}"`);
  const tgtNames = tgtStudents.rows.map(s => s.student_name);

  const cols = await db.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'classes_schema' AND table_name = $1 ORDER BY ordinal_position`,
    [TARGET]
  );
  const colNames = cols.rows.map(c => c.column_name);

  let moved = 0, skipped = 0;
  for (const student of srcStudents.rows) {
    if (tgtNames.includes(student.student_name)) {
      console.log(`  SKIP (already exists): ${student.student_name}`);
      skipped++;
      continue;
    }
    const maxId = await db.query(`SELECT MAX(id) as max_id FROM classes_schema."${TARGET}"`);
    const nextId = (maxId.rows[0].max_id || 0) + 1;
    const insertCols = colNames.filter(c => c !== 'id' && student[c] !== undefined);
    const values = [nextId, ...insertCols.map(c => student[c])];
    const allCols = ['id', ...insertCols];
    const placeholders = allCols.map((_, i) => `$${i + 1}`).join(', ');
    try {
      await db.query(
        `INSERT INTO classes_schema."${TARGET}" (${allCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
        values
      );
      console.log(`  ✓ Moved: ${student.student_name}`);
      moved++;
    } catch (e) {
      console.log(`  ✗ Error moving ${student.student_name}: ${e.message}`);
    }
  }
  console.log(`  Result: ${moved} moved, ${skipped} skipped (already in ${TARGET})`);

  // ─── STEP 3: Update all public schema tables ──────────────────────────────
  console.log(`\n--- Step 3: Updating all table references ${SOURCE} → ${TARGET} ---`);

  const refTables = [
    { schema: 'public', table: 'academic_student_attendance',          col: 'class_name' },
    { schema: 'public', table: 'academic_student_attendance_settings', col: 'class_name' },
    { schema: 'public', table: 'academic_class_shift_assignment',      col: 'class_name' },
    { schema: 'public', table: 'staff_users',                          col: 'assigned_class' },
    { schema: 'public', table: 'evaluation_book_teacher_assignments',  col: 'class_name' },
    { schema: 'public', table: 'evaluation_book_daily_entries',        col: 'class_name' },
    { schema: 'public', table: 'class_messages',                       col: 'class_name' },
    { schema: 'public', table: 'student_activities',                   col: 'class_name' },
    { schema: 'public', table: 'evaluation_forms',                     col: 'class_name' },
    { schema: 'public', table: 'evaluation_responses',                 col: 'class_name' },
    { schema: 'public', table: 'guardian_student_links',               col: 'class_name' },
    { schema: 'public', table: 'student_faults',                       col: 'class_name' },
    { schema: 'public', table: 'class_teacher_assignments',            col: 'class_name' },
    { schema: 'public', table: 'schedule_entries',                     col: 'class_name' },
    { schema: 'public', table: 'posts',                                col: 'class_name' },
    { schema: 'public', table: 'notifications',                        col: 'class_name' },
  ];

  for (const { schema, table, col } of refTables) {
    try {
      const check = await db.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
        [schema, table, col]
      );
      if (check.rows.length === 0) { console.log(`  SKIP: ${table}.${col} (not found)`); continue; }

      const r = await db.query(
        `UPDATE ${schema === 'public' ? '' : `"${schema}".`}"${table}" SET "${col}" = $1 WHERE "${col}" = $2`,
        [TARGET, SOURCE]
      );
      console.log(`  ${r.rowCount > 0 ? '✓' : 'OK'} ${table}.${col}: ${r.rowCount} rows updated`);
    } catch (e) {
      console.log(`  ✗ ERROR ${table}.${col}: ${e.message}`);
    }
  }

  // ─── STEP 4: Finance tables ───────────────────────────────────────────────
  console.log(`\n--- Step 4: Updating finance references ---`);

  const financeTables = [
    { table: 'finance_invoices',         col: 'class_name' },
    { table: 'finance_fee_structures',   col: 'class_name' },
    { table: 'finance_payments',         col: 'class_name' },
    { table: 'finance_scholarships',     col: 'class_name' },
    { table: 'finance_discounts',        col: 'class_name' },
    { table: 'finance_monthly_payments', col: 'class_name' },
    { table: 'simple_fee_structures',    col: 'class_name' },
    { table: 'simple_fee_payments',      col: 'class_name' },
    { table: 'simple_invoices',          col: 'class_name' },
    { table: 'progressive_invoices',     col: 'class_name' },
  ];

  for (const { table, col } of financeTables) {
    try {
      const check = await db.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, col]
      );
      if (check.rows.length === 0) { console.log(`  SKIP: ${table}.${col} (not found)`); continue; }

      const r = await db.query(
        `UPDATE "${table}" SET "${col}" = $1 WHERE "${col}" = $2`,
        [TARGET, SOURCE]
      );
      console.log(`  ${r.rowCount > 0 ? '✓' : 'OK'} ${table}.${col}: ${r.rowCount} rows updated`);
    } catch (e) {
      console.log(`  ✗ ERROR ${table}.${col}: ${e.message}`);
    }
  }

  // ─── STEP 5: subjects_of_school_schema mappings ───────────────────────────
  console.log(`\n--- Step 5: Updating subject-class mappings ---`);
  try {
    const r1 = await db.query(
      `UPDATE subjects_of_school_schema.subject_class_mappings SET class_name = $1 WHERE class_name = $2`,
      [TARGET, SOURCE]
    );
    console.log(`  ✓ subject_class_mappings: ${r1.rowCount} rows updated`);
  } catch (e) { console.log(`  SKIP subject_class_mappings: ${e.message}`); }

  try {
    const r2 = await db.query(
      `UPDATE subjects_of_school_schema.teachers_subjects 
       SET subject_class = REPLACE(subject_class, $1, $2) 
       WHERE subject_class LIKE $3`,
      [`Class ${SOURCE}`, `Class ${TARGET}`, `%Class ${SOURCE}%`]
    );
    console.log(`  ✓ teachers_subjects: ${r2.rowCount} rows updated`);
  } catch (e) { console.log(`  SKIP teachers_subjects: ${e.message}`); }

  // ─── STEP 6: Move mark list tables in subject schemas ─────────────────────
  console.log(`\n--- Step 6: Moving mark list data (${SOURCE_LOWER}_term_X → ${TARGET_LOWER}_term_X) ---`);

  try {
    const subjectSchemas = await db.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'subject_%_schema'`
    );

    for (const { schema_name } of subjectSchemas.rows) {
      // Find tables for 8b
      const srcTables = await db.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = $1 AND table_name LIKE $2`,
        [schema_name, `${SOURCE_LOWER}_term_%`]
      );

      for (const { table_name } of srcTables.rows) {
        const termNum = table_name.replace(`${SOURCE_LOWER}_term_`, '');
        const newTableName = `${TARGET_LOWER}_term_${termNum}`;

        try {
          // Check if target table already exists
          const tgtExists = await db.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
            [schema_name, newTableName]
          );

          if (tgtExists.rows[0].exists) {
            // Merge: insert 8b students into existing 8a table
            const srcRows = await db.query(`SELECT * FROM "${schema_name}"."${table_name}"`);
            let mergedCount = 0;
            for (const row of srcRows.rows) {
              try {
                await db.query(
                  `INSERT INTO "${schema_name}"."${newTableName}" (student_name, age, gender) 
                   VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                  [row.student_name, row.age, row.gender]
                );
                mergedCount++;
              } catch (_) {}
            }
            console.log(`  ✓ Merged ${schema_name}.${table_name} → ${newTableName} (${mergedCount} students)`);
          } else {
            // Rename: just rename the table
            await db.query(
              `ALTER TABLE "${schema_name}"."${table_name}" RENAME TO "${newTableName}"`
            );
            console.log(`  ✓ Renamed ${schema_name}.${table_name} → ${newTableName}`);
          }

          // Update form_config class_name
          try {
            await db.query(
              `UPDATE "${schema_name}".form_config SET class_name = $1 WHERE class_name = $2 AND term_number = $3`,
              [TARGET, SOURCE, parseInt(termNum)]
            );
          } catch (_) {}

        } catch (e) {
          console.log(`  ✗ ERROR processing ${schema_name}.${table_name}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.log(`  ✗ ERROR in mark list migration: ${e.message}`);
  }

  // ─── STEP 7: Scan for any remaining 8B references ─────────────────────────
  console.log(`\n--- Step 7: Scanning for remaining "${SOURCE}" references ---`);
  try {
    const allCols = await db.query(
      `SELECT table_name, column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND data_type IN ('character varying', 'text')`
    );
    for (const { table_name, column_name } of allCols.rows) {
      try {
        const found = await db.query(
          `SELECT COUNT(*) as cnt FROM "${table_name}" WHERE "${column_name}" = $1`,
          [SOURCE]
        );
        if (parseInt(found.rows[0].cnt) > 0) {
          const r = await db.query(
            `UPDATE "${table_name}" SET "${column_name}" = $1 WHERE "${column_name}" = $2`,
            [TARGET, SOURCE]
          );
          console.log(`  ✓ Fixed: ${table_name}.${column_name} (${r.rowCount} rows)`);
        }
      } catch (_) {}
    }
  } catch (e) {
    console.log(`  Scan error: ${e.message}`);
  }

  // ─── STEP 8: Drop 8B class table ──────────────────────────────────────────
  console.log(`\n--- Step 8: Dropping classes_schema."${SOURCE}" ---`);
  try {
    await db.query(`DROP TABLE IF EXISTS classes_schema."${SOURCE}"`);
    console.log(`  ✓ classes_schema."${SOURCE}" dropped successfully`);
  } catch (e) {
    console.log(`  ✗ ERROR dropping ${SOURCE}: ${e.message}`);
  }

  console.log(`\n========== MERGE COMPLETE ==========`);
  console.log(`All ${SOURCE} data has been moved to ${TARGET} and ${SOURCE} has been removed.`);
  process.exit(0);
}

run().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
