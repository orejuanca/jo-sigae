// TEST v9 — asteriscos previos MP (ley del usuario) + sección U (régimen de equivalencia) + validaciones
// Correr con el dev server arriba: node scripts/test_v9.mjs
const BASE = 'http://localhost:3000/api/control-estudios';
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } }

async function GET(path) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, d: await r.json() };
}
async function PUT(body) {
  const r = await fetch(`${BASE}/notas`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, d: await r.json() };
}

console.log('=== 1) SECCIÓN U: régimen de equivalencia (BLANCO COLMENARES) ===');
const u = await GET('/notas?grado=4&seccion=U');
ok(u.status === 200, 'GET 4°U 200');
ok(u.d.tipo === 'U', "tipo 'U'");
ok(u.d.estudiantes.length === 1, '1 presentación (BLANCO)');
const bl = u.d.estudiantes[0];
ok(bl.cedula.includes('31651259'), 'BLANCO V 31651259');
const pendBl = u.d.pendientes[bl.inscripcionId] || [];
ok(pendBl.length === 1, 'una sola materia pendiente (BI)');
const bi = u.d.materias.find(m => m.codigo === 'BI');
ok(!!bi && pendBl.includes(bi.id), 'pendiente = BI');
ok(u.d.materias.length === 11, '11 materias del grado 4 (orden Excel)');
ok(u.d.materias.map(m => m.codigo).join(',') === 'CA,ILE,MA,EF,FI,QU,BI,GHC,FSN,OC,PGCRP', 'orden EXCEL de 4°');
const notasBI = [1, 2, 3].map(l => u.d.notas[`${bl.inscripcionId}|${bi.id}|${l}`]);
ok(notasBI.join(',') === '14,14,14', `BI lapsos = ${notasBI.join(',')} (esperado 14,14,14)`);
ok(u.d.grupo === undefined, 'payload U sin GRUPO');

console.log('=== 2) U acepta lapsos (edición y restauración) ===');
let r = await PUT({ inscripcionId: bl.inscripcionId, asignaturaId: bi.id, lapso: 1, valor: '15' });
ok(r.status === 200 && r.d.valor === '15', 'BI L1=15 guardado');
r = await PUT({ inscripcionId: bl.inscripcionId, asignaturaId: bi.id, lapso: 1, valor: '14' });
ok(r.status === 200 && r.d.valor === '14', 'restaurado L1=14');
r = await PUT({ inscripcionId: bl.inscripcionId, asignaturaId: bi.id, lapso: 1, valor: '*' });
ok(r.status === 400, 'asterisco NO válido en lapsos (solo MP)');

console.log('=== 3) MP 2°: secuencias verbatim con * previos ===');
const mp2 = await GET('/notas?grado=2&seccion=MP');
ok(mp2.status === 200 && mp2.d.tipo === 'MP', 'GET 2°MP tipo MP');
ok(mp2.d.estudiantes.length === 4, '4 estudiantes en 2°MP (BLANCO no está)');
const veitia = mp2.d.estudiantes.find(e => e.cedula.includes('32045834'));
ok(!!veitia, 'VEITIA NOGUERA presente');
const ile = mp2.d.materias.find(m => m.codigo === 'ILE');
const cn = mp2.d.materias.find(m => m.codigo === 'CN');
ok(mp2.d.momentos[`${veitia.inscripcionId}|${ile.id}|1`] === '*', 'VEITIA ILE M1=*');
ok(mp2.d.momentos[`${veitia.inscripcionId}|${ile.id}|2`] === '*', 'VEITIA ILE M2=*');
ok(mp2.d.momentos[`${veitia.inscripcionId}|${ile.id}|3`] === '10', 'VEITIA ILE M3=10');
ok(mp2.d.momentos[`${veitia.inscripcionId}|${cn.id}|1`] === '*' && mp2.d.momentos[`${veitia.inscripcionId}|${cn.id}|2`] === '*', 'VEITIA CN M1/M2=*');
const pthomas = mp2.d.estudiantes.find(e => e.cedula.includes('31699269'));
const ca = mp2.d.materias.find(m => m.codigo === 'CA');
ok(mp2.d.momentos[`${pthomas.inscripcionId}|${ca.id}|4`] === '10', 'PEREZ THOMAS CA M4=10 (con M1-M3=*)');

console.log('=== 4) Ley *: secuencia, rechazos y restauración (VEITIA CN) ===');
// vaciar M3=10
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 3, valor: null });
ok(r.status === 200, 'vaciar M3 (posteriores vacíos) OK');
// * en M3 sin posteriores: permitido (nunca se presentó)
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 3, valor: '*' });
ok(r.status === 200 && r.d.valor === '*', 'M3=* aceptado (sin posteriores)');
// nota en M4: secuencia completa -> ok, luego rechazo de * en M3 con M4 lleno
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 4, valor: '10' });
ok(r.status === 200, 'M4=10 con M1-M3 asentados OK');
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 3, valor: '*' });
ok(r.status === 400 && r.d.error === 'EL_ASTERSICO_VA_EN_LOS_MOMENTOS_ANTERIORES', '* con momento posterior lleno RECHAZADO');
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 4, valor: '7' });
ok(r.status === 400 && /NOTA_MP_INVALIDA/.test(r.d.error), 'nota <10 rechazada (entero 10-20, IN o *)');
// no se puede saltar momentos: vaciar M2 con M3 lleno -> VACIE_PRIMERO (restauramos M3 primero)
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 4, valor: null });
ok(r.status === 200, 'vaciar M4=10');
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 3, valor: null });
ok(r.status === 200, 'vaciar M3=*');
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 2, valor: null });
ok(r.status === 200, 'vaciar M2=*');
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 3, valor: '10' });
ok(r.status === 400 && r.d.error === 'ASENTE_PRIMERO_LOS_MOMENTOS_ANTERIORES', 'salto de secuencia rechazado (M2 vacío)');
// restauración verbatim: M2=*, M3=10
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 2, valor: '*' });
ok(r.status === 200, 'restaurado M2=*');
r = await PUT({ inscripcionId: veitia.inscripcionId, asignaturaId: cn.id, momento: 3, valor: '10' });
ok(r.status === 200 && r.d.valor === '10', 'restaurado M3=10');
const mp2b = await GET('/notas?grado=2&seccion=MP');
ok(mp2b.d.momentos[`${veitia.inscripcionId}|${cn.id}|3`] === '10', 'estado original restaurado (*|*|10|·)');

console.log('=== 5) Invariante general ===');
const nl = await GET('/../../api/health').catch(() => null); // no existe; placeholder
const mp4 = await GET('/notas?grado=4&seccion=MP');
ok(mp4.status === 200 && mp4.d.estudiantes.length === 7, '4°MP con 7 alumnos (BLANCO fuera)');
const secciones4 = await GET('/notas?grado=4');
ok(secciones4.d.secciones.some(s => s.codigo === 'U' && s.tipo === 'U'), 'sección 4°U con tipo U en el selector');

console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
