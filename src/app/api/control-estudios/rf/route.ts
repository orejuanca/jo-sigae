import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  TIPOS_EVAL, MESES_ANIO, SECCIONES_RF, AREAS_POR_GRADO, ANIO_CURSADO,
  PLAN_ESTUDIO, CODIGO_PLAN, INSTITUCION, ANO_ESCOLAR_LEGACY,
  codigoSeccionDe, displaySeccionDe, esCedulaLegal, mesAMomento, observacionRF, OBS_VACIAS,
} from '@/lib/rf-formato';

const prisma = new PrismaClient();

// ==================== RF: RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL ====================
// Consulta por los 5 parámetros (año escolar ACTIVO, tipo de evaluación, mes y año,
// grado, sección) y trae los alumnos correspondientes con sus notas, para plasmarlos
// en el formato EMG. NO agrega ni calcula data nueva: las notas son las del sistema
// (definitivas de regulares, momentos de MP, revisiones del bloque NR), el orden es
// el de la sábana (numeroLista) y la división con cédula legal / SIN CEDULA es la
// regla del Excel (cédula escolar V+11 va en planilla aparte).

type ValorRF = number | string; // promedio (número) | 'P' | 'NC' | 'IN' | letra | ''

// definitiva con la mecánica del Excel: promedio de los 3 lapsos (los textos no
// promedian), P se propaga, sin números => NC (así sale en el RF: PEREZ PEREZ CA)
function definitivaArea(valores: (string | null)[]): ValorRF {
  if (valores.some(v => !v)) return '';
  if (valores.includes('P')) return 'P';
  const nums = valores.map(Number).filter(n => isFinite(n));
  if (nums.length === 0) return 'NC';
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const grado = sp.get('grado') || '';
  const sec = sp.get('sec') || '';
  const tipo = sp.get('tipo') || '';
  const mes = sp.get('mes') || '';

  if (!AREAS_POR_GRADO[grado]) return NextResponse.json({ error: 'GRADO_INVALIDO' }, { status: 400 });
  if (!(SECCIONES_RF as readonly string[]).includes(sec)) return NextResponse.json({ error: 'SECCION_INVALIDA' }, { status: 400 });
  if (!(TIPOS_EVAL as readonly string[]).includes(tipo)) return NextResponse.json({ error: 'TIPO_INVALIDO' }, { status: 400 });
  if (!(MESES_ANIO as readonly string[]).includes(mes)) return NextResponse.json({ error: 'MES_INVALIDO' }, { status: 400 });

  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) return NextResponse.json({ error: 'SIN_ANO_ACTIVO' }, { status: 404 });

  const areas = AREAS_POR_GRADO[grado];
  const codigoSeccion = codigoSeccionDe(sec);
  const seccion = await prisma.seccion.findFirst({
    where: { anoEscolarId: ano.id, grado, codigo: codigoSeccion },
  });

  // VII. Observaciones: las sábanas NL/NR son del año legacy 2021-2022 (único año con data);
  // en otro año escolar el formato muestra "*" (sin observaciones aún)
  const observaciones = ano.nombre === ANO_ESCOLAR_LEGACY
    ? observacionRF(grado, sec, tipo, mes)
    : OBS_VACIAS;

  const vacio = {
    ano: ano.nombre, grado, sec, secDisplay: displaySeccionDe(sec), tipo, mes,
    areas, institucion: INSTITUCION, observaciones,
    curso: { planEstudio: PLAN_ESTUDIO, codigo: CODIGO_PLAN, anioCursado: ANIO_CURSADO[grado], seccion: displaySeccionDe(sec) },
    conCedula: [] as object[], sinCedula: [] as object[], profesores: [] as object[], nPorSeccion: 0,
  };
  if (!seccion) return NextResponse.json({ ...vacio, nota: 'SIN_SECCION' });

  // ---- inscripciones de la sección (orden de la sábana: numeroLista ascendente) ----
  const inscripciones = await prisma.inscripcion.findMany({
    where: { seccionId: seccion.id, activo: true },
    include: { alumno: true },
  });

  const ids = inscripciones.map(i => i.id);

  // REVISIÓN y QUEDADA jalan del bloque NR: mismo criterio del módulo REVISIÓN (v8):
  // van los estudiantes con alguna definitiva numérica < 10 (reprobada) o alguna celda
  // de revisión ya asentada (el Excel NR puede traer celdas en materias aprobadas).
  let filtroIds: Set<string> | null = null;
  if (tipo === 'REVISIÓN' || tipo === 'QUEDADA') {
    const [notas, revs, asignaturasAll] = await Promise.all([
      prisma.notaLapso.findMany({ where: { inscripcionId: { in: ids } } }),
      prisma.notaRevision.findMany({ where: { inscripcionId: { in: ids } }, select: { inscripcionId: true } }),
      prisma.asignatura.findMany(),
    ]);
    const conRev = new Set(revs.map(r => r.inscripcionId));
    const cualitativaDe = new Map(asignaturasAll.map(a => [a.id, a.codigo === 'OC' || a.codigo === 'PGCRP' || a.codigo === 'PG']));
    const porInsc = new Map<string, Map<string, (string | null)[]>>();
    for (const n of notas) {
      if (!porInsc.has(n.inscripcionId)) porInsc.set(n.inscripcionId, new Map());
      const m = porInsc.get(n.inscripcionId)!;
      if (!m.has(n.asignaturaId)) m.set(n.asignaturaId, [null, null, null]);
      m.get(n.asignaturaId)![n.lapso - 1] = n.valor;
    }
    filtroIds = new Set();
    for (const insc of inscripciones) {
      if (conRev.has(insc.id)) { filtroIds.add(insc.id); continue; }
      for (const [aid, vs] of porInsc.get(insc.id) || []) {
        if (cualitativaDe.get(aid)) continue;
        if (vs.some(v => !v)) continue;
        if (vs.includes('P')) continue;
        const nums = vs.map(Number).filter(n => isFinite(n));
        if (nums.length === 0) continue; // NC no lleva revisión
        if (Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) < 10) { filtroIds.add(insc.id); break; }
      }
    }
  }

  const enLista = inscripciones.filter(i => !filtroIds || filtroIds.has(i.id));

  const numeroDe = (nl: string | null): number => {
    const n = Number((nl || '').replace(/[^0-9]/g, ''));
    return isFinite(n) && nl ? n : Number.MAX_SAFE_INTEGER;
  };
  enLista.sort((a, b) => numeroDe(a.numeroLista) - numeroDe(b.numeroLista));

  // ---- notas por área ----
  const esMP = seccion.tipo === 'MP';
  const momento = esMP ? mesAMomento(mes) : null;
  const codigos = areas.map(a => a.codigo);
  const asignaturas = await prisma.asignatura.findMany();
  const asigIdPorCodigo = new Map(asignaturas.map(a => [a.codigo, a.id]));
  const cualitativas = new Set(areas.filter(a => a.letras).map(a => a.codigo));

  type FilaRF = {
    cedula: string; apellidos: string; nombres: string; lugar: string;
    ef: string; sexo: string; dia: string; mesNac: string; anio: string;
    notas: Record<string, ValorRF>; grupo: string;
  };

  const filas: FilaRF[] = [];
  for (const insc of enLista) {
    const a = insc.alumno;
    const notas: Record<string, ValorRF> = {};

    if (esMP) {
      // MATERIA PENDIENTE: la nota del MOMENTO que corresponde al mes y año seleccionado
      // (1M OCTUBRE, 2M DICIEMBRE, 3M ENERO, 4M JUNIO). Sin momento para ese mes => celdas vacías.
      const momentos = await prisma.notaMomento.findMany({
        where: { inscripcionId: insc.id, ...(momento ? { momento } : {}) },
      });
      const valorPorAsig = new Map(momentos.map(m => [m.asignaturaId, m.valor]));
      for (const codigo of codigos) {
        const id = asigIdPorCodigo.get(codigo);
        const v = id ? valorPorAsig.get(id) : null;
        notas[codigo] = v ?? '';
      }
    } else {
      const lapsos = await prisma.notaLapso.findMany({ where: { inscripcionId: insc.id } });
      if (tipo === 'REVISIÓN' || tipo === 'QUEDADA') {
        // bloque NR: IN (insuficiente) o el entero del resultado; sin revisión => vacío
        const revs = await prisma.notaRevision.findMany({ where: { inscripcionId: insc.id } });
        const valorPorAsig = new Map(revs.map(r => [r.asignaturaId, r.valor]));
        for (const codigo of codigos) {
          const id = asigIdPorCodigo.get(codigo);
          const v = id ? valorPorAsig.get(id) : null;
          notas[codigo] = v ?? '';
        }
      } else {
        // FINAL / EQUIVALENCIA / TRANSFERENCIA / NO CURSANTE: definitiva por área
        for (const codigo of codigos) {
          const id = asigIdPorCodigo.get(codigo);
          if (!id) { notas[codigo] = ''; continue; }
          const deAsig = lapsos.filter(l => l.asignaturaId === id).sort((x, y) => x.lapso - y.lapso);
          const valores = [1, 2, 3].map(l => deAsig.find(d => d.lapso === l)?.valor ?? null);
          if (cualitativas.has(codigo)) {
            const limpios = valores.filter(v => v) as string[];
            notas[codigo] = limpios.length === 3 && new Set(limpios).size === 1 ? limpios[0] : '';
          } else {
            notas[codigo] = definitivaArea(valores);
          }
        }
      }
    }

    // GRUPO (columna final del formato): en regulares, valor único de los 3 lapsos
    let grupo = '';
    if (esMP) {
      const g4 = await prisma.notaGrupo.findFirst({ where: { inscripcionId: insc.id, lapso: 4 } });
      grupo = g4?.valor ?? '';
    } else if (!(tipo === 'REVISIÓN' || tipo === 'QUEDADA')) {
      const gs = await prisma.notaGrupo.findMany({ where: { inscripcionId: insc.id, lapso: { in: [1, 2, 3] } } });
      const vs = [1, 2, 3].map(l => gs.find(g => g.lapso === l)?.valor ?? '');
      if (vs.every(v => v) && new Set(vs).size === 1) grupo = vs[0];
    }

    // fecha de nacimiento -> DÍA / MES / AÑO (tres celdas del formato, dd / mm / yyyy)
    const fn = (a.fechaNac || '').slice(0, 10);
    const partes = fn.split('-');
    filas.push({
      cedula: a.cedula,
      apellidos: a.apellidos,
      nombres: a.nombres,
      lugar: a.entidad || '',
      ef: a.ef || '',
      sexo: a.sexo || '',
      dia: partes[2] ? partes[2].padStart(2, '0') : '',
      mesNac: partes[1] ? partes[1].padStart(2, '0') : '',
      anio: partes[0] || '',
      notas,
      grupo,
    });
  }

  // ---- Convención del formato (regla del plantel, verificada en los RF y NR del Excel) ----
  // En el Resumen Final NINGUNA casilla de OC / PGCRP / GRUPO queda en blanco: lo no
  // asentado imprime "*" (aplazada). El pie NO los cuenta (fórmulas oficiales del Excel:
  // Inscritos solo suma A/B/C/D/P; No Aprobados solo P; IN/NC van aparte). Cubre
  // FINAL / MP / REVISIÓN / QUEDADA (los NR originales traen "*" en esas columnas).
  for (const f of filas) {
    for (const codigo of codigos) {
      if (cualitativas.has(codigo) && f.notas[codigo] === '') f.notas[codigo] = '*';
    }
    if (f.grupo === '') f.grupo = '*';
  }

  // ---- separación con cédula legal / SIN CEDULA (planillas aparte, regla del formato) ----
  const conCedula = filas.filter(f => esCedulaLegal(f.cedula));
  const sinCedula = filas.filter(f => !esCedulaLegal(f.cedula));

  // ---- V. Profesores por Áreas (asignación de la sección; área sin inscritos => "*") ----
  const docenteSecc = await prisma.docenteSeccion.findMany({
    where: { seccionId: seccion.id },
    include: { docente: true, asignatura: true },
  });
  const profesores = areas.map(ar => {
    const d = docenteSecc.find(ds => ds.asignatura.codigo === ar.codigo);
    return {
      area: ar.etiquetaV || ar.codigo,
      nombre: d?.docente?.nombre ?? null,
      cedula: d?.docente?.cedula ?? null,
    };
  });

  return NextResponse.json({
    ano: ano.nombre,
    grado,
    sec,
    secDisplay: displaySeccionDe(sec),
    tipo,
    mes,
    areas,
    institucion: INSTITUCION,
    observaciones,
    curso: { planEstudio: PLAN_ESTUDIO, codigo: CODIGO_PLAN, anioCursado: ANIO_CURSADO[grado], seccion: displaySeccionDe(sec) },
    conCedula,
    sinCedula,
    profesores,
    nPorSeccion: filas.length,
  });
}
