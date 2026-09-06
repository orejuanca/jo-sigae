// ==================== TEST v10: MÓDULO RF (RESUMEN FINAL EMG) ====================
// Valida el módulo contra los casos REALES del Excel del plantel.
// Uso: con el servidor corriendo (pnpm dev), ejecutar:  node scripts/test_rf_v10.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let ok = 0, fallos = 0;
function check(nombre, cond, detalle = '') {
  if (cond) { ok++; console.log(`  OK  ${nombre}`); }
  else { fallos++; console.log(`  FALLO ${nombre} ${detalle}`); }
}
async function get(grado, sec, tipo, mes) {
  const qs = new URLSearchParams({ grado, sec, tipo, mes });
  const r = await fetch(`${BASE}/api/control-estudios/rf?${qs}`);
  return { status: r.status, d: await r.json() };
}

console.log('TEST v10 — RF RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL');

// ---- 1) 1°A FINAL JULIO-2022: 20 con cédula + 4 S/C (los mismos del Excel) ----
{
  const { status, d } = await get('1', 'A', 'FINAL', 'JULIO - 2022');
  check('1A: HTTP 200', status === 200);
  check('1A: nPorSeccion=24', d.nPorSeccion === 24, `=${d.nPorSeccion}`);
  check('1A: 20 con cédula', d.conCedula.length === 20, `=${d.conCedula.length}`);
  check('1A: 4 S/C', d.sinCedula.length === 4, `=${d.sinCedula.length}`);
  const sc = d.sinCedula.map(x => x.apellidos).join(',');
  check('1A: S/C exactos (BLANCO AZUAJE, ECHEVERRIA MONTES, BRITO BARRIOS, LANDAETA TURIPE)',
    sc === 'BLANCO AZUAJE,ECHEVERRIA MONTES,BRITO BARRIOS,LANDAETA TURIPE', sc);
  check('1A: fila 1 = V 32787155 OSPINO BLANQUICET', d.conCedula[0].cedula === 'V 32787155');
  check('1A: 9 áreas', d.areas.length === 9 && d.areas[7].codigo === 'OC' && d.areas[8].codigo === 'PGCRP');
}

