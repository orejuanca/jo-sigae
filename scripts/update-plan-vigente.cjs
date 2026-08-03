const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'db', 'custom.db');
const EXCEL_PATH = path.join(process.cwd(), 'upload', 'Base de Datos plan vigente CORREGIDA.xlsx');

function formatCedula(raw) {
  const trimmed = String(raw).trim().toUpperCase();
  const match = trimmed.match(/^([VEP])[^\d]*(\d.+)$/);
  if (!match) return trimmed;
  const letter = match[1];
  const number = match[2];
  if (letter.length + 1 + number.length <= 10) {
    return letter + ' ' + number;
  }
  return letter + number;
}

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function main() {
  console.log('=== ACTUALIZACION PLAN VIGENTE ===');
  console.log('Excel: ' + EXCEL_PATH);
  console.log('DB: ' + DB_PATH);
  console.log('');

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('ERROR: No se encuentra: ' + EXCEL_PATH);
    process.exit(1);
  }

  console.log('Leyendo Excel...');
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
  console.log('Hoja: ' + sheetName + ', Filas: ' + rows.length);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  console.log('Respaldo de certDrafts existentes...');
  const drafts = db.prepare("SELECT cedula, certDraft FROM PlanVigente WHERE certDraft IS NOT NULL AND certDraft != ''").all();
  const draftMap = {};
  for (const d of drafts) {
    draftMap[d.cedula] = d.certDraft;
  }
  console.log('  -> ' + Object.keys(draftMap).length + ' registros con certDraft');

  const beforeCount = db.prepare('SELECT COUNT(*) as total FROM PlanVigente').get().total;
  console.log('Registros actuales: ' + beforeCount);

  console.log('Limpiando tabla PlanVigente...');
  db.prepare('DELETE FROM PlanVigente').run();

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO PlanVigente (id, cedula, fechaNacimiento, apellidos, nombres, pais, estado, municipio, rawData, certDraft, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  );

  const insertMany = db.transaction(function (records) {
    for (var r of records) {
      stmt.run(r.id, r.cedula, r.fechaNacimiento, r.apellidos, r.nombres, r.pais, r.estado, r.municipio, r.rawData, r.certDraft);
    }
  });

  var insertados = 0;
  var omitidos = 0;
  var draftsRestaurados = 0;
  var BATCH_SIZE = 200;
  var batch = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var allData = {};
    for (var key in row) {
      allData[key] = cleanStr(row[key]);
    }

    var cedula = formatCedula(allData['CEDULA'] || '');
    if (!cedula || cedula === '') {
      omitidos++;
      continue;
    }

    var apellidos = allData['APELLIDOS'] || '';
    var nombres = allData['NOMBRES'] || '';
    if (!apellidos && !nombres) {
      omitidos++;
      continue;
    }

    var existingDraft = draftMap[cedula] || null;
    if (existingDraft) draftsRestaurados++;

    batch.push({
      id: 'pv_' + String(i).padStart(6, '0'),
      cedula: cedula,
      fechaNacimiento: allData['FECHA'] || null,
      apellidos: apellidos,
      nombres: nombres,
      pais: allData['PAIS'] || 'VENEZUELA',
      estado: allData['ESTADO'] || '',
      municipio: allData['MUNICIPIO'] || '',
      rawData: JSON.stringify(allData),
      certDraft: existingDraft
    });

    if (batch.length >= BATCH_SIZE) {
      insertMany(batch);
      insertados += batch.length;
      console.log('  Insertados: ' + insertados + ' / ' + rows.length + '...');
      batch = [];
    }
  }

  if (batch.length > 0) {
    insertMany(batch);
    insertados += batch.length;
  }

  var afterCount = db.prepare('SELECT COUNT(*) as total FROM PlanVigente').get().total;
  var finalDrafts = db.prepare("SELECT COUNT(*) as total FROM PlanVigente WHERE certDraft IS NOT NULL AND certDraft != ''").get().total;

  console.log('');
  console.log('=== RESUMEN ===');
  console.log('Filas leidas del Excel:     ' + rows.length);
  console.log('Registros omitidos:         ' + omitidos);
  console.log('Registros insertados:       ' + insertados);
  console.log('Registros antes:            ' + beforeCount);
  console.log('Registros despues:          ' + afterCount);
  console.log('CertDrafts respaldados:     ' + Object.keys(draftMap).length);
  console.log('CertDrafts restaurados:     ' + draftsRestaurados);
  console.log('CertDrafts en DB final:     ' + finalDrafts);

  if (afterCount === 0) {
    console.error('');
    console.error('ADVERTENCIA: No se inserto ningun registro. Revisa el Excel.');
  }

  console.log('');
  console.log('--- Muestra de 3 registros ---');
  var sample = db.prepare('SELECT id, cedula, apellidos, nombres FROM PlanVigente LIMIT 3').all();
  for (var s of sample) {
    console.log('  ' + s.id + ' | ' + s.cedula + ' | ' + s.apellidos + ', ' + s.nombres);
  }

  db.close();
  console.log('');
  console.log('Actualizacion completada.');
}

try {
  main();
} catch (e) {
  console.error('ERROR:', e.message || e);
  process.exit(1);
}