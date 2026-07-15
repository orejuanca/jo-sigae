/**
 * DRY-RUN SCRIPT v2 - NO MODIFICA NADA
 * 
 * Busca en rawData (formato plano) las columnas 243 y 244
 * y reporta qué se cambiaría.
 * 
 * Cambio 1 en col 243: "MEMO-" → "ME-"
 * Cambio 2 en col 244: "RANDUM DE FECHA 17/11/2017" → "MORANDUM DE FECHA 17/11/2017"
 */

const path = require('path');
const { PrismaClient } = require(path.resolve('src/generated/prisma'));
const prisma = new PrismaClient();

async function main() {
  console.log('=== DRY-RUN: Reporte de cambios propuestos ===\n');
  console.log('NO se modificara ningun dato.\n');

  const students = await prisma.student.findMany({
    where: { plan: 'vigente' },
    select: {
      id: true,
      cedula: true,
      apellidos: true,
      nombres: true,
      rawData: true,
    },
    orderBy: [
      { apellidos: 'asc' },
      { nombres: 'asc' }
    ]
  });

  console.log(`Total alumnos BD vigente: ${students.length}\n`);

  let totalCambio1 = 0;
  let totalCambio2 = 0;
  let rawDataInvalido = 0;
  const afectados = [];

  for (const student of students) {
    let rawData;
    try {
      rawData = JSON.parse(student.rawData);
    } catch {
      rawDataInvalido++;
      continue;
    }

    const col243 = rawData['243'];
    const col244 = rawData['244'];

    if (!col243 && !col244) continue;

    let cambio1 = null;
    let cambio2 = null;

    // Cambio 1: col 243 - "MEMO-" → "ME-"
    if (typeof col243 === 'string' && col243.includes('MEMO-')) {
      cambio1 = {
        columna: 243,
        antes: col243,
        despues: col243.replace(/MEMO-/g, 'ME-')
      };
      totalCambio1++;
    }

    // Cambio 2: col 244 - "RANDUM DE FECHA 17/11/2017" → "MORANDUM DE FECHA 17/11/2017"
    if (typeof col244 === 'string' && col244.includes('RANDUM DE FECHA 17/11/2017')) {
      cambio2 = {
        columna: 244,
        antes: col244,
        despues: col244.replace('RANDUM DE FECHA 17/11/2017', 'MORANDUM DE FECHA 17/11/2017')
      };
      totalCambio2++;
    }

    if (cambio1 || cambio2) {
      const nombre = `${student.apellidos}, ${student.nombres}`;
      afectados.push({ cedula: student.cedula, nombre, cambio1, cambio2 });

      console.log(`${student.cedula} — ${nombre}`);
      if (cambio1) {
        console.log(`   COL 243:`);
        console.log(`     ANTES:    "${cambio1.antes}"`);
        console.log(`     DESPUES:  "${cambio1.despues}"`);
      }
      if (cambio2) {
        console.log(`   COL 244:`);
        console.log(`     ANTES:    "${cambio2.antes}"`);
        console.log(`     DESPUES:  "${cambio2.despues}"`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(55));
  console.log('RESUMEN');
  console.log('='.repeat(55));
  console.log(`Total alumnos BD vigente:         ${students.length}`);
  console.log(`rawData invalido (no JSON):        ${rawDataInvalido}`);
  console.log(`Alumnos con cambio MEMO->ME:      ${totalCambio1}`);
  console.log(`Alumnos con cambio RANDUM->MORAN: ${totalCambio2}`);
  console.log(`Alumnos afectados (al menos 1):   ${afectados.length}`);
  console.log('');
  console.log('DRY-RUN completado. No se modifico nada.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});