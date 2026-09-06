import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ==================== BLOQUE 2: NOTAS DE REVISIÓN (hojas NR) ====================
// Las hojas "NR 1°".."NR 5°" del Excel son el RESUMEN FINAL DE REVISIÓN: traen SOLO
// los estudiantes que NO aprobaron todas las materias (mismo criterio en definitiva
// o final: aprueba con 10 o más; P y las materias sin definitiva no llevan revisión).
// Por celda el Excel trae: "IN" (insuficiente, sigue aplazado) o un ENTERO (resultado
// tras la revisión). Lo aprobado se muestra con "*" derivado.
// Reglas de la escuela (no negociables):
// - REVISIÓN solo en asignaturas NUMÉRICAS de secciones REGULARES: OC, PGCRP y GRUPO
//   no llevan revisión (en el Excel NR siempre están con "*", verificado en 5 grados).
// - La revisión se escribe en la materia reprobada; si la definitiva es >= 10 y no
//   hay un valor previo del Excel, el API rechaza (APROBADA_SIN_REVISION).
// - NOTAS ENTERAS: el resultado se redondea al entero, igual que todo el módulo.
// - ORDEN DE LISTADOS: cédula de menor a mayor (regla del usuario).

// Orden EXACTO de las materias en las sábanas del Excel (igual que en notas/route.ts)
const ORDEN_EXCEL: Record<string, string[]> = {
  '1': ['CA', 'ILE', 'MA', 'EF', 'AP', 'CN', 'GHC', 'OC', 'PG'],
  '2': ['CA', 'ILE', 'MA', 'EF', 'AP', 'CN', 'GHC', 'OC', 'PG'],
  '3': ['CA', 'ILE', 'MA', 'EF', 'FI', 'QU', 'BI', 'GHC', 'OC', 'PG'],
  '4': ['CA', 'ILE', 'MA', 'EF', 'FI', 'QU', 'BI', 'GHC', 'FS', 'OC', 'PG'],
  '5': ['CA', 'ILE', 'MA', 'EF', 'FI', 'QU', 'BI', 'CT', 'GHC', 'FS', 'OC', 'PG'],
};
const MAP_COD_EXCEL: Record<string, string> = { FS: 'FSN', PG: 'PGCRP' };
const CUALITATIVAS = new Set(['OC', 'PGCRP']); // GRUPO no es asignatura (columna derivada)

function esCualitativa(codigo: string) {
  return CUALITATIVAS.has(codigo);
}

