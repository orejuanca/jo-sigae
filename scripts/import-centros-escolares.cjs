const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'db', 'custom.db');
const EXCEL_PATH = path.join(process.cwd(), 'BASE DE DATOS CENTROS ESCOLARES CE.xlsx');

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function main() {
  console.log('Leyendo Excel...');
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  console.log(`Hoja: ${sheetName}, Filas: ${rows.length}`);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Limpiar tabla
  console.log('Limpiando tabla CentroEscolar...');
  db.prepare('DELETE FROM CentroEscolar').run();

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO CentroEscolar (id, codigo, nombre, localidad, ef, activo, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((records) => {
    for (const r of records) {
      stmt.run(r.id, r.codigo, r.nombre, r.localidad, r.ef);
    }
  });

  let insertados = 0;
  let omitidos = 0;
  const BATCH_SIZE = 200;
  let batch = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const nombre = cleanStr(row['Nombre del Plantel']);
    const localidad = cleanStr(row['Localidad']);
    const codigo = cleanStr(row['CODIGO']);
    const ef = cleanStr(row['EF']);

    // Omitir filas vacías o con nombre inválido
    if (!nombre || nombre === '* * * * *' || nombre.startsWith('*')) {
      omitidos++;
      continue;
    }

    batch.push({
      id: `ce_${String(i).padStart(6, '0')}`,
      codigo,
      nombre,
      localidad,
      ef,
    });

    if (batch.length >= BATCH_SIZE) {
      insertMany(batch);
      insertados += batch.length;
      console.log(`  Insertados: ${insertados} / ${rows.length}...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    insertMany(batch);
    insertados += batch.length;
  }

  const count = db.prepare('SELECT COUNT(*) as total FROM CentroEscolar').get();
  console.log(`\n=== RESUMEN ===`);
  console.log(`Total filas leídas: ${rows.length}`);
  console.log(`Registros insertados: ${insertados}`);
  console.log(`Registros omitidos: ${omitidos}`);
  console.log(`Total en tabla CentroEscolar: ${count.total}`);

  // Mostrar muestra
  const sample = db.prepare('SELECT nombre, localidad, ef FROM CentroEscolar LIMIT 3').all();
  console.log('\nMuestra:');
  sample.forEach(s => console.log(`  ${s.nombre} | ${s.localidad} | ${s.ef}`));

  db.close();
}

try {
  main();
} catch (e) {
  console.error('ERROR:', e);
  process.exit(1);
}
