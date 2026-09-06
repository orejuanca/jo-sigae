// Pruebas API v7: notas ENTERAS (redondeo como el Excel), orden de materias EXACTO
// por grado según las sábanas NL, y MP con la misma estructura que las regulares
// (una fila por estudiante, todas las materias, * en las que no debe).
const BASE = 'http://localhost:3000/api/control-estudios/notas';
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
const cods = d => d.materias.map(m => m.codigo);

// ==================== REGULAR 1°A ====================
const reg = await get('grado=1&seccion=A');
check('GET 1A ok', reg.st === 200 && reg.d.tipo === 'REGULAR');
check('1A: orden materias EXACTO del Excel', cods(reg.d).join(',') === 'CA,ILE,MA,EF,AP,CN,GHC,OC,PGCRP', cods(reg.d).join(','));
const ests = reg.d.estudiantes;
const e0 = ests[0];
const byCod = Object.fromEntries(reg.d.materias.map(m => [m.codigo, m.id]));
const ca = byCod['CA'], oc = byCod['OC'];
const ceds = ests.map(e => Number(e.cedula.replace(/\D/g, '')));
check('orden por cédula asc', ceds.every((v, i) => i === 0 || v >= ceds[i - 1]));

// ---- enteros: todas las notas de lapso importadas son enteras ----
const conDecimal = Object.values(reg.d.notas).filter(v => /^[0-9]+\.[0-9]+$/.test(v));
check('1A sin notas con decimales', conDecimal.length === 0, JSON.stringify(conDecimal.slice(0, 5)));
// OSPINO ILE: el Excel carga 2.5 por dentro -> muestra 3
const ile = byCod['ILE'];
check('OSPINO ILE entero (2.5 -> 3)', !Object.entries(reg.d.notas).some(([k, v]) => k.includes(`|${ile}|`) && /^[0-9]+\.[0-9]+$/.test(v)));

// ---- PUT: redondeo a entero ----
let r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: '12.5' });
check('PUT 12.5 -> 13 (redondeo)', r.st === 200 && r.d.valor === '13');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: '12.4' });
check('PUT 12.4 -> 12 (redondeo)', r.st === 200 && r.d.valor === '12');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: '12,6' });
check('PUT 12,6 -> 13 (coma decimal)', r.st === 200 && r.d.valor === '13');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: 'NC' });
check('PUT NC aceptado', r.st === 200 && r.d.valor === 'NC');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: 'P' });
check('PUT P aceptado', r.st === 200 && r.d.valor === 'P');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: '25' });
check('PUT 25 rechazado', r.st === 400);
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: 'X' });
check('PUT X rechazado', r.st === 400);
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: null });
check('PUT vaciar aceptado', r.st === 200);
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: ca, lapso: 1, valor: '2' });
check('PUT restaurar 2 (valor Excel)', r.st === 200 && r.d.valor === '2');

// ---- OC con EX ----
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: oc, lapso: 1, valor: 'EX' });
check('OC acepta EX', r.st === 200 && r.d.valor === 'EX');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: oc, lapso: 1, valor: 'D' });
check('OC restaurar D (valor Excel)', r.st === 200 && r.d.valor === 'D');
r = await put({ inscripcionId: e0.inscripcionId, asignaturaId: oc, lapso: 1, valor: 'F' });
check('OC rechaza F', r.st === 400);

// ---- GRUPO (regular) ----
const g0 = reg.d.grupo;
r = await put({ inscripcionId: e0.inscripcionId, grupo: true, lapso: 1, valor: 'EXONERADO' });
check('GRUPO EXONERADO aceptado', r.st === 200 && r.d.valor === 'EXONERADO');
r = await put({ inscripcionId: e0.inscripcionId, grupo: true, lapso: 1, valor: 'EX' });
check('GRUPO EX rechazado (solo EXONERADO)', r.st === 400);
r = await put({ inscripcionId: e0.inscripcionId, grupo: true, lapso: 1, valor: g0[`${e0.inscripcionId}|1`] ?? 'EXONERADO' });
check('GRUPO restaurado', r.st === 200);

// ==================== ORDEN 3° y 5° (GHC después de BI; CT/FSN en 5°) ====================
const reg3 = await get('grado=3&seccion=A');
check('3A ok', reg3.st === 200);
check('3A: orden EXACTO (FI QU BI antes de GHC)', cods(reg3.d).join(',') === 'CA,ILE,MA,EF,FI,QU,BI,GHC,OC,PGCRP', cods(reg3.d).join(','));
const reg5 = await get('grado=5&seccion=D');
check('5D ok', reg5.st === 200);
check('5D: orden EXACTO (CT, GHC, FSN, OC, PGCRP)', cods(reg5.d).join(',') === 'CA,ILE,MA,EF,FI,QU,BI,CT,GHC,FSN,OC,PGCRP', cods(reg5.d).join(','));

// ==================== MP 1°: nueva estructura ====================
const mp = await get('grado=1&seccion=MP');
check('GET 1MP ok', mp.st === 200 && mp.d.tipo === 'MP');
check('1MP: 7 estudiantes', mp.d.estudiantes.length === 7, String(mp.d.estudiantes.length));
const totPend = Object.values(mp.d.pendientes).reduce((a, b) => a + b.length, 0);
check('1MP: 8 pendientes en total', totPend === 8, String(totPend));
check('1MP: TODAS las materias del grado (9)', mp.d.materias.length === 9 && cods(mp.d).join(',') === 'CA,ILE,MA,EF,AP,CN,GHC,OC,PGCRP', cods(mp.d).join(','));
check('1MP: etiquetas de momento', mp.d.etiquetasMomento.join('|') === '1M OCTUBRE|2M DICIEMBRE|3M ENERO|4M JUNIO');
const mceds = mp.d.estudiantes.map(e => Number(e.cedula.replace(/\D/g, '')));
check('MP orden por cédula', mceds.every((v, i) => i === 0 || v >= mceds[i - 1]));

