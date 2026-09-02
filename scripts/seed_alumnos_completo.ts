/**
 * seed_alumnos_completo.ts — BLOQUE 1: sabana de alumnos INTEGRA
 *   1. Upsert de TODOS los alumnos del Excel (1,603: 857 del año 2021-2022 + 746 históricos)
 *      con todos los campos de la sábana (representante, dirección, cédula escolar, etc.)
 *   2. Para los alumnos del año: actualiza su inscripción regular con los datos del año
 *      (numeroLista, condicion, sp, ingEgr, obsBoletin). Los históricos NO se inscriben.
 * Idempotente. Uso: npx tsx scripts/seed_alumnos_completo.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const D = join(__dirname, 'data_legacy');

const norm = (c: string) => c.trim().toUpperCase().replace(/^([VEJ])\s*/, '$1 ');
const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

interface Sabana {
  cedula: string; grado: string | null; seccion: string | null;
  apellidos: string | null; nombres: string | null; sexo: string | null; fechaNac: string | null;
  ef: string | null; municipio: string | null; estado: string | null; pais: string | null;
  localidad: string | null; direccion: string | null; telefono: string | null; correo: string | null;
  serial: string | null; te: string | null; obsHr: string | null; cedulaEscolar: string | null;
  repCedula: string | null; repNombre: string | null; repApellido: string | null; repAfinidad: string | null;
  plantelProc1: string | null; plantelProc2: string | null; plantelProc3: string | null;
  plantelProc4: string | null; plantelProc5: string | null;
  obsGenerales: string | null; eqv: string | null;
  numero: string | null; condicion: string | null; sp: string | null;
  mp1: string | null; mp2: string | null; ingEgr: string | null; obsBoletin: string | null;
}

async function main() {
  const doc = JSON.parse(readFileSync(join(D, 'alumnos_completo.json'), 'utf8'));
  const sab: Sabana[] = doc.alumnos;
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) throw new Error('No hay año escolar activo');

  let anio = 0, historicosNuevos = 0, errores = 0;
  let inscActualizadas = 0, inscFaltantes = 0, colisiones = 0;

  for (const s of sab) {
    const ced = norm(s.cedula);
    if (!ced) { errores++; continue; }
    const dataAlumno = {
      apellidos: txt(s.apellidos) ?? '', nombres: txt(s.nombres) ?? '',
      sexo: txt(s.sexo), fechaNac: txt(s.fechaNac),
      entidad: txt(s.municipio), ef: txt(s.ef), estado: txt(s.estado), pais: txt(s.pais),
      localidad: txt(s.localidad), direccion: txt(s.direccion),
      telefono: txt(s.telefono), correo: txt(s.correo),
      serial: txt(s.serial), te: txt(s.te), obsHr: txt(s.obsHr),
      cedulaEscolar: txt(s.cedulaEscolar),
      repCedula: txt(s.repCedula), repNombre: txt(s.repNombre),
      repApellido: txt(s.repApellido), repAfinidad: txt(s.repAfinidad),
      plantelProc1: txt(s.plantelProc1), plantelProc2: txt(s.plantelProc2),
      plantelProc3: txt(s.plantelProc3), plantelProc4: txt(s.plantelProc4),
      plantelProc5: txt(s.plantelProc5),
      obsGenerales: txt(s.obsGenerales), eqv: txt(s.eqv),
    };
    const alumno = await prisma.alumno.upsert({
      where: { cedula: ced },
      update: dataAlumno,
      create: { cedula: ced, ...dataAlumno },
    });
    if (s.grado) anio++; else historicosNuevos++;

    // Datos del año -> inscripción regular del año activo
    if (s.grado && s.seccion) {
      const insc = await prisma.inscripcion.findFirst({
        where: {
          alumnoId: alumno.id, anoEscolarId: ano.id,
          seccion: { grado: s.grado, codigo: s.seccion },
        },
      });
      const dataAno = {
        numeroLista: txt(s.numero), condicion: txt(s.condicion), sp: txt(s.sp),
        ingEgr: txt(s.ingEgr), obsBoletin: txt(s.obsBoletin),
      };
      if (insc) {
        await prisma.inscripcion.update({ where: { id: insc.id }, data: dataAno });
        inscActualizadas++;
      } else {
        inscFaltantes++;
        console.log(`  !! sin inscripción: ${ced} ${s.grado}°${s.seccion}`);
      }
    }
  }

  const totAlumnos = await prisma.alumno.count();
  console.log(`\nRESUMEN:`);
  console.log(`  alumnos del año: ${anio} (insc ok: ${inscActualizadas}, sin insc: ${inscFaltantes})`);
  console.log(`  históricos nuevos: ${historicosNuevos}`);
  console.log(`  errores: ${errores}`);
  console.log(`  TOTAL alumnos en BD: ${totAlumnos}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
