import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ==================== BLOQUE 2: NOTAS ====================
// Reglas de la escuela (no negociables):
// - Regulares: SOLO se guardan los 3 lapsos. La definitiva es calculada (nunca se guarda),
//   igual que el Excel: si un lapso vale "P" el final es P; "NC" no cuenta para el promedio.
// - Cualitativas (OC, PGCRP): letras como en el Excel (A/B/C/D y EX=EXONERADO) y también
//   "*" (aplazada): todas las opciones de la lista son válidas; lo asentado se queda tal cual.
// - GRUPO: columna propia del Excel (valor "EXONERADO") y también "*" (aplazada; el usuario
//   decide). En MP la columna GRUPO va con "*" (nadie debe GRUPO como materia pendiente;
//   así está en la sábana del Excel).
// - MP: 4 momentos ÚNICOS E INDEPENDIENTES (1M OCT, 2M DIC, 3M ENE, 4M JUN).
//   La planilla MP se ve como las regulares: UNA FILA POR ESTUDIANTE y todas las
//   materias del grado en el orden del Excel; solo se editan las que debe, el resto "*".
//   Nota >= 10 en cualquier momento = APROBADA (los siguientes se anulan con "*",
//   derivado, nunca guardado). Insuficiente = "IN". Sin definitiva ni promedio.
//   Aplazado en 4M -> queda MP para el próximo año (se aplica en el cierre del año).
// - ORDEN DE LISTADOS: todos los listados van por CÉDULA de menor a mayor (regla del usuario).
// - NOTAS ENTERAS: en el Excel original todas las notas son enteras (la celda muestra
//   el entero aunque por dentro la fórmula cargue decimales). Todo se redondea a entero
//   al guardar/importar, y la definitiva es el promedio redondeado a entero (igual al Excel).

// Orden EXACTO de las materias en las sábanas NL del Excel (verificado en los
// encabezados de NL_1grado..NL_5grado, iguales en todos los bloques A-I y U).
// FS es FSN y PG es PGCRP en el catálogo (como usan los docentes).
const ORDEN_EXCEL: Record<string, string[]> = {
  '1': ['CA', 'ILE', 'MA', 'EF', 'AP', 'CN', 'GHC', 'OC', 'PG'],
  '2': ['CA', 'ILE', 'MA', 'EF', 'AP', 'CN', 'GHC', 'OC', 'PG'],
  '3': ['CA', 'ILE', 'MA', 'EF', 'FI', 'QU', 'BI', 'GHC', 'OC', 'PG'],
  '4': ['CA', 'ILE', 'MA', 'EF', 'FI', 'QU', 'BI', 'GHC', 'FS', 'OC', 'PG'],
  '5': ['CA', 'ILE', 'MA', 'EF', 'FI', 'QU', 'BI', 'CT', 'GHC', 'FS', 'OC', 'PG'],
};
const MAP_COD_EXCEL: Record<string, string> = { FS: 'FSN', PG: 'PGCRP' };

// Ordena una lista de asignaturas según el orden del Excel del grado.
// Las que no estén en la lista (código raro) quedan al final.
function ordenExcel<T extends { codigo: string }>(materias: T[], grado: string): T[] {
  const lista = (ORDEN_EXCEL[grado] || []).map(c => MAP_COD_EXCEL[c] ?? c);
  const idx = new Map(lista.map((c, i) => [c, i]));
  return [...materias].sort((a, b) => (idx.get(a.codigo) ?? 999) - (idx.get(b.codigo) ?? 999));
}

const CUALITATIVAS: Record<string, string[]> = {
  OC: ['A', 'B', 'C', 'D', 'EX', '*'],
  PGCRP: ['A', 'B', 'C', 'D', 'EX', '*'],
};

const MESES_MOMENTO = ['1M OCTUBRE', '2M DICIEMBRE', '3M ENERO', '4M JUNIO'];
const VALORES_GRUPO = ['EXONERADO', '*']; // EXONERADO = valor de la planilla; '*' = aplazada (regla del plantel: si el usuario pone *, se queda *)

function esCualitativa(codigo: string) {
  return codigo in CUALITATIVAS;
}

// cédula -> dígitos (para ordenar numéricamente: "V 32787155" -> 32787155)
function cedNum(cedula: string): number {
  const n = Number((cedula || '').replace(/\D/g, ''));
  return isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}