// ---- 2) 5°D FINAL JULIO-2022: 36 (35 hoja 1 + 1 hoja 2), PIES idénticos al Excel ----
{
  const { status, d } = await get('5', 'D', 'FINAL', 'JULIO - 2022');
  check('5D: HTTP 200', status === 200);
  check('5D: nPorSeccion=36', d.nPorSeccion === 36, `=${d.nPorSeccion}`);
  check('5D: 12 áreas', d.areas.length === 12);
  check('5D: fila 1 = NELCHA HEREDIA (V 29594614)', d.conCedula[0].cedula === 'V 29594614');
  check('5D: fila 35 = V 32897699 CASTRO FLORES', d.conCedula[34].cedula === 'V 32897699');
  check('5D: fila 36 = PEREIRA PADRINO (va a la hoja 2)', d.conCedula[35].apellidos === 'PEREIRA PADRINO');
  const nel = d.conCedula.filter(x => x.apellidos === 'NELCHA HEREDIA');
  check('5D: 2 NELCHA con P en CA y MA', nel.length === 2 && nel.every(x => x.notas.CA === 'P' && x.notas.MA === 'P'));
  const per = d.conCedula.find(x => x.apellidos === 'PEREZ PEREZ');
  check('5D: PEREZ PEREZ con NC en CA', per && per.notas.CA === 'NC');

  // pie de totales: valores cacheados del Excel RF 5° (página de 35)
  const areaCod = d.areas.map(a => a.codigo);
  const page1 = d.conCedula.slice(0, 35);
  const num = v => typeof v === 'number' ? v : (v !== '' && isFinite(Number(v)) ? Number(v) : null);
  const st = areaCod.map(c => {
    const letras = ['OC', 'PGCRP'].includes(c);
    const vs = page1.map(f => f.notas[c] ?? '').filter(v => v !== '');
    if (letras) {
      return {
        insc: vs.filter(v => ['A', 'B', 'C', 'D', 'P'].includes(String(v))).length,
        ina: vs.filter(v => v === 'IN').length,
        ap: vs.filter(v => ['A', 'B', 'C', 'D'].includes(String(v))).length,
        na: vs.filter(v => v === 'P').length,
        nc: vs.filter(v => v === 'NC').length,
      };
    }
    const nums = vs.map(num).filter(n => n !== null);
    return {
      insc: nums.length + vs.filter(v => v === 'IN' || v === 'P').length,
      ina: vs.filter(v => v === 'IN').length,
      ap: nums.filter(n => n >= 9.5).length,
      na: nums.filter(n => n <= 9.49).length + vs.filter(v => v === 'P').length,
      nc: vs.filter(v => v === 'NC').length,
    };
  });
  const EXCEL = {
    insc: [34, 35, 35, 35, 35, 35, 35, 35, 35, 35, 33, 0],
    ina: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ap: [27, 29, 29, 29, 30, 28, 30, 27, 25, 25, 33, 0],
    na: [7, 6, 6, 6, 5, 7, 5, 8, 10, 10, 0, 0],
    nc: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const iguales = areaCod.every((_, i) =>
    st[i].insc === EXCEL.insc[i] && st[i].ina === EXCEL.ina[i] && st[i].ap === EXCEL.ap[i] &&
    st[i].na === EXCEL.na[i] && st[i].nc === EXCEL.nc[i]);
  check('5D: pie de totales idéntico al Excel (5 filas x 12 áreas)', iguales,
    JSON.stringify(st));
}

// ---- 3) 4° U(MP) PENDIENTE JUNIO-2022: 7 alumnos, notas del 4M (IN) ----
{
  const { status, d } = await get('4', 'U(MP)', 'PENDIENTE', 'JUNIO - 2022');
  check('4MP: HTTP 200', status === 200);
  check('4MP: 7 alumnos', d.nPorSeccion === 7, `=${d.nPorSeccion}`);
  check('4MP: se imprime U.', d.secDisplay === 'U.');
  const nel = d.conCedula.filter(x => x.apellidos === 'NELCHA HEREDIA');
  const ile = nel.filter(x => x.notas.ILE === 'IN').length;
  const ma = nel.filter(x => x.notas.MA === 'IN').length;
  check('4MP: NELCHA con IN en ILE (1) y MA (2) — igual al pie del Excel', ile === 1 && ma === 2, `ile=${ile} ma=${ma}`);
  const conNotaJunio = d.conCedula.filter(x => Object.values(x.notas).some(v => v !== ''));
  check('4MP: solo 2 alumnos con nota en 4M JUNIO (las 2 NELCHA)', conNotaJunio.length === 2, `=${conNotaJunio.length}`);
}

// ---- 4) 3°F REVISIÓN JULIO-2022: 9 con cédula (los del RF 3° del Excel) ----
{
  const { status, d } = await get('3', 'F', 'REVISIÓN', 'JULIO - 2022');
  check('3F: HTTP 200', status === 200);
  check('3F: 9 con cédula (los del RF 3° del Excel)', d.conCedula.length === 9, `=${d.conCedula.length}`);
  check('3F: 3 S/C del bloque NR', d.sinCedula.length === 3, `=${d.sinCedula.length}`);
  const alv = d.conCedula.find(x => x.apellidos === 'ALVARADO GOMEZ');
  check('3F: ALVARADO GOMEZ FI=10 y GHC=10', alv && alv.notas.FI === '10' && alv.notas.GHC === '10');
  const ynf = d.conCedula.find(x => x.apellidos === 'YNFANTE MONTOYA');
  check('3F: YNFANTE todo IN', ynf && Object.values(ynf.notas).every(v => v === 'IN' || v === ''));
}

// ---- 5) 4° U(EQV) EQUIVALENCIA: BLANCO COLMENARES con BI=14 ----
{
  const { status, d } = await get('4', 'U(EQV)', 'EQUIVALENCIA', 'JULIO - 2022');
  check('4U: HTTP 200', status === 200);
  check('4U: 1 alumno (BLANCO COLMENARES)', d.nPorSeccion === 1 && d.conCedula[0].apellidos === 'BLANCO COLMENARES');
  check('4U: BI = 14', d.conCedula[0].notas.BI === 14, `=${d.conCedula[0].notas.BI}`);
  check('4U: se imprime U', d.secDisplay === 'U');
}

// ---- 6) Validación de parámetros ----
{
  const malo = await get('5', 'D', 'FINAL', 'ENERO - 2025');
  check('mes fuera de la lista -> 400 MES_INVALIDO', malo.status === 400 && malo.d.error === 'MES_INVALIDO');
}

console.log(`\nRESULTADO: ${ok} OK, ${fallos} FALLOS`);
process.exit(fallos ? 1 : 0);
