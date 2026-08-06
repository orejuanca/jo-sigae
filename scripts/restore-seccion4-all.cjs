const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require' } }
});

async function main() {
  const sourceData = JSON.parse(fs.readFileSync('/home/z/my-project/jo-sigae/db/students_bd2.json', 'utf8').replace(/\n/g, ''));
  const sourceByCedula = new Map();
  for (const s of sourceData) sourceByCedula.set(s.CEDULA?.trim(), s);

  const students = await prisma.planDerogado.findMany({ select: { id: true, cedula: true, rawData: true } });

  let updated = 0, skipped = 0, notFound = 0;
  for (const student of students) {
    const source = sourceByCedula.get(student.cedula.trim());
    if (!source) { notFound++; continue; }

    const val297 = String(source['297'] ?? '').trim();
    // Si no existe la clave en la fuente, saltar
    if (!('297' in source)) { skipped++; continue; }

    let raw;
    try { raw = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData || {}); } catch { raw = {}; }

    if (raw['297'] === val297) { skipped++; continue; }

    raw['297'] = val297;
    await prisma.planDerogado.update({
      where: { id: student.id },
      data: { rawData: JSON.stringify(raw) }
    });
    updated++;
  }

  console.log(`Updated: ${updated}, Skipped (already ok): ${skipped}, Not found: ${notFound}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