function ordenarPorCedula<T>(lista: T[], ced: (x: T) => string): T[] {
  return [...lista].sort((a, b) => cedNum(ced(a)) - cedNum(ced(b)) || ced(a).localeCompare(ced(b)));
}

// Valida una nota de lapso: ENTERO 1-20 (así es el Excel), "NC", "P", o letra si cualitativa.
// Si escriben decimales se redondea al entero (la planilla muestra enteros).
function validarNotaLapso(codigo: string, raw: string): { ok: true; valor: string } | { ok: false; error: string } {
  const v = raw.trim().toUpperCase().replace(',', '.');
  if (v === '') return { ok: true, valor: '' };
  if (esCualitativa(codigo)) {
    if (!CUALITATIVAS[codigo].includes(v)) {
      return { ok: false, error: `VALOR_INVALIDO (use ${CUALITATIVAS[codigo].join('/')})` };
    }
    return { ok: true, valor: v };
  }
  if (v === 'NC' || v === 'P') return { ok: true, valor: v }; // no cursante / pendiente (códigos del Excel)
  const n = Number(v);
  if (!isFinite(n)) return { ok: false, error: 'NOTA_INVALIDA (entero 1 a 20, NC o P)' };
  const r = Math.round(n);
  if (r < 1 || r > 20) return { ok: false, error: 'NOTA_INVALIDA (entero 1 a 20, NC o P)' };
  return { ok: true, valor: String(r) };
}

// Valida una nota de momento MP: "*" (venía aplazada, no presentó ese momento aquí),
// "IN" (INASISTENTE: estaba presentando y faltó) o ENTERO >= 10 (aprobación), como el Excel
function validarNotaMomento(raw: string): { ok: true; valor: string } | { ok: false; error: string } {
  const v = raw.trim().toUpperCase().replace(',', '.');
  if (v === '') return { ok: true, valor: '' };
  if (v === 'IN') return { ok: true, valor: 'IN' };
  if (v === '*') return { ok: true, valor: '*' };
  const n = Number(v);
  if (!isFinite(n)) return { ok: false, error: 'NOTA_MP_INVALIDA (entero 10 a 20, IN o *)' };
  const r = Math.round(n);
  if (r < 10 || r > 20) return { ok: false, error: 'NOTA_MP_INVALIDA (entero 10 a 20, IN o *)' };
  return { ok: true, valor: String(r) };
}

