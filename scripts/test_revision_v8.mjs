// Pruebas API v8 — NOTAS DE REVISIÓN (hojas NR del Excel)
// Criterio: SOLO estudiantes que no aprobaron todas las materias (def<10) o con
// valor NR del Excel; valores IN/entero; cualitativas sin revisión; mismo criterio.
const BASE = 'http://localhost:3000/api/control-estudios/revision';
let ok = 0, fail = 0;
function check(nombre, cond, extra = '') {
  if (cond) { ok++; console.log(`  PASS ${nombre}`); }
  else { fail++; console.log(`  FAIL ${nombre} ${extra}`); }
}
async function get(qs) {
  const r = await fetch(`${BASE}?${qs}`);
  return { st: r.status, d: await r.json() };
}
async function put(body) {
  const r = await fetch(BASE, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { st: r.status, d: await r.json() };
}
const nombre = e => e.nombre;
const buscar = (d, texto) => {
  for (const s of d.secciones) for (const e of s.estudiantes) if (e.nombre.includes(texto)) return { s, e };
  return null;
};

// ==================== CONTEOS POR GRADO ====================
console.log('CONTEOS (28/33/35/36/22 = 154 con GOMEZ por criterio):');
const esperado = { 1: 28, 2: 33, 3: 35, 4: 36, 5: 22 };
const grados = {};
for (const g of [1, 2, 3, 4, 5]) {
  const r = await get(`grado=${g}`);
  check(`GET grado=${g} ok`, r.st === 200 && !!r.d.materias);
  grados[g] = r.d;
  const tot = r.d.secciones.reduce((t, s) => t + s.estudiantes.length, 0);
  check(`grado ${g}°: ${tot} estudiantes (esperado ${esperado[g]})`, tot === esperado[g], `obtuvo ${tot}`);
}

// ==================== ORDEN DE MATERIAS ====================
console.log('ORDEN EXACTO DEL EXCEL:');
check('1° materias', grados[1].materias.map(m => m.codigo).join(',') === 'CA,ILE,MA,EF,AP,CN,GHC,OC,PGCRP', grados[1].materias.map(m => m.codigo).join(','));
check('3° materias', grados[3].materias.map(m => m.codigo).join(',') === 'CA,ILE,MA,EF,FI,QU,BI,GHC,OC,PGCRP');
check('4° materias', grados[4].materias.map(m => m.codigo).join(',') === 'CA,ILE,MA,EF,FI,QU,BI,GHC,FSN,OC,PGCRP');
check('5° materias', grados[5].materias.map(m => m.codigo).join(',') === 'CA,ILE,MA,EF,FI,QU,BI,CT,GHC,FSN,OC,PGCRP');

// ==================== CASOS VERBATIM DEL EXCEL ====================
console.log('CASOS DEL EXCEL:');
const d1 = grados[1];
const ospino = buscar(d1, 'OSPINO BLANQUICET');
check('OSPINO 1A: 7 materias IN', ospino && Object.values(ospino.e.revisiones).filter(v => v === 'IN').length === 7, JSON.stringify(ospino?.e.revisiones));
const mendez = buscar(d1, 'MENDEZ CONTRERAS');
check('MENDEZ 1A: ILE=10 (recuperó en revisión)', mendez && Object.values(mendez.e.revisiones).includes('10'));
const luzardo = buscar(d1, 'LUZARDO CAMACHO');
check('LUZARDO 1B: solo ILE/AP/GHC (NC no lleva revisión)', luzardo && Object.keys(luzardo.e.revisiones).length === 3 && Object.values(luzardo.e.revisiones).every(v => v === 'IN'), JSON.stringify(luzardo?.e.revisiones));

const d4 = grados[4];
const nelcha = buscar(d4, 'NELCHA HEREDIA, CHANTAL');
const nelVals = nelcha ? Object.values(nelcha.e.revisiones) : [];
check('NELCHA 4B: recuperó todo (13,10,10,10,10,10,10)',
  nelVals.length === 7 && nelVals[0] === '13' && nelVals.slice(1).every(v => v === '10'), JSON.stringify(nelVals));
const urbano = buscar(d4, 'URBANO SANTA');
check('URBANO 4D: 3 celdas del Excel con 10 aunque aprobó todo (verbatim)', urbano && Object.values(urbano.e.revisiones).filter(v => v === '10').length === 3);
const gomez = buscar(d4, 'GOMEZ CARBALLO');
check('GOMEZ 4D: incluido por criterio SIN valores (celdas vacías)', gomez && Object.keys(gomez.e.revisiones).length === 0 && gomez.e.enRevision.length === 3);

// valores posibles del Excel: solo IN o enteros
let valoresNR = new Set();
for (const g of [1, 2, 3, 4, 5]) for (const s of grados[g].secciones) for (const e of s.estudiantes) for (const v of Object.values(e.revisiones)) valoresNR.add(v);
const todosValidos = [...valoresNR].every(v => v === 'IN' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 20));
check('todos los valores NR son IN o enteros 1-20', todosValidos, [...valoresNR].join(' '));
check('sin decimales en ninguna revisión', [...valoresNR].every(v => !/^[0-9]+\.[0-9]+$/.test(v)));

