/**
 * ACTUALIZACIÓN REAL - Ejecutar solo después de aprobación del DRY-RUN
 * 
 * Cambia en rawData (formato plano) para todos los alumnos BD vigente:
 *   Col 243: "MEMO-" → "ME-"
 *   Col 244: "RANDUM DE FECHA 17/11/2017" → "MORANDUM DE FECHA 17/11/2017"
 * 
 * Solo modifica las columnas 243 y 244, nada más.
 * Procesa en lotes de 50 para seguridad.
 */

const path = require('path');
const { PrismaClient } = require(path.resolve('src/generated/prisma'));
const prisma = new PrismaClient();

const BATCH_SIZE = 50;

async function main() {
  console.log('=== ACTUALIZACION REAL ===\n');
  console.log('Iniciando a las:', new Date().toISOString());
  console.log('');

  // Obtener todos los IDs de alumnos BD vigente
  const allStudents = await prisma.student.findMany({
    where: { plan: 'vigente' },
    select: { id: true, cedula: true, apellidos: true, nombres: true, rawData: true },
    orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }]
  });

  console.log(`Total alumnos a revisar: ${allStudents.length}\n`);

  let actualizados = 0;
  let errores = 0;
  let sinCambios = 0;

  for (let i = 0; i < allStudents.length; i += BATCH_SIZE) {
    const batch = allStudents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allStudents.length / BATCH_SIZE);
    console.log(`Procesando lote ${batchNum}/${totalBatches} (${batch.length} alumnos)...`);

    for (const student of batch) {
      try {
        const rawData = JSON.parse(student.rawData);
        
        const col243 = rawData['243'];
        const col244 = rawData['244'];
        
        let cambio243 = false;
        let cambio244 = false;

        // Solo modificar si contiene los patrones esperados
        if (typeof col243 === 'string' && col243.includes('MEMO-')) {
          rawData['243'] = col243.replace(/MEMO-/g, 'ME-');
          cambio243 = true;
        }

        if (typeof col244 === 'string' && col244.includes('RANDUM DE FECHA 17/11/2017')) {
          rawData['244'] = col244.replace('RANDUM DE FECHA 17/11/2017', 'MORANDUM DE FECHA 17/11/2017');
          cambio244 = true;
        }

        if (cambio243 || cambio244) {
          await prisma.student.update({
            where: { id: student.id },
            data: { rawData: JSON.stringify(rawData) }
          });
          actualizados++;
          console.log(`  ✅ ${student.cedula} (${student.apellidos}, ${student.nombres}) — col243:${cambio243 ? 'S' : '-'} col244:${cambio244 ? 'S' : '-'}`);
        } else {
          sinCambios++;
        }
      } catch (e) {
        errores++;
        console.log(`  ❌ ${student.cedula}: ${e.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(55));
  console.log('RESULTADO FINAL');
  console.log('='.repeat(55));
  console.log(`Total revisados:       ${allStudents.length}`);
  console.log(`Actualizados:          ${actualizados}`);
  console.log(`Sin cambios:           ${sinCambios}`);
  console.log(`Errores:               ${errores}`);
  console.log('');
  console.log('Finalizado a las:', new Date().toISOString());

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('ERROR FATAL:', e);
  process.exit(1);
});