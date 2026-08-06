const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require' } }
});

async function main() {
  const students = await prisma.planDerogado.findMany({ select: { id: true, cedula: true, rawData: true } });
  console.log('Total PlanDerogado:', students.length);
  
  let hasKey297 = 0, hasFlat = 0, hasNeither = 0;
  for (const s of students) {
    let raw;
    try { raw = typeof s.rawData === 'string' ? JSON.parse(s.rawData) : s.rawData; } catch { continue; }
    if (raw['297'] && String(raw['297']).trim() && String(raw['297']).trim() !== '*') hasKey297++;
    if (raw['SECCION.4'] && String(raw['SECCION.4']).trim()) hasFlat++;
    if ((!raw['297'] || !String(raw['297']).trim() || String(raw['297']).trim() === '*') && !raw['SECCION.4']) hasNeither++;
  }
  console.log(`Have key '297' with data: ${hasKey297}`);
  console.log(`Have 'SECCION.4' flat: ${hasFlat}`);
  console.log(`Have neither: ${hasNeither}`);
  
  // Show first 3 samples
  let shown = 0;
  for (const s of students) {
    if (shown >= 3) break;
    let raw;
    try { raw = typeof s.rawData === 'string' ? JSON.parse(s.rawData) : s.rawData; } catch { continue; }
    console.log(`\n${s.cedula}: key 297=${JSON.stringify(raw['297'])}, SECCION.4=${JSON.stringify(raw['SECCION.4'])}`);
    shown++;
  }
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