// cédula -> dígitos para orden numérico
function cedNum(cedula: string): number {
  const n = Number((cedula || '').replace(/\D/g, ''));
  return isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

// Definitiva numérica con las reglas del módulo NOTAS (entero):
// los 3 lapsos asentados; un lapso "P" da final P (no va a revisión); "NC" no promedia.
// Devuelve number (entero) | 'P' | '' (sin definitiva utilizable).
function definitivaDe(notas: { lapso: number; valor: string | null }[]): number | 'P' | '' {
  const vs = [1, 2, 3].map(l => notas.find(n => n.lapso === l)?.valor ?? '');
  if (vs.some(v => !v)) return '';
  if (vs.includes('P')) return 'P';
  const nums = vs.map(Number).filter(n => isFinite(n)); // NC u otros textos no promedian
  if (nums.length === 0) return '';
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// GET /api/control-estudios/revision?grado=1..5
// Devuelve, para el grado: las materias en el orden del Excel y, por sección regular,
// SOLO los estudiantes en revisión: los que tienen alguna definitiva numérica < 10
// (criterio de la escuela) o algún valor de revisión ya asentado (el Excel NR puede
// traer celdas en materias aprobadas, ej. URBANO 4°D).
export async function GET(req: NextRequest) {
  try {
    const grado = req.nextUrl.searchParams.get('grado') || '';
    const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
    if (!ano) return NextResponse.json({ error: 'SIN_ANO_ACTIVO' }, { status: 400 });
    if (!ORDEN_EXCEL[grado]) return NextResponse.json({ error: 'FALTA_GRADO' }, { status: 400 });

    // materias del grado en el orden EXACTO del Excel (incluye OC/PGCRP, que se muestran con *)
    const codigos = (ORDEN_EXCEL[grado] || []).map(c => MAP_COD_EXCEL[c] ?? c);
    const asignaturas = await prisma.asignatura.findMany({ where: { codigo: { in: codigos } } });
    const byCod = new Map(asignaturas.map(a => [a.codigo, a]));
    const materias = codigos
      .filter(c => byCod.has(c))
      .map(c => {
        const a = byCod.get(c)!;
        return { id: a.id, codigo: a.codigo, nombre: a.nombre, cualitativa: esCualitativa(a.codigo) };
      });
    const asigById = new Map(materias.map(m => [m.id, m]));

    const secciones = await prisma.seccion.findMany({
      where: { anoEscolarId: ano.id, grado, tipo: 'REGULAR' },
      orderBy: { codigo: 'asc' },
    });

    const resultado: {
      id: string; codigo: string; tipo: string;
      estudiantes: {
        inscripcionId: string; cedula: string; nombre: string; sexo: string; numeroLista: string | null;
        notas: Record<string, string>; revisiones: Record<string, string>; enRevision: string[];
      }[];
    }[] = [];

    for (const sec of secciones) {
      const inscripciones = (await prisma.inscripcion.findMany({
        where: { seccionId: sec.id, activo: true },
        include: { alumno: true },
      })).sort((a, b) => cedNum(a.alumno.cedula) - cedNum(b.alumno.cedula) || a.alumno.cedula.localeCompare(b.alumno.cedula));
      if (!inscripciones.length) continue;

      const ids = inscripciones.map(i => i.id);
      const notas = await prisma.notaLapso.findMany({ where: { inscripcionId: { in: ids } } });
      const revisiones = await prisma.notaRevision.findMany({ where: { inscripcionId: { in: ids } } });

      const notasPorInsc = new Map<string, Map<string, { lapso: number; valor: string | null }[]>>();
      for (const n of notas) {
        if (!notasPorInsc.has(n.inscripcionId)) notasPorInsc.set(n.inscripcionId, new Map());
        const m = notasPorInsc.get(n.inscripcionId)!;
        if (!m.has(n.asignaturaId)) m.set(n.asignaturaId, []);
        m.get(n.asignaturaId)!.push({ lapso: n.lapso, valor: n.valor });
      }
      const revPorInsc = new Map<string, { asignaturaId: string; valor: string }[]>();
      for (const r of revisiones) {
        if (!revPorInsc.has(r.inscripcionId)) revPorInsc.set(r.inscripcionId, []);
        revPorInsc.get(r.inscripcionId)!.push({ asignaturaId: r.asignaturaId, valor: r.valor });
      }

      const estudiantes: typeof resultado[number]['estudiantes'] = [];
      for (const i of inscripciones) {
        const notasMap: Record<string, string> = {};
        const enRevision: string[] = [];
        const porAsig = notasPorInsc.get(i.id) || new Map();
        for (const [aid, arr] of porAsig) {
          for (const n of arr) {
            if (n.valor !== null) notasMap[`${aid}|${n.lapso}`] = n.valor;
          }
          const mat = asigById.get(aid);
          if (!mat || mat.cualitativa) continue;
          const def = definitivaDe(arr);
          if (typeof def === 'number' && def < 10) enRevision.push(aid); // criterio: reprobada
        }
        const revMap: Record<string, string> = {};
        for (const r of revPorInsc.get(i.id) || []) {
          revMap[r.asignaturaId] = r.valor;
          if (!enRevision.includes(r.asignaturaId) && asigById.has(r.asignaturaId)) {
            enRevision.push(r.asignaturaId); // celda del Excel en materia aprobada (URBANO)
          }
        }
        // SOLO estudiantes en revisión: alguna reprobada o alguna celda NR del Excel
        if (!enRevision.length) continue;
        estudiantes.push({
          inscripcionId: i.id, cedula: i.alumno.cedula,
          nombre: `${i.alumno.apellidos}, ${i.alumno.nombres}`,
          sexo: i.alumno.sexo || '', numeroLista: i.numeroLista,
          notas: notasMap, revisiones: revMap, enRevision,
        });
      }

      if (estudiantes.length) {
        resultado.push({ id: sec.id, codigo: sec.codigo, tipo: sec.tipo, estudiantes });
      }
    }

    return NextResponse.json({ ano: ano.nombre, materias, secciones: resultado });
  } catch (e) {
    console.error('GET revision:', e);
    return NextResponse.json({ error: 'ERROR_REVISION_GET', detalle: String(e) }, { status: 500 });
  }
}

// PUT /api/control-estudios/revision
// body: { inscripcionId, asignaturaId, valor: "IN" | entero 1-20 | null (vaciar -> *) }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { inscripcionId, asignaturaId } = body as { inscripcionId?: string; asignaturaId?: string };
    const rawValor = body.valor === null || body.valor === undefined ? '' : String(body.valor);

    if (!inscripcionId || !asignaturaId) return NextResponse.json({ error: 'FALTAN_IDS' }, { status: 400 });

    const inscripcion = await prisma.inscripcion.findUnique({ where: { id: inscripcionId }, include: { seccion: true } });
    if (!inscripcion || !inscripcion.activo) return NextResponse.json({ error: 'INSCRIPCION_NO_VALIDA' }, { status: 404 });
    if (inscripcion.seccion.tipo !== 'REGULAR') {
      return NextResponse.json({ error: 'LA_REVISION_ES_SOLO_DE_SECCIONES_REGULARES' }, { status: 400 });
    }

    const asignatura = await prisma.asignatura.findUnique({ where: { id: asignaturaId } });
    if (!asignatura) return NextResponse.json({ error: 'ASIGNATURA_NO_EXISTE' }, { status: 404 });
    if (esCualitativa(asignatura.codigo)) {
      return NextResponse.json({ error: 'LAS_CUALITATIVAS_NO_LLEVAN_REVISION' }, { status: 400 });
    }

    // validar el valor: IN, entero 1-20 (lo decimal se redondea, como todo el módulo) o vacío
    const previo = await prisma.notaRevision.findUnique({
      where: { inscripcionId_asignaturaId: { inscripcionId, asignaturaId } },
    });
    let valor: string | null = null;
    if (rawValor.trim() !== '') {
      const v = rawValor.trim().toUpperCase().replace(',', '.');
      if (v === 'IN') {
        valor = 'IN';
      } else {
        const n = Number(v);
        if (!isFinite(n)) return NextResponse.json({ error: 'VALOR_INVALIDO (entero 1 a 20, IN o vacío)' }, { status: 400 });
        const r = Math.round(n);
        if (r < 1 || r > 20) return NextResponse.json({ error: 'VALOR_INVALIDO (entero 1 a 20, IN o vacío)' }, { status: 400 });
        valor = String(r);
      }
    }

    if (valor === null) {
      // vaciar la celda (vuelve a "*")
      if (previo) await prisma.notaRevision.delete({ where: { id: previo.id } });
      return NextResponse.json({ ok: true, valor: null });
    }

    // MISMO CRITERIO que el Excel: solo se escribe revisión en materias reprobadas
    // (definitiva numérica < 10) o donde ya hay un valor asentado (corrección).
    const notas = await prisma.notaLapso.findMany({ where: { inscripcionId, asignaturaId } });
    const def = definitivaDe(notas);
    const reprobada = typeof def === 'number' && def < 10;
    if (!reprobada && !previo) {
      return NextResponse.json({ error: `APROBADA_SIN_REVISION (definitiva ${def === '' ? 'sin datos' : def})` }, { status: 400 });
    }

    await prisma.notaRevision.upsert({
      where: { inscripcionId_asignaturaId: { inscripcionId, asignaturaId } },
      update: { valor },
      create: { inscripcionId, asignaturaId, valor },
    });
    return NextResponse.json({ ok: true, valor });
  } catch (e) {
    console.error('PUT revision:', e);
    return NextResponse.json({ error: 'ERROR_REVISION_PUT', detalle: String(e) }, { status: 500 });
  }
}