const estAbarca = mp.d.estudiantes.find(e => e.nombre.includes('ABARCA'));
const pendAbarca = mp.d.pendientes[estAbarca.inscripcionId] || [];
check('ABARCA: solo 1 pendiente', pendAbarca.length === 1);
const mAbarca4 = mp.d.momentos[`${estAbarca.inscripcionId}|${pendAbarca[0]}|4`];
check('ABARCA MA M4=10 (IN IN IN 10)', mAbarca4 === '10');
const estHern = mp.d.estudiantes.find(e => e.nombre.includes('HERNANDEZ'));
const pendHern = mp.d.pendientes[estHern.inscripcionId] || [];
check('HERNANDEZ AP M1=11', mp.d.momentos[`${estHern.inscripcionId}|${pendHern[0]}|1`] === '11');
const estPerez = mp.d.estudiantes.find(e => e.nombre.includes('PEREZ LACEDES'));
const pendPerez = mp.d.pendientes[estPerez.inscripcionId] || [];
check('PEREZ EF M1=13 y M2..M4 * (sin valor)', mp.d.momentos[`${estPerez.inscripcionId}|${pendPerez.find(id => id === mp.d.materias.find(m => m.codigo === 'EF').id)}|1`] === '13'
  && ![2, 3, 4].some(m => mp.d.momentos[`${estPerez.inscripcionId}|${mp.d.materias.find(x => x.codigo === 'EF').id}|${m}`]));
check('MP: momentos sin decimales', !Object.values(mp.d.momentos).some(v => /^[0-9]+\.[0-9]+$/.test(v)));

// PUT momentos con nueva estructura (pendientes del estudiante)
const matAbarca = pendAbarca[0];
r = await put({ inscripcionId: estAbarca.inscripcionId, asignaturaId: matAbarca, momento: 1, valor: 'IN' });
check('MP: editar IN existente ok', r.st === 200);
r = await put({ inscripcionId: estAbarca.inscripcionId, asignaturaId: matAbarca, momento: 2, valor: '11.5' });
check('MP: M2 11.5 -> 12 (entero)', r.st === 200 && r.d.valor === '12');
r = await put({ inscripcionId: estAbarca.inscripcionId, asignaturaId: matAbarca, momento: 2, valor: 'IN' });
check('MP: restaurar M2=IN (valor Excel)', r.st === 200);
r = await put({ inscripcionId: estAbarca.inscripcionId, asignaturaId: matAbarca, lapso: 1, valor: '10' });
check('PUT lapso en MP rechazado', r.st === 400);

// ==================== 4°MP: BLANCO COLMENARES ====================
const mp4 = await get('grado=4&seccion=MP');
check('4MP ok', mp4.st === 200);
const estBlanco = mp4.d.estudiantes.find(e => e.nombre.includes('BLANCO COLMENARES'));
const pendBlanco = mp4.d.pendientes[estBlanco.inscripcionId] || [];
const bi4 = mp4.d.materias.find(m => m.codigo === 'BI').id;
const mBvals = [1, 2, 3, 4].map(m => mp4.d.momentos[`${estBlanco.inscripcionId}|${bi4}|${m}`]);
check('BLANCO BI M1=M2=M3=M4=14 (verbatim Excel)', mBvals.every(v => v === '14'), JSON.stringify(mBvals));
check('4MP: 11 materias del grado', mp4.d.materias.length === 11, cods(mp4.d).join(','));

// ==================== 5°D: NELCHA P en L3 + GRUPO ====================
const d5 = await get('grado=5&seccion=D');
const fNel = d5.d.estudiantes.find(e => e.nombre.includes('NELCHA HEREDIA, JOELKARLEY'));
const notas5 = d5.d.notas;
const ca5 = d5.d.materias.find(m => m.codigo === 'CA').id;
check('NELCHA CA L3=P', notas5[`${fNel.inscripcionId}|${ca5}|3`] === 'P');
check('NELCHA CA L1=2', notas5[`${fNel.inscripcionId}|${ca5}|1`] === '2');
const g5 = d5.d.grupo ?? {};
check('NELCHA GRUPO L1 EXONERADO', g5[`${fNel.inscripcionId}|1`] === 'EXONERADO');

// ==================== buscador y nómina: orden por cédula ====================
const ra = await fetch('http://localhost:3000/api/control-estudios/alumnos?q=A');
const da = await ra.json();
const cedsA = da.alumnos.map(a => Number(a.cedula.replace(/\D/g, '')));
check('buscador alumnos: orden por cédula', cedsA.every((v, i) => i === 0 || v >= cedsA[i - 1]));

const rs = await get('grado=3');
const sec3a = rs.d.secciones.find(s => s.codigo === 'A');
const rn = await fetch(`http://localhost:3000/api/control-estudios/inscripciones?seccionId=${sec3a.id}`);
const dn = await rn.json();
const cedsN = dn.inscripciones.filter(i => i.activo).map(i => Number(i.cedula.replace(/\D/g, '')));
check('nómina 3°A: orden por cédula', cedsN.every((v, i) => i === 0 || v >= cedsN[i - 1]));
check('nómina 3°A: activos primero', dn.inscripciones.every((x, i) => i === 0 || (!dn.inscripciones[i - 1].activo || x.activo)));

console.log(`\n=== ${ok} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