// GET /api/control-estudios/notas?grado=1           -> secciones de ese grado
// GET /api/control-estudios/notas?grado=1&seccion=A -> planilla completa (regular o MP)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const grado = sp.get('grado') || '';
    const codigo = sp.get('seccion') || '';
    const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
    if (!ano) return NextResponse.json({ error: 'SIN_ANO_ACTIVO' }, { status: 400 });

    if (!grado) return NextResponse.json({ error: 'FALTA_GRADO' }, { status: 400 });

    // lista de secciones del grado (para el segundo selector)
    if (!codigo) {
      const secciones = await prisma.seccion.findMany({
        where: { anoEscolarId: ano.id, grado },
        orderBy: { codigo: 'asc' },
        select: { id: true, codigo: true, tipo: true },
      });
      return NextResponse.json({ ano: ano.nombre, secciones });
    }

    const seccion = await prisma.seccion.findUnique({
      where: { anoEscolarId_grado_codigo: { anoEscolarId: ano.id, grado, codigo } },
    });
    if (!seccion) return NextResponse.json({ error: 'SECCION_NO_EXISTE' }, { status: 404 });

    const inscripciones = ordenarPorCedula(
      await prisma.inscripcion.findMany({
        where: { seccionId: seccion.id, activo: true },
        include: { alumno: true },
      }),
      i => i.alumno.cedula
    );

    if (seccion.tipo === 'MP') {
      // ===== VISTA MP COMO LAS REGULARES: una fila por alumno, TODAS las materias
      // del grado en el orden del Excel; solo se editan las que el alumno debe,
      // el resto se muestra con "*" (así está en la sábana "Materia Pendiente").
      const codigosGrado = (ORDEN_EXCEL[grado] || []).map(c => MAP_COD_EXCEL[c] ?? c);
      const codigosPend = new Set<string>();
      for (const i of inscripciones) {
        if (i.materiaPend1) codigosPend.add(i.materiaPend1);
        if (i.materiaPend2) codigosPend.add(i.materiaPend2);
      }
      const todas = await prisma.asignatura.findMany({
        where: { codigo: { in: [...new Set([...codigosGrado, ...codigosPend])] } },
      });
      const todasOrden = ordenExcel(todas, grado);
      const asigByCod = new Map(todasOrden.map(a => [a.codigo, a]));
      // materias que se muestran: todas las del grado; pendientes raras fuera de la
      // lista (código que no es del grado) se agregan al final para que se puedan editar
      const materiasMp = [...todasOrden];
      for (const cod of codigosPend) {
        if (!codigosGrado.includes(cod) && asigByCod.has(cod)) {
          materiasMp.push(asigByCod.get(cod)!);
        }
      }
      const estudiantes = inscripciones.map(i => ({
        inscripcionId: i.id, alumnoId: i.alumnoId,
        nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`,
        cedula: i.alumno.cedula, numeroLista: i.numeroLista,
      }));
      // pendientes por inscripción (ids de asignatura, en el orden del Excel)
      const pendientes: Record<string, string[]> = {};
      for (const i of inscripciones) {
        const ids = [i.materiaPend1, i.materiaPend2]
          .filter((c): c is string => !!c && asigByCod.has(c))
          .map(c => asigByCod.get(c)!.id);
        if (ids.length) pendientes[i.id] = ids;
      }
      const momentos = await prisma.notaMomento.findMany({
        where: { inscripcionId: { in: inscripciones.map(i => i.id) } },
      });
      const momentosMap: Record<string, string> = {};
      for (const m of momentos) {
        if (m.valor !== null) momentosMap[`${m.inscripcionId}|${m.asignaturaId}|${m.momento}`] = m.valor;
      }
      return NextResponse.json({
        tipo: 'MP', ano: ano.nombre,
        seccion: { id: seccion.id, grado: seccion.grado, codigo: seccion.codigo },
        etiquetasMomento: MESES_MOMENTO,
        materias: materiasMp.map(a => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, cualitativa: esCualitativa(a.codigo) })),
        estudiantes, pendientes, momentos: momentosMap,
      });
    }

    if (seccion.tipo === 'U') {
      // ===== SECCION U: RÉGIMEN DE EQUIVALENCIA (casos especiales de presentación).
      // El alumno tiene UNA sola matrícula regular (ej: 5°D); la inscripción en la U
      // es su presentación por equivalencia, NO una segunda inscripción. Planilla de
      // LAPSOS como el bloque "Notas de Lapso y Definitivas {g}° U" del Excel: materias
      // del grado en el orden del Excel (la matriz SECCIONES trae puro * en la fila U:
      // sin docentes); solo se editan las materias pendientes (materiaPend1/2), el
      // resto lleva * (así está en la sábana del Excel).
      const codigosGrado = (ORDEN_EXCEL[grado] || []).map(c => MAP_COD_EXCEL[c] ?? c);
      const codigosPend = new Set<string>();
      for (const i of inscripciones) {
        if (i.materiaPend1) codigosPend.add(i.materiaPend1);
        if (i.materiaPend2) codigosPend.add(i.materiaPend2);
      }
      const todas = await prisma.asignatura.findMany({
        where: { codigo: { in: [...new Set([...codigosGrado, ...codigosPend])] } },
      });
      const materiasU = ordenExcel(todas, grado);
      const asigByCodU = new Map(materiasU.map(a => [a.codigo, a]));
      const estudiantesU = inscripciones.map(i => ({
        inscripcionId: i.id, alumnoId: i.alumnoId,
        nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`,
        cedula: i.alumno.cedula, numeroLista: i.numeroLista,
      }));
      const pendientesU: Record<string, string[]> = {};
      for (const i of inscripciones) {
        const ids = [i.materiaPend1, i.materiaPend2]
          .filter((c): c is string => !!c && asigByCodU.has(c))
          .map(c => asigByCodU.get(c)!.id);
        if (ids.length) pendientesU[i.id] = ids;
      }
      const notasU = await prisma.notaLapso.findMany({
        where: { inscripcionId: { in: inscripciones.map(i => i.id) } },
      });
      const notasMapU: Record<string, string> = {};
      for (const n of notasU) {
        if (n.valor !== null) notasMapU[`${n.inscripcionId}|${n.asignaturaId}|${n.lapso}`] = n.valor;
      }
      return NextResponse.json({
        tipo: 'U', ano: ano.nombre,
        seccion: { id: seccion.id, grado: seccion.grado, codigo: seccion.codigo },
        materias: materiasU.map(a => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, cualitativa: esCualitativa(a.codigo) })),
        estudiantes: estudiantesU, pendientes: pendientesU, notas: notasMapU,
      });
    }

    // ===== VISTA REGULAR: alumnos x asignaturas de la sección =====
    const docSec = await prisma.docenteSeccion.findMany({
      where: { seccionId: seccion.id },
      include: { asignatura: true },
    });
    // orden EXACTO de las sábanas del Excel para el grado (GHC va después de BI, etc.)
    const materias = ordenExcel(docSec.map(d => d.asignatura), seccion.grado)
      .map(a => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, cualitativa: esCualitativa(a.codigo) }));

    const notas = await prisma.notaLapso.findMany({
      where: { inscripcionId: { in: inscripciones.map(i => i.id) } },
    });
    const notasMap: Record<string, string> = {};
    for (const n of notas) {
      if (n.valor !== null) notasMap[`${n.inscripcionId}|${n.asignaturaId}|${n.lapso}`] = n.valor;
    }
    // GRUPO por lapso (columna GRUPO del Excel)
    const grupos = await prisma.notaGrupo.findMany({
      where: { inscripcionId: { in: inscripciones.map(i => i.id) }, lapso: { in: [1, 2, 3] } },
    });
    const grupoMap: Record<string, string> = {};
    for (const g of grupos) {
      if (g.valor !== null) grupoMap[`${g.inscripcionId}|${g.lapso}`] = g.valor;
    }
    return NextResponse.json({
      tipo: 'REGULAR', ano: ano.nombre,
      seccion: { id: seccion.id, grado: seccion.grado, codigo: seccion.codigo },
      materias,
      estudiantes: inscripciones.map(i => ({
        inscripcionId: i.id, alumnoId: i.alumnoId,
        nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`,
        cedula: i.alumno.cedula, numeroLista: i.numeroLista,
      })),
      notas: notasMap, grupo: grupoMap,
    });
  } catch (e) {
    console.error('GET notas:', e);
    return NextResponse.json({ error: 'ERROR_NOTAS_GET', detalle: String(e) }, { status: 500 });
  }
}

// PUT /api/control-estudios/notas
// body: { inscripcionId, asignaturaId?, grupo?, lapso? (1-3, o 4 solo GRUPO en MP) | momento? (1-4), valor: string | null }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { inscripcionId } = body as { inscripcionId?: string };
    const esGrupo = body.grupo === true;
    const asignaturaId = esGrupo ? null : (body.asignaturaId as string | undefined);
    const lapso = typeof body.lapso === 'number' ? body.lapso : null;
    const momento = typeof body.momento === 'number' ? body.momento : null;
    const rawValor = body.valor === null || body.valor === undefined ? '' : String(body.valor);

    if (!inscripcionId || (!esGrupo && !asignaturaId)) return NextResponse.json({ error: 'FALTAN_IDS' }, { status: 400 });
    if (esGrupo === false && (lapso === null) === (momento === null)) {
      return NextResponse.json({ error: 'INDICAR_LAPSO_O_MOMENTO' }, { status: 400 });
    }

    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id: inscripcionId }, include: { seccion: true },
    });
    if (!inscripcion || !inscripcion.activo) return NextResponse.json({ error: 'INSCRIPCION_NO_VALIDA' }, { status: 404 });

    // ---------- GRUPO (columna del Excel; MP = valor único en lapso 4) ----------
    if (esGrupo) {
      if (lapso === null) return NextResponse.json({ error: 'LAPSO_INVALIDO' }, { status: 400 });
      const esMp = inscripcion.seccion.tipo === 'MP';
      if (esMp ? lapso !== 4 : (lapso < 1 || lapso > 3)) {
        return NextResponse.json({ error: 'LAPSO_INVALIDO' }, { status: 400 });
      }
      const valor = rawValor.trim().toUpperCase();
      if (valor === '') {
        await prisma.notaGrupo.deleteMany({ where: { inscripcionId, lapso } });
        return NextResponse.json({ ok: true, valor: null });
      }
      if (!VALORES_GRUPO.includes(valor)) {
        return NextResponse.json({ error: `VALOR_GRUPO_INVALIDO (use ${VALORES_GRUPO.join(' o ')})` }, { status: 400 });
      }
      await prisma.notaGrupo.upsert({
        where: { inscripcionId_lapso: { inscripcionId, lapso } },
        update: { valor },
        create: { inscripcionId, lapso, valor },
      });
      return NextResponse.json({ ok: true, valor });
    }

    const asignatura = await prisma.asignatura.findUnique({ where: { id: asignaturaId! } });
    if (!asignatura) return NextResponse.json({ error: 'ASIGNATURA_NO_EXISTE' }, { status: 404 });
    const aid: string = asignaturaId as string;

    // ---------- LAPSO (secciones regulares) ----------
    if (lapso !== null) {
      if (lapso < 1 || lapso > 3) return NextResponse.json({ error: 'LAPSO_INVALIDO' }, { status: 400 });
      if (inscripcion.seccion.tipo === 'MP') {
        return NextResponse.json({ error: 'LOS_MOMENTOS_MP_NO_USAN_LAPSOS' }, { status: 400 });
      }
      const val = validarNotaLapso(asignatura.codigo, rawValor);
      if (!val.ok) return NextResponse.json({ error: val.error }, { status: 400 });
      const clave = { inscripcionId_asignaturaId_lapso: { inscripcionId, asignaturaId: aid, lapso } };
      if (val.valor === '') {
        await prisma.notaLapso.deleteMany({ where: { inscripcionId, asignaturaId: aid, lapso } });
        return NextResponse.json({ ok: true, valor: null });
      }
      await prisma.notaLapso.upsert({
        where: clave,
        update: { valor: val.valor },
        create: { inscripcionId, asignaturaId: aid, lapso, valor: val.valor },
      });
      return NextResponse.json({ ok: true, valor: val.valor });
    }

    // ---------- MOMENTO (secciones MP) ----------
    const m = momento as number;
    if (m < 1 || m > 4) return NextResponse.json({ error: 'MOMENTO_INVALIDO' }, { status: 400 });
    if (inscripcion.seccion.tipo !== 'MP') {
      return NextResponse.json({ error: 'SOLO_SECCIONES_MP' }, { status: 400 });
    }
    const val = validarNotaMomento(rawValor);
    if (!val.ok) return NextResponse.json({ error: val.error }, { status: 400 });

    const previos = await prisma.notaMomento.findMany({
      where: { inscripcionId, asignaturaId: aid, momento: { lt: m } },
      orderBy: { momento: 'asc' },
    });
    const posteriores = await prisma.notaMomento.findMany({
      where: { inscripcionId, asignaturaId: aid, momento: { gt: m } },
    });

    if (val.valor === '') {
      // vaciar: no puede haber momentos posteriores con valor (evita huecos)
      if (posteriores.some(p => p.valor !== null)) {
        return NextResponse.json({ error: 'VACIE_PRIMERO_LOS_MOMENTOS_POSTERIORES' }, { status: 400 });
      }
      await prisma.notaMomento.deleteMany({ where: { inscripcionId, asignaturaId: aid, momento: m } });
      return NextResponse.json({ ok: true, valor: null });
    }

    // "*" = venía aplazada de otro plantel, no presentó ese momento aquí:
    // SOLO va en los momentos ANTERIORES al primero que se asienta con nota/IN.
    // Por eso no puede haber ningún momento posterior con valor.
    if (val.valor === '*' && posteriores.some(p => p.valor !== null)) {
      return NextResponse.json({ error: 'EL_ASTERSICO_VA_EN_LOS_MOMENTOS_ANTERIORES' }, { status: 400 });
    }

    // secuencia: todos los momentos anteriores deben estar asentados (nota, IN o *)
    if (previos.length < m - 1) {
      return NextResponse.json({ error: 'ASENTE_PRIMERO_LOS_MOMENTOS_ANTERIORES' }, { status: 400 });
    }
    // si ya aprobó en un momento anterior, los siguientes quedan anulados (*)
    const aprobadaEn = previos.find(p => p.valor !== null && p.valor !== 'IN' && Number(p.valor) >= 10);
    if (aprobadaEn) {
      return NextResponse.json({ error: `MATERIA_YA_APROBADA_EN_M${aprobadaEn.momento}` }, { status: 400 });
    }

    await prisma.notaMomento.upsert({
      where: { inscripcionId_asignaturaId_momento: { inscripcionId, asignaturaId: aid, momento: m } },
      update: { valor: val.valor },
      create: { inscripcionId, asignaturaId: aid, momento: m, valor: val.valor },
    });
    return NextResponse.json({ ok: true, valor: val.valor });
  } catch (e) {
    console.error('PUT notas:', e);
    return NextResponse.json({ error: 'ERROR_NOTAS_PUT', detalle: String(e) }, { status: 500 });
  }
}
