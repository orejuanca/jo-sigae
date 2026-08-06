const { PrismaClient } = require('@prisma/client');
const { buildDerogadoFlatMap } = require('../src/lib/build-derogado-flatmap');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require' } }
});

async function main() {
  const students = await prisma.planDerogado.findMany({ select: { id: true, cedula: true, rawData: true } });
  console.log('Total:', students.length);

  const BATCH = 30;
  let updated = 0;

  for (let i = 0; i < students.length; i += BATCH) {
    const batch = students.slice(i, i + BATCH);
    await Promise.all(batch.map(async (student) => {
      let raw;
      try { raw = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData || {}); } catch { raw = {}; }

      // buildDerogadoFlatMap convierte claves numéricas a planas y pasa todo por passthrough
      const flat = buildDerogadoFlatMap(raw);

      // Merge: agregar claves planas al rawData existente (sin borrar nada)
      let changed = false;
      for (const [k, v] of Object.entries(flat)) {
        if (v && !(k in raw)) {
          raw[k] = v;
          changed = true;
        }
      }

      if (changed) {
        await prisma.planDerogado.update({
          where: { id: student.id },
          data: { rawData: JSON.stringify(raw) }
        });
        updated++;
      }
    }));
    console.log(`Progress: ${Math.min(i + BATCH, students.length)}/${students.length} (updated: ${updated})`);
  }

  console.log(`\nTotal actualizados: ${updated}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
