const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require' } }
});

async function main() {
  // Cargar fuente
  const sourceData = JSON.parse(fs.readFileSync('/home/z/my-project/jo-sigae/db/students_bd2.json', 'utf8').replace(/\n/g, ''));
  const sourceByCedula = new Map();
  for (const s of sourceData) sourceByCedula.set(s.CEDULA?.trim(), s);

  const students = await prisma.planDerogado.findMany({ select: { id: true, cedula: true, rawData: true } });
  console.log('Total DB:', students.length);

  let mismatch = 0, match = 0, dbMissing = 0;
  const mismatches = [];

  for (const student of students) {
    const source = sourceByCedula.get(student.cedula.trim());
    const sourceVal = source ? String(source['297'] ?? '').trim() : 'NO_SOURCE';
    
    let raw;
    try { raw = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData || {}); } catch { raw = {}; }
    
    const dbVal = String(raw['297'] ?? '').trim();
    const hasKey = '297' in raw;
    
    if (!hasKey) {
      dbMissing++;
      if (mismatches.length < 5) mismatches.push({ cedula: student.cedula, source: sourceVal, db: 'KEY_MISSING' });
    } else if (dbVal !== sourceVal) {
      mismatch++;
      if (mismatches.length < 10) mismatches.push({ cedula: student.cedula, source: sourceVal, db: dbVal });
    } else {
      match++;
    }
  }

  console.log(`\nMatch: ${match}, Mismatch: ${mismatch}, DB missing key: ${dbMissing}`);
  if (mismatches.length > 0) {
    console.log('\nMismatches:');
    for (const m of mismatches) console.log(`  ${m.cedula}: source=${JSON.stringify(m.source)} db=${JSON.stringify(m.db)}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
