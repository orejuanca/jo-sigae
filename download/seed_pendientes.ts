/**
 * seed_pendientes.ts — completa los datos de Materia Pendiente del año activo:
 *   1. Crea las secciones U (REGULAR) de todos los grados (la matriz del Excel tiene fila U por grado).
 *   2. Crea las secciones MP de 1° a 5° si faltan (en el Excel la fila MP de la matriz
 *      SECCIONES trae docentes de 1° a 4° y puro "*" en 5°).
 *   3. Inscribe los 25 alumnos con materias pendientes (columnas MP1/MP2 de la hoja ALUMNOS)
 *      en la MP del AÑO INMEDIATAMENTE ANTERIOR al que cursan (alumno de 2° -> MP de 1°,
 *      de 3° -> MP de 2°, etc.), guardando materiaPend1/materiaPend2.
 *      Verificado contra el Excel: los pendientes aparecen listados en las hojas NL del
 *      grado anterior (NL_1grado filas 485+, NL_2grado, NL_3grado, NL_4grado/RF_4grado).
 *   4. Marca repitiente=true en la inscripción regular de los 19 alumnos CONDICION=REPITE.
 * Idempotente: puede ejecutarse varias veces sin duplicar.
 *
 * Uso: npx tsx scripts/seed_pendientes.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const D = join(__dirname, 'data_legacy');

// Normaliza cédula: "V10814661954" y "V 10814661954" -> "V 10814661954" (mismo criterio que el API de inscripciones)
const norm = (c: string) => c.trim().toUpperCase().replace(/^([VEJ])\s*/, '$1 ');

interface Pend { cedula: string; grado: string; seccion: string; mp1: string; mp2: string; condicion: string; sp: string }
interface Rep { cedula: string; grado: string; seccion: string }

async function main() {
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) throw new Error('No hay año escolar activo');

  // 1) Secciones U (REGULAR) por grado — idempotente
  for (const g of ['1', '2', '3', '4', '5']) {
    await prisma.seccion.upsert({
      where: { anoEscolarId_grado_codigo: { anoEscolarId: ano.id, grado: g, codigo: 'U' } },
      update: {},
      create: { anoEscolarId: ano.id, grado: g, codigo: 'U', tipo: 'REGULAR' },
    });
  }
  console.log('secciones U OK (5 grados)');

  // 2) Secciones MP por AÑO PENDIENTE — idempotente.
  //    LA LEY: la MP corresponde al año inmediatamente ANTERIOR al que cursa el
  //    alumno (2° cursa MP de 1°...). El Excel lo confirma: la fila MP de la
  //    matriz SECCIONES tiene docentes en 1° a 4° y puro "*" en 5° (nadie cursa
  //    MP de 5° porque no hay 6°). Se crean si faltan, nunca se duplican.
  for (const g of ['1', '2', '3', '4', '5']) {
    await prisma.seccion.upsert({
      where: { anoEscolarId_grado_codigo: { anoEscolarId: ano.id, grado: g, codigo: 'MP' } },
      update: {},
      create: { anoEscolarId: ano.id, grado: g, codigo: 'MP', tipo: 'MP' },
    });
  }
  console.log('secciones MP OK (1° a 5°)');

  // 3) Inscripciones en MP de los alumnos con pendientes
  const pends: Pend[] = JSON.parse(readFileSync(join(D, 'materias_pendientes.json'), 'utf8'));
  const secciones = await prisma.seccion.findMany({ where: { anoEscolarId: ano.id } });
  const mpPorGrado = new Map(secciones.filter(s => s.codigo === 'MP').map(s => [s.grado, s]));
  let creadas = 0, actualizadas = 0, movidas = 0, faltantes = 0;

  for (const p of pends) {
    const alumno = await prisma.alumno.findUnique({ where: { cedula: norm(p.cedula) } });
    if (!alumno) { console.log('  !! alumno no encontrado:', p.cedula); faltantes++; continue; }
    // LA MP VA EN EL GRADO INMEDIATAMENTE ANTERIOR: alumno de 2° -> MP de 1°, etc.
    const gradoMp = String(Number(p.grado) - 1);
    const mp = mpPorGrado.get(gradoMp);
    if (!mp) { console.log(`  !! no existe sección MP de ${gradoMp}° (para alumno de ${p.grado}°)`); faltantes++; continue; }
    const existe = await prisma.inscripcion.findUnique({
      where: { alumnoId_seccionId: { alumnoId: alumno.id, seccionId: mp.id } },
    });
    // Si quedó inscrito en una MP equivocada (versión vieja del seed), se MUEVE al grado correcto
    const malUbicadas = await prisma.inscripcion.findMany({
      where: { alumnoId: alumno.id, anoEscolarId: ano.id, activo: true, seccion: { codigo: 'MP', id: { not: mp.id } } },
    });
    if (existe) {
      await prisma.inscripcion.update({
        where: { id: existe.id },
        data: { activo: true, fechaRetiro: null, materiaPend1: p.mp1 || null, materiaPend2: p.mp2 || null },
      });
      actualizadas++;
      for (const mala of malUbicadas) { await prisma.inscripcion.delete({ where: { id: mala.id } }); movidas++; }
    } else if (malUbicadas.length > 0) {
      await prisma.inscripcion.update({
        where: { id: malUbicadas[0].id },
        data: { seccionId: mp.id, materiaPend1: p.mp1 || null, materiaPend2: p.mp2 || null },
      });
      movidas++;
      for (let i = 1; i < malUbicadas.length; i++) await prisma.inscripcion.delete({ where: { id: malUbicadas[i].id } });
    } else {
      const nro = (await prisma.inscripcion.count({ where: { seccionId: mp.id, activo: true } })) + 1;
      await prisma.inscripcion.create({
        data: {
          alumnoId: alumno.id, seccionId: mp.id, anoEscolarId: ano.id,
          matricula: String(nro), materiaPend1: p.mp1 || null, materiaPend2: p.mp2 || null,
        },
      });
      creadas++;
    }
  }
  console.log(`inscripciones MP: ${creadas} creadas, ${actualizadas} actualizadas, ${movidas} movidas al grado correcto, ${faltantes} con problema`);

  // 4) Marcar repitientes en su inscripción regular
  const reps: Rep[] = JSON.parse(readFileSync(join(D, 'repitientes.json'), 'utf8'));
  let marcados = 0;
  for (const r of reps) {
    const alumno = await prisma.alumno.findUnique({ where: { cedula: norm(r.cedula) } });
    if (!alumno) { console.log('  !! repitiente no encontrado:', r.cedula); continue; }
    const res = await prisma.inscripcion.updateMany({
      where: { alumnoId: alumno.id, anoEscolarId: ano.id, seccion: { grado: r.grado, tipo: 'REGULAR' } },
      data: { repitiente: true },
    });
    marcados += res.count;
  }
  console.log(`repitientes marcados: ${marcados}/${reps.length}`);

  // Resumen final
  for (const s of await prisma.seccion.findMany({
    where: { anoEscolarId: ano.id, OR: [{ codigo: 'MP' }, { codigo: 'U' }] },
    orderBy: [{ grado: 'asc' }, { codigo: 'asc' }],
    include: { _count: { select: { inscripciones: { where: { activo: true } } } } },
  })) {
    console.log(`  ${s.grado}° ${s.codigo} (${s.tipo}): ${s._count.inscripciones} alumnos`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
