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

  // Preparar batch: solo los que necesitan update
  const updates = [];
  for (const student of students) {
    const source = sourceByCedula.get(student.cedula.trim());
    if (!source || !('297' in source)) continue;
    const val297 = String(source['297'] ?? '').trim();
    let raw;
    try { raw = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData || {}); } catch { raw = {}; }
    if (raw['297'] === val297) continue;
    raw['297'] = val297;
    updates.push({ id: student.id, rawData: JSON.stringify(raw) });
  }

  console.log(`Need to update: ${updates.length} records`);

  // Ejecutar en batches de 50
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(u =>
      prisma.planDerogado.update({ where: { id: u.id }, data: { rawData: u.rawData } })
    ));
    done += batch.length;
    console.log(`  Batch done: ${done}/${updates.length}`);
  }

  console.log(`Total updated: ${done}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
