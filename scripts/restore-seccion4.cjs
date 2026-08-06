const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require' } }
});

async function main() {
  // Load source data
  const sourceData = JSON.parse(fs.readFileSync('/home/z/my-project/jo-sigae/db/students_bd2.json', 'utf8').replace(/\n/g, ''));
  console.log('Source students:', sourceData.length);
  
  // Index source by CEDULA
  const sourceByCedula = new Map();
  for (const s of sourceData) {
    sourceByCedula.set(s.CEDULA?.trim(), s);
  }
  
  // Fetch all PlanDerogado students
  const students = await prisma.planDerogado.findMany({ select: { id: true, cedula: true, rawData: true } });
  console.log('DB students:', students.length);
  
  let updated = 0, notFound = 0, noData = 0, alreadyOk = 0;
  
  for (const student of students) {
    const source = sourceByCedula.get(student.cedula.trim());
    if (!source) { notFound++; continue; }
    
    // Check if source has key 297 with valid data
    const val297 = source['297'];
    const val297Str = String(val297 || '').trim();
    if (!val297Str || val297Str === '*') { noData++; continue; }
    
    // Parse current rawData and add key 297
    let raw;
    try { raw = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData || {}); } catch { raw = {}; }
    
    // Only update if 297 is missing or different
    if (raw['297'] === val297Str) { alreadyOk++; continue; }
    
    raw['297'] = val297Str;
    await prisma.planDerogado.update({
      where: { id: student.id },
      data: { rawData: JSON.stringify(raw) }
    });
    updated++;
    if (updated <= 5) console.log(`  Updated ${student.cedula}: 297 = ${JSON.stringify(val297Str)}`);
  }
  
  console.log(`\nResults:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Already had 297: ${alreadyOk}`);
  console.log(`  No SECCION.4 data in source: ${noData}`);
  console.log(`  Not found in source: ${notFound}`);
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