// ==================== PUT: validaciones ====================
console.log('PUT (validaciones):');
const mats1 = Object.fromEntries(d1.materias.map(m => [m.codigo, m.id]));
const mats4 = Object.fromEntries(d4.materias.map(m => [m.codigo, m.id]));

// 1) cualitativas rechazadas
let r = await put({ inscripcionId: ospino.e.inscripcionId, asignaturaId: mats1['OC'], valor: '10' });
check('OC rechazada (cualitativa no lleva revisión)', r.st === 400 && /CUALITATIVAS/.test(r.d.error), JSON.stringify(r.d));
r = await put({ inscripcionId: ospino.e.inscripcionId, asignaturaId: mats1['PGCRP'], valor: 'IN' });
check('PGCRP rechazada', r.st === 400);

// 2) materia aprobada sin valor previo -> rechazada (mismo criterio)
// MENDEZ CA: lapsos 7,14,16 -> definitiva 12 (aprobada)
r = await put({ inscripcionId: mendez.e.inscripcionId, asignaturaId: mats1['CA'], valor: '12' });
check('materia aprobada (def 12) rechazada sin valor previo', r.st === 400 && /APROBADA_SIN_REVISION/.test(r.d.error), JSON.stringify(r.d));

// 3) valor inválido
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['ILE'], valor: 'XX' });
check('valor XX rechazado', r.st === 400 && /VALOR_INVALIDO/.test(r.d.error));
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['ILE'], valor: '0' });
check('valor 0 rechazado', r.st === 400);
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['ILE'], valor: '21' });
check('valor 21 rechazado', r.st === 400);

// 4) decimal -> redondea al entero (como todo el módulo)
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['QU'], valor: '12.6' });
check('PUT 12.6 -> 13 (redondeo, GOMEZ QU reprobada def 5)', r.st === 200 && r.d.valor === '13', JSON.stringify(r.d));

// 5) IN en materia reprobada sin valor (GOMEZ ILE def 7)
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['ILE'], valor: 'in' });
check('PUT "in" -> IN (GOMEZ ILE)', r.st === 200 && r.d.valor === 'IN');

// 6) vaciar -> vuelve a *
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['ILE'], valor: null });
check('vaciar GOMEZ ILE -> null', r.st === 200 && r.d.valor === null);
r = await put({ inscripcionId: gomez.e.inscripcionId, asignaturaId: mats4['QU'], valor: null });
check('vaciar GOMEZ QU -> null (estado original)', r.st === 200 && r.d.valor === null);

// 7) URBANO: materia aprobada PERO con valor previo del Excel -> se puede corregir
r = await put({ inscripcionId: urbano.e.inscripcionId, asignaturaId: mats4['ILE'], valor: '11' });
check('URBANO ILE 10 -> 11 (corrección con valor previo permitida)', r.st === 200 && r.d.valor === '11');
r = await put({ inscripcionId: urbano.e.inscripcionId, asignaturaId: mats4['ILE'], valor: '10' });
check('URBANO ILE restaurado a 10 (verbatim)', r.st === 200 && r.d.valor === '10');

// 8) inscripción inexistente
r = await put({ inscripcionId: 'no-existe', asignaturaId: mats1['CA'], valor: '10' });
check('inscripción inexistente rechazada', r.st === 404);

// ==================== ESTADO FINAL = ORIGINAL ====================
const g2 = await get('grado=4');
const gomez2 = buscar(g2.d, 'GOMEZ CARBALLO');
check('GOMEZ quedó sin valores (estado original)', gomez2 && Object.keys(gomez2.e.revisiones).length === 0);
const urbano2 = buscar(g2.d, 'URBANO SANTA');
check('URBANO quedó con 10,10,10 (estado original)', urbano2 && Object.values(urbano2.e.revisiones).filter(v => v === '10').length === 3);

console.log(`\nRESULTADO: ${ok} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
