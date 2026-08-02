const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'db', 'custom.db');
const EXCEL_PATH = path.join(__dirname, '..', 'Base de Datos plan vigente.xlsx');

function formatCedula(raw) {
  const trimmed = String(raw).trim().toUpperCase();
  const match = trimmed.match(/^([VEP])[^(\d)]*(\d.+)$/);
  if (!match) return trimmed;
  const letter = match[1];
  const number = match[2];
  if (letter.length + 1 + number.length <= 10) {
    return `${letter} ${number}`;
  }
  return `${letter}${number}`;
}

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
  console.log('Limpiando tabla PlanVigente...');
  db.prepare('DELETE FROM PlanVigente').run();

  // Preparar inserción
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO PlanVigente (id, cedula, fechaNacimiento, apellidos, nombres, pais, estado, municipio, rawData, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((records) => {
    for (const r of records) {
      stmt.run(r.id, r.cedula, r.fechaNacimiento, r.apellidos, r.nombres, r.pais, r.estado, r.municipio, r.rawData);
    }
  });

  let insertados = 0;
  let omitidos = 0;
  const BATCH_SIZE = 200;
  let batch = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const allData = {};
    for (const [key, val] of Object.entries(row)) {
      allData[key] = cleanStr(val);
    }

    const cedula = formatCedula(allData['CEDULA'] || '');
    if (!cedula || cedula === '') {
      omitidos++;
      continue;
    }

    const apellidos = allData['APELLIDOS'] || '';
    const nombres = allData['NOMBRES'] || '';
    if (!apellidos && !nombres) {
      omitidos++;
      continue;
    }

    batch.push({
      id: `pv_${String(i).padStart(6, '0')}`,
      cedula,
      fechaNacimiento: allData['FECHA'] || null,
      apellidos,
      nombres,
      pais: allData['PAIS'] || 'VENEZUELA',
      estado: allData['ESTADO'] || '',
      municipio: allData['MUNICIPIO'] || '',
      rawData: JSON.stringify(allData),
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

  // Verificar
  const count = db.prepare('SELECT COUNT(*) as total FROM PlanVigente').get();
  console.log(`\n=== RESUMEN ===`);
  console.log(`Total filas leídas: ${rows.length}`);
  console.log(`Registros insertados: ${insertados}`);
  console.log(`Registros omitidos: ${omitidos}`);
  console.log(`Total en tabla PlanVigente: ${count.total}`);

  db.close();
}

try {
  main();
} catch (e) {
  console.error('ERROR:', e);
  process.exit(1);
}
